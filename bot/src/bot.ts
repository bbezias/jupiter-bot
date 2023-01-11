import ws from "./ws";
import dotenv from "dotenv";
import { TOKEN_LIST_URL } from "@jup-ag/core";

dotenv.config({ path: "./.env" });
import short from "short-uuid";
import { clearInterval } from "timers";
import { Connection, PublicKey, SendTransactionError } from "@solana/web3.js";

import {
	calculateProfit,
	toNumber,
	updateIterationsPerMin,
	checkRoutesResponse, storeItInTempAsJSON, loadConfigFile
} from "./utils";

import cache, { RouteInfoPlus, Token, TradeEntry } from "./cache";
import { setup, getInitialOutAmountWithSlippage } from "./setup";
import { swap, failedSwapHandler, successSwapHandler, SwapError } from "./swap";
import JSBI from "jsbi";
import { RouteInfo } from "@jup-ag/core";
import chalk from "chalk";
import { getSwapResultFromRPCParser, getSwapResultFromRPCParserArbitrage } from "./transaction";
import fs from "fs";
import axios from 'axios';

async function pingpongStrategy(
	jupiter: any,
	tokenA: Token,
	tokenB: Token,
	i: number
) {
	const date = new Date();
	if (!cache.config) throw "Config missing";
	const config = cache.config;

	// calculate & update iterations per minute
	updateIterationsPerMin(cache);

	// Calculate amount that will be used for trade
	const amountToTrade =
		config.tradeSize.strategy === "cumulative"
			? cache.currentBalance[cache.sideBuy ? "tokenA" : "tokenB"]
			: cache.initialBalance[cache.sideBuy ? "tokenA" : "tokenB"];

	const baseAmount = cache.lastBalance[cache.sideBuy ? "tokenB" : "tokenA"];

	// default slippage
	const slippage =
		typeof config.slippage === "number" ? config.slippage : config.minPercProfit * 100;

	// set input / output token
	const inputToken = cache.sideBuy ? tokenA : tokenB;
	const outputToken = cache.sideBuy ? tokenB : tokenA;

	// check current routes
	const performanceOfRouteCompStart = performance.now();
	let routes: { routesInfos: RouteInfo[], cached: boolean };
	try {
		routes = await jupiter.computeRoutes({
			inputMint: new PublicKey(inputToken.address),
			outputMint: new PublicKey(outputToken.address),
			forceFetch: true,
			amount: JSBI.BigInt(amountToTrade),
			slippageBps: slippage,
			asLegacyTransaction: !!config.legacyTransaction
		});

	} catch (e) {
		throw ({ error: e, type: "route" });
	}

	// count available routes
	cache.availableRoutes[cache.sideBuy ? "buy" : "sell"] =
		routes.routesInfos.length;

	// update status as OK
	cache.queue[i] = 0;

	const performanceOfRouteComp =
		performance.now() - performanceOfRouteCompStart;

	// choose first route
	let _route: RouteInfo | undefined = undefined;
	let routeKey = "";
	for (const x of routes.routesInfos) {
		const routeKeys = [];
		for (const y of x.marketInfos) {
			routeKeys.push(y.amm.id + y.outputMint.toBase58());
		}

		routeKey = routeKeys.join("-");
		const now = new Date().getTime();
		const b = cache.bannedRoute.get(routeKey);
		if (!b) {
			_route = x;
			break;
		} else if (now - b < 30000) {
			cache.bannedRoute.delete(routeKey);
			_route = x;
			break;
		}
	}

	if (!_route) return;

	const route: RouteInfoPlus = {
		inAmount: JSBI.toNumber(_route.inAmount),
		outAmount: JSBI.toNumber(_route.outAmount),
		amount: JSBI.toNumber(_route.amount),
		slippageBps: _route.slippageBps,
		marketInfos: _route.marketInfos,
		getDepositAndFee: _route.getDepositAndFee,
		otherAmountThreshold: JSBI.toNumber(_route.otherAmountThreshold),
		priceImpactPct: _route.priceImpactPct,
		swapMode: _route.swapMode,
		route: _route,
		key: routeKey
	};


	// update slippage with "profit or kill" slippage
	if (config.slippage === "profitOrKill") {
		route.otherAmountThreshold =
			cache.lastBalance[cache.sideBuy ? "tokenB" : "tokenA"];
		route.slippageBps = 10000;
	}

	const ammList = [];
	for (const x of _route.marketInfos) {
		ammList.push(x.amm.label);
	}
	const routeStr = ammList.join(" -> ");

	// calculate profitability

	const simulatedProfit = calculateProfit(baseAmount, route.outAmount);

	// store max profit spotted
	if (
		simulatedProfit > cache.maxProfitSpotted[cache.sideBuy ? "buy" : "sell"]
	) {
		cache.maxProfitSpotted[cache.sideBuy ? "buy" : "sell"] = simulatedProfit;
	}

	ws.sendData({
		date: date.getTime(),
		i,
		performanceOfRouteComp,
		inputToken,
		outputToken,
		tokenA,
		tokenB,
		route,
		tradingEnabled: cache.tradingEnabled,
		simulatedProfit,
		availableRoutes: routes.routesInfos.length,
		iterationPerMinute: cache.iterationPerMinute.value,
		queue: Object.keys(cache.queue).length,
		routeStr
	});

	if (
		!cache.swappingRightNow &&
		(cache.hotkeys.e ||
			cache.hotkeys.r ||
			simulatedProfit >= config.minPercProfit)
	) {
		// hotkeys
		if (cache.hotkeys.e) {
			console.log("[E] PRESSED - EXECUTION FORCED BY USER!");
			cache.hotkeys.e = false;
		}
		if (cache.hotkeys.r) {
			console.log("[R] PRESSED - REVERT BACK SWAP!");
			route.otherAmountThreshold = 0;
			cache.hotkeys.r = false;
		}

		console.log(route.inAmount, route.outAmount);

		if (cache.tradingEnabled || cache.hotkeys.r) {
			cache.swappingRightNow = true;
			// store trade to the history
			const tradeEntry: TradeEntry = {
				id: short.generate(),
				status: "processing",
				date: date.getTime(),
				buy: cache.sideBuy,
				inputToken: inputToken.symbol,
				outputToken: outputToken.symbol,
				inAmount: route.inAmount / 10 ** inputToken.decimals,
				expectedOutAmount: route.outAmount / 10 ** outputToken.decimals,
				expectedProfit: simulatedProfit,
				route: routeStr
			};

			// start refreshing status
			const printTxStatus = setInterval(() => {
				if (cache.swappingRightNow) {
					ws.sendData({
						date: date.getTime(),
						i,
						performanceOfRouteComp,
						inputToken,
						outputToken,
						tokenA,
						tokenB,
						route,
						tradingEnabled: cache.tradingEnabled,
						simulatedProfit,
						availableRoutes: routes.routesInfos.length,
						iterationPerMinute: cache.iterationPerMinute.value,
						queue: Object.keys(cache.queue).length,
						routeStr
					});
				}
			}, 500);

			try {
				cache.performanceOfTxStart = performance.now();

				tradeEntry.txId = await swap(jupiter, route);

				tradeEntry.status = "processing";
				ws.sendTrade({ tradeCounter: cache.tradeCounter, trade: tradeEntry });

				const { fee, outAmount } = await getSwapResultFromRPCParser(
					tradeEntry.txId,
					cache.anchorWallet?.publicKey.toBase58() as string,
					tokenA.address,
					tokenB.address,
					cache.connection as Connection
				);
				tradeEntry.fee = fee;
				tradeEntry.outAmount = outAmount;
				tradeEntry.profit = 0;
				tradeEntry.performanceOfTx = cache.performanceOfTxStart;
				tradeEntry.status = "completed";
				console.log(
					"Profit calculation before/after",
					cache.currentBalance[cache.sideBuy ? "tokenB" : "tokenA"], tradeEntry.outAmount);
				tradeEntry.profit = 0;

				successSwapHandler(tradeEntry, tokenA, tokenB, ws).catch((e) =>
					console.log("Error handling success swap", e)
				);

				if (cache.hotkeys.r) {
					console.log("[R] - REVERT BACK SWAP - SUCCESS!");
					cache.tradingEnabled = false;
					console.log("TRADING DISABLED!");
					cache.hotkeys.r = false;
				}

				if (process.env.DEBUG) storeItInTempAsJSON(`success_trade_${tradeEntry.txId}`, tradeEntry);

				ws.sendTrade({ tradeCounter: cache.tradeCounter, trade: tradeEntry });
				cache.sideBuy = !cache.sideBuy;
			} catch (e: any) {
				if (e instanceof SwapError) {
					console.log(e.type, e.fee, e.message);
					tradeEntry.error = e.message;
					tradeEntry.errorType = e.type;
					tradeEntry.fee = e.fee ? e.fee : undefined;
				} else {
					if (e instanceof SendTransactionError) {
						if (e.logs) {
							for (const log of e.logs) {
								if (log.indexOf("Slippage") >= 0) {
									tradeEntry.errorType = "slippage";
									tradeEntry.error = "Slippage exceeded in sim";
									break;
								}
							}
						}
					}
					if (tradeEntry.errorType !== "slippage") {
						tradeEntry.errorType = "unknown";
						console.log(e);
						tradeEntry.error = e.toString();
					}
				}
				tradeEntry.status = "error";
				tradeEntry.error = e.toString();
				tradeEntry.profit = 0;

				if (process.env.DEBUG) storeItInTempAsJSON(`fail_trade_${tradeEntry.txId}`, tradeEntry);

				if (tradeEntry.errorType !== "unknown") {
					const timestamp = (new Date()).getTime();
					cache.last10Error.push(timestamp);
					const time10ErrorAgo = cache.last10Error.shift();
					if (time10ErrorAgo && timestamp - time10ErrorAgo < 10000) {
						// Go to sim mode as a safety measure to avoid spamming the rpc with trade that will be eaten by fees
						cache.tradingEnabled = false;
					}
				}

				failedSwapHandler(tradeEntry, ws, route);
			} finally {
				// stop refreshing status
				clearInterval(printTxStatus);
				cache.swappingRightNow = false;
			}
		}
	}

	ws.sendData({
		date: date.getTime(),
		i,
		performanceOfRouteComp,
		inputToken,
		outputToken,
		tokenA,
		tradingEnabled: cache.tradingEnabled,
		tokenB,
		route,
		simulatedProfit,
		availableRoutes: routes.routesInfos.length,
		iterationPerMinute: cache.iterationPerMinute.value,
		queue: Object.keys(cache.queue).length,
		routeStr
	});
}

