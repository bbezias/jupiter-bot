import { calculateProfit, storeItInTempAsJSON } from "./utils";
import cache, { RouteInfoPlus, Token, TradeEntry } from "./cache";
import { BotWs } from "./ws";
import { Jupiter } from "@jup-ag/core";
import {
	TransactionMessage,
	VersionedTransaction,
	ComputeBudgetProgram,
} from "@solana/web3.js";

export type SwapErrorType =
	| "slippage"
	| "unknown"
	| "notConfirmed"
	| "internalError";

export class SwapError extends Error {
	type: SwapErrorType;
	fee?: number | null;
	transactionId?: string;

	constructor(
		msg: string,
		type: SwapErrorType,
		fee?: number | null,
		transactionId?: string
	) {
		super(msg);

		this.type = type;
		this.fee = fee;
		this.transactionId = transactionId;
		// Set the prototype explicitly.
		Object.setPrototypeOf(this, SwapError.prototype);
	}
}

export async function swap(
	jupiter: Jupiter,
	route: RouteInfoPlus,
): Promise<string> {

	if (process.env.DEBUG) storeItInTempAsJSON(`routeInfoBeforeSwap`, route);

	const { swapTransaction, addressLookupTableAccounts } =
		await jupiter.exchange({
			routeInfo: route.route
		});

	if (!cache.connection) throw "Connection  missing from cache";
	const connection = cache.connection;
	if (!cache.anchorWallet) throw "Wallet missing from cache";
	const anchorWallet = cache.anchorWallet;

	const latestBlockHash = await cache.connection.getLatestBlockhash();

	if (swapTransaction instanceof VersionedTransaction) {
		// decompile transaction message and add transfer instruction
		const message = TransactionMessage.decompile(swapTransaction.message, {
			addressLookupTableAccounts: addressLookupTableAccounts
		});

		if (
			cache.config &&
			cache.config.priorityFee &&
			cache.config.priorityFee > 0
		) {
			const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
				microLamports: cache.config.priorityFee
			});

			message.instructions.push(addPriorityFee);
		}

		// compile the message and update the swapTransaction
		swapTransaction.message = message.compileToV0Message(
			addressLookupTableAccounts
		);

		swapTransaction.message.recentBlockhash = latestBlockHash.blockhash;
		// sign the transaction
		swapTransaction.sign([anchorWallet.payer]);
	}

	return await connection.sendRawTransaction(
		swapTransaction.serialize()
	);

}

export function failedSwapHandler(
	tradeEntry: TradeEntry,
	ws: BotWs,
	route: RouteInfoPlus
) {
	// update counter
	cache.tradeCounter[cache.sideBuy ? "buy" : "sell"].fail++;
	if (tradeEntry.fee && tradeEntry.fee > 0) cache.tradeCounter[cache.sideBuy ? "buy" : "sell"].failWithFee++;

	if (!cache.config) throw "Config missing";
	const config = cache.config;

	// update trade history
	config.storeFailedTxInHistory = true;

	tradeEntry.status = "error";

	if (!tradeEntry.txId) {
		cache.bannedRoute.set(route.key, new Date().getTime());
	}

	// update trade history
	const tempHistory = cache.tradeHistory;
	tempHistory.push(tradeEntry);
	cache.tradeHistory = tempHistory;
	ws.sendTrade({ tradeCounter: cache.tradeCounter, trade: tradeEntry });
}

export async function successSwapHandler(
	tradeEntry: TradeEntry,
	tokenA: Token,
	tokenB: Token,
	ws: BotWs
) {
	if (!cache.config) throw "Config missing";
	const config = cache.config;
	// update counter
	cache.tradeCounter[cache.sideBuy ? "buy" : "sell"].success++;

	if (config.tradingStrategy === "pingpong") {
		// update balance
		if (cache.sideBuy) {
			cache.lastBalance.tokenA = cache.currentBalance.tokenA;
			cache.currentBalance.tokenA = 0;
			cache.currentBalance.tokenB = tradeEntry.outAmount as number;
		} else {
			cache.lastBalance.tokenB = cache.currentBalance.tokenB;
			cache.currentBalance.tokenB = 0;
			cache.currentBalance.tokenA = tradeEntry.outAmount as number;
		}

		// update profit
		if (cache.sideBuy) {
			cache.currentProfit.tokenA = 0;
			cache.currentProfit.tokenB = calculateProfit(
				cache.initialBalance.tokenB,
				cache.currentBalance.tokenB
			);
		} else {
			cache.currentProfit.tokenB = 0;
			cache.currentProfit.tokenA = calculateProfit(
				cache.initialBalance.tokenA,
				cache.currentBalance.tokenA
			);
		}

		// update trade history
		const tempHistory = cache.tradeHistory;

		tradeEntry.profit = calculateProfit(
			cache.lastBalance[cache.sideBuy ? "tokenB" : "tokenA"],
			tradeEntry.outAmount || 0
		);
		tempHistory.push(tradeEntry);
		cache.tradeHistory = tempHistory;
		ws.sendTrade({ tradeCounter: cache.tradeCounter, trade: tradeEntry });
		ws.sendBalances({
			currentBalance: cache.currentBalance,
			initBalance: cache.initialBalance,
			lastBalance: cache.lastBalance,
			profit: cache.currentProfit
		});
	}

	if (config.tradingStrategy === "arbitrage") {
		cache.lastBalance.tokenA = cache.currentBalance.tokenA;
		cache.currentBalance.tokenA =
			cache.lastBalance.tokenA + (tradeEntry.outAmount as number - tradeEntry.inAmount);

		// update trade history
		const tempHistory = cache.tradeHistory;

		tradeEntry.profit = calculateProfit(
			tradeEntry.inAmount,
			tradeEntry.outAmount || 0
		);
		tempHistory.push(tradeEntry);
		cache.tradeHistory = tempHistory;

		const prevProfit = cache.currentProfit.tokenA;

		// total profit
		cache.currentProfit.tokenA = prevProfit + tradeEntry.profit;
		ws.sendTrade({ tradeCounter: cache.tradeCounter, trade: tradeEntry });
		ws.sendBalances({
			currentBalance: cache.currentBalance,
			initBalance: cache.initialBalance,
			lastBalance: cache.lastBalance,
			profit: cache.currentProfit
		});
	}
}

exports.successSwapHandler = successSwapHandler;