async function arbitrageStrategy(jupiter: any, tokenA: Token, i: number) {
	if (!cache.config) throw "Config missing";
	const config = cache.config;
	const date = new Date();

	// calculate & update iterations per minute
	updateIterationsPerMin(cache);

	// Calculate amount that will be used for trade
	const amountToTrade =
		config.tradeSize.strategy === "cumulative"
			? cache.currentBalance["tokenA"]
			: cache.initialBalance["tokenA"];
	const baseAmount = amountToTrade;

	// default slippage
	const slippage =
		typeof config.slippage === "number" ? config.slippage : config.minPercProfit * 100;
	// set input / output token
	const inputToken = tokenA;
	const outputToken = tokenA;

	// check current routes
	const performanceOfRouteCompStart = performance.now();

	const routes = await jupiter.computeRoutes({
		inputMint: new PublicKey(inputToken.address),
		outputMint: new PublicKey(outputToken.address),
		forceFetch: true,
		amount: JSBI.BigInt(amountToTrade),
		slippageBps: slippage
	});

	checkRoutesResponse(routes, ws);

	// count available routes
	cache.availableRoutes[cache.sideBuy ? "buy" : "sell"] =
		routes.routesInfos.length;

	// update status as OK
	cache.queue[i] = 0;

	const performanceOfRouteComp =
		performance.now() - performanceOfRouteCompStart;

	// choose first route
	// choose first route
	let _route: RouteInfo | undefined = undefined;
	let routeKey = "";
	for (const x of routes.routesInfos) {
		const routeKeys = [];
		for (const y of x.marketInfos) {
			routeKeys.push(y.amm.id + y.outputMint.toBase58());
		}

		routeKey = routeKeys.join("-");
		const now = new Date().getTime();
		const b = cache.bannedRoute.get(routeKey);
		if (!b) {
			_route = x;
			break;
		} else if (now - b < 30000) {
			cache.bannedRoute.delete(routeKey);
			_route = x;
			break;
		}
	}

	if (!_route) return;

	const route: RouteInfoPlus = {
		inAmount: JSBI.toNumber(_route.inAmount),
		outAmount: JSBI.toNumber(_route.outAmount),
		amount: JSBI.toNumber(_route.amount),
		slippageBps: _route.slippageBps,
		marketInfos: _route.marketInfos,
		getDepositAndFee: _route.getDepositAndFee,
		otherAmountThreshold: JSBI.toNumber(_route.otherAmountThreshold),
		priceImpactPct: _route.priceImpactPct,
		swapMode: _route.swapMode,
		route: _route,
		key: routeKey
	};

	const ammList = [];
	for (const x of _route.marketInfos) {
		ammList.push(x.amm.label);
	}
	const routeStr = ammList.join(" -> ");

	// update slippage with "profit or kill" slippage
	if (config.slippage === "profitOrKill") {
		route.otherAmountThreshold = amountToTrade;
		route.slippageBps = 10000;
	}

	// calculate profitability
	const simulatedProfit = calculateProfit(baseAmount, route.outAmount);

	// store max profit spotted
	if (simulatedProfit > cache.maxProfitSpotted["buy"]) {
		cache.maxProfitSpotted["buy"] = simulatedProfit;
	}

	ws.sendData({
		date: date.getTime(),
		i,
		performanceOfRouteComp,
		inputToken,
		outputToken,
		tokenA,
		tokenB: tokenA,
		route,
		simulatedProfit,
		tradingEnabled: cache.tradingEnabled,
		availableRoutes: routes.routesInfos.length,
		iterationPerMinute: cache.iterationPerMinute.value,
		queue: Object.keys(cache.queue).length,
		routeStr
	});

	if (
		!cache.swappingRightNow &&
		(cache.hotkeys.e ||
			cache.hotkeys.r ||
			simulatedProfit >= config.minPercProfit)
	) {
		// hotkeys
		if (cache.hotkeys.e) {
			console.log("[E] PRESSED - EXECUTION FORCED BY USER!");
			cache.hotkeys.e = false;
		}
		if (cache.hotkeys.r) {
			console.log("[R] PRESSED - REVERT BACK SWAP!");
			route.otherAmountThreshold = 0;
			cache.hotkeys.r = false;
		}

		if (cache.tradingEnabled || cache.hotkeys.r) {
			cache.swappingRightNow = true;
			// store trade to the history
			const tradeEntry: TradeEntry = {
				id: short.generate(),
				status: "processing",
				date: date.getTime(),
				buy: cache.sideBuy,
				inputToken: inputToken.symbol,
				outputToken: outputToken.symbol,
				inAmount: route.inAmount / 10 ** inputToken.decimals,
				expectedOutAmount: route.outAmount / 10 ** outputToken.decimals,
				expectedProfit: simulatedProfit,
				route: routeStr
			};

			// start refreshing status
			const printTxStatus = setInterval(() => {
				if (cache.swappingRightNow) {
					ws.sendData({
						date: date.getTime(),
						i,
						performanceOfRouteComp,
						inputToken,
						outputToken,
						tokenA,
						tokenB: tokenA,
						route,
						simulatedProfit,
						tradingEnabled: cache.tradingEnabled,
						availableRoutes: routes.routesInfos.length,
						iterationPerMinute: cache.iterationPerMinute.value,
						queue: Object.keys(cache.queue).length,
						routeStr
					});
				}
			}, 500);

			try {
				cache.performanceOfTxStart = performance.now();

				tradeEntry.txId = await swap(jupiter, route);

				tradeEntry.status = "processing";
				ws.sendTrade({ tradeCounter: cache.tradeCounter, trade: tradeEntry });

				const { fee, outAmount } = await getSwapResultFromRPCParserArbitrage(
					tradeEntry.txId,
					cache.anchorWallet?.publicKey.toBase58() as string,
					tokenA.address,
					tradeEntry.inAmount,
					cache.connection as Connection
				);
				tradeEntry.fee = fee;
				tradeEntry.outAmount = outAmount;
				tradeEntry.profit = 0;
				tradeEntry.performanceOfTx = cache.performanceOfTxStart;
				tradeEntry.status = "confirmed";
				console.log(
					"Profit calculation before/after",
					cache.currentBalance[cache.sideBuy ? "tokenB" : "tokenA"], tradeEntry.outAmount);
				tradeEntry.profit = 0;

				successSwapHandler(tradeEntry, tokenA, tokenA, ws).catch((e) =>
					console.log("Error handling success swap", e)
				);

				if (cache.hotkeys.r) {
					console.log("[R] - REVERT BACK SWAP - SUCCESS!");
					cache.tradingEnabled = false;
					console.log("TRADING DISABLED!");
					cache.hotkeys.r = false;
				}
				ws.sendTrade({ tradeCounter: cache.tradeCounter, trade: tradeEntry });
				cache.sideBuy = !cache.sideBuy;
			} catch (e: any) {
				if (e instanceof SwapError) {
					console.log(e.type, e.fee, e.message);
					tradeEntry.error = e.message;
					tradeEntry.errorType = e.type;
					tradeEntry.fee = e.fee ? e.fee : undefined;
				} else {
					if (e instanceof SendTransactionError) {
						if (e.logs) {
							for (const log of e.logs) {
								if (log.indexOf("Slippage") >= 0) {
									tradeEntry.errorType = "slippage";
									tradeEntry.error = "Slippage exceeded in sim";
									break;
								}
							}
						}
					}
					if (tradeEntry.errorType !== "slippage") {
						tradeEntry.errorType = "unknown";
						console.log(e);
						tradeEntry.error = e.toString();
					}
				}
				tradeEntry.profit = 0;

				if (tradeEntry.errorType !== "unknown") {
					const timestamp = (new Date()).getTime();
					cache.last10Error.push(timestamp);
					const time10ErrorAgo = cache.last10Error.shift();
					if (time10ErrorAgo && timestamp - time10ErrorAgo < 10000) {
						// Go to sim mode as a safety measure to avoid spamming the rpc with trade that will be eaten by fees
						cache.tradingEnabled = false;
					}
				}

				failedSwapHandler(tradeEntry, ws, route);
			} finally {
				// stop refreshing status
				clearInterval(printTxStatus);
				cache.swappingRightNow = false;
			}
		}
	}

	ws.sendData({
		date: date.getTime(),
		i,
		performanceOfRouteComp,
		inputToken,
		outputToken,
		tokenA,
		tokenB: tokenA,
		route,
		simulatedProfit,
		tradingEnabled: cache.tradingEnabled,
		availableRoutes: routes.routesInfos.length,
		iterationPerMinute: cache.iterationPerMinute.value,
		queue: Object.keys(cache.queue).length,
		routeStr
	});
}

const watcher = async (jupiter: any, tokenA: any, tokenB: any) => {
	if (!cache.config) throw "Config missing";
	const config = cache.config;

	if (
		!cache.swappingRightNow &&
		Object.keys(cache.queue).length < cache.queueThrottle
	) {
		cache.iteration++;
		const i = cache.iteration;
		cache.queue[i] = -1;
		ws.sendPing();
		try {
			if (config.tradingStrategy === "pingpong") {
				await pingpongStrategy(jupiter, tokenA, tokenB, i);
			}
			if (config.tradingStrategy === "arbitrage") {
				await arbitrageStrategy(jupiter, tokenA, i);
			}
		} catch (e: any) {
			if (e.type !== "route") {
				console.log(e);
				cache.queue[i] = 1;
				const errorString = `Unexpected error, waiting 5 seconds... ${e.toString()}`;
				ws.sendError(errorString);
				// Because it's an unexpected error, wait 5s
				await new Promise(f => setTimeout(f, 5000));
			}
		} finally {
			cache.queue = {};
			cache.swappingRightNow
		}
	}
};

export async function run(setupAll = false) {

	let tokenA: any;
	let tokenB: any;
	let tokens: any;

	try {
		// set everything up
		ws.sendInfo("Setting up...");

		if (setupAll) {
			// load config file and store it in cache
			const _config = loadConfigFile({ showSpinner: true });
			_config.wrapUnwrapSOL = cache.wrapUnwrapSOL;
			_config.queueThrottle = cache.queueThrottle;

			ws.sendInfo("Loading tokens");

			// read tokens.json file
			try {
				const res = await axios.get(TOKEN_LIST_URL[_config.network]);
				fs.writeFileSync(
							"./temp/tokens.json",
							JSON.stringify(res.data, null, 2)
						);
				tokens = JSON.parse(fs.readFileSync("./temp/tokens.json").toString());
				// find tokens full Object
				tokenA = tokens.find(
					(t: any) => t.address === _config.tokenA.address
				);

				_config.tokenA = tokenA;

				if (_config.tradingStrategy !== "arbitrage") {
					tokenB = tokens.find(
						(t: any) => t.address === _config.tokenB.address
					);
					_config.tokenB = tokenB;
				}
			} catch (error) {
				ws.sendError("Loading tokens failed!");
				throw error;
			}

			cache.config = _config;

		}

		const { jupiter } = await setup();
		if (!cache.config) throw "Config missing";
		const config = cache.config;

		if (setupAll) {
			if (config.tradingStrategy === "pingpong") {
				// set initial & current & last balance for tokenA
				cache.initialBalance.tokenA = toNumber(
					config.tradeSize.value,
					tokenA.decimals
				);
				cache.currentBalance.tokenA = cache.initialBalance.tokenA;
				cache.lastBalance.tokenA = cache.initialBalance.tokenA;

				// set initial & last balance for tokenB
				cache.initialBalance.tokenB = await getInitialOutAmountWithSlippage(
					jupiter,
					tokenA,
					tokenB,
					cache.initialBalance.tokenA
				);
				cache.lastBalance.tokenB = cache.initialBalance.tokenB;
			} else if (config.tradingStrategy === "arbitrage") {
				// set initial & current & last balance for tokenA
				cache.initialBalance.tokenA = toNumber(
					config.tradeSize.value,
					tokenA.decimals
				);
				cache.currentBalance.tokenA = cache.initialBalance.tokenA;
				cache.lastBalance.tokenA = cache.initialBalance.tokenA;
			}
		}

		ws.sendInitData({ startTime: cache.startTime.getTime() });

		(global as any).botInterval = setInterval(
			() => {
				watcher(jupiter, tokenA, tokenB);
			},
			config.minInterval
		);
	} catch (error: any) {
		ws.sendError(`Uncaught exception ${error}`);
		console.log(chalk.red(`Uncaught exception ${error}`));
		throw Error(`Uncaught exception ${error}`);
	}
}
