// global cache
import { Connection } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import { MarketInfo } from "@jup-ag/core/dist/lib/market";
import { SwapMode } from "@jup-ag/core/dist/lib/amm";
import { TransactionFeeInfo } from "@jup-ag/core/dist/lib/routes";
import { RouteInfo } from "@jup-ag/core";
import { SwapErrorType } from "./swap";

export type Token = {
	symbol: string;
	address: string;
	decimals: number;
	chainId: number;
	name: string;
	logoURI: string;
	tags: string[];
}
export type Config = {
	network: "devnet" | "testnet" | "mainnet-beta";
	rpc: string[];
	tradingStrategy: string;
	tokenA: Token;
	tokenB: Token;
	slippage: string | number;
	minInterval: number;
	minPercProfit: number
	tradeSize: { value: number; strategy: string },
	storeFailedTxInHistory: boolean,
	ui: { defaultColor: string }
	wrapUnwrapSOL?: boolean
	queueThrottle: number;
	priorityFee?: number;
	legacyTransaction?: boolean;
};

export type RouteInfoPlus = {
	key: string;
	marketInfos: MarketInfo[];
	inAmount: number;
	outAmount: number;
	amount: number;
	otherAmountThreshold: number;
	slippageBps: number;
	swapMode: SwapMode;
	priceImpactPct: number
	getDepositAndFee: () => Promise<TransactionFeeInfo | undefined>;
	route: RouteInfo
}

export type TradeEntry = {
	id: string;
	date: number;
	buy: boolean;
	inputToken: string;
	outputToken: string;
	inAmount: number;
	expectedOutAmount: number;
	expectedProfit: number;
	outAmount?: number;
	performanceOfTx?: number;
	error?: string;
	errorType?: SwapErrorType;
	profit?: number;
	status: "confirmed" | "error" | "processing" | "completed";
	txId?: string;
	route: string;
	fee?: number
};

export type Cache = {
	startTime: Date;
	queue: { [key: number]: any };
	queueThrottle: number;
	sideBuy: boolean;
	iteration: number;
	connection?: Connection;
	anchorWallet?: Wallet
	config: Config;
	last10Error: number[];
	lastRpcUsed: number;
	changeRpc?: string;
	bannedRoute: Map<string, number>;
	iterationPerMinute: {
		start: number;
		value: number;
		counter: number;
	};
	initialBalance: {
		tokenA: number;
		tokenB: number;
	};

	currentBalance: {
		tokenA: number;
		tokenB: number;
	};
	currentProfit: {
		tokenA: number;
		tokenB: number;
	};
	lastBalance: {
		tokenA: number;
		tokenB: number;
	};
	profit: {
		tokenA: number;
		tokenB: number;
	};
	maxProfitSpotted: {
		buy: number;
		sell: number;
	};
	tradeCounter: {
		buy: { success: number; fail: number, failWithFee: number };
		sell: { success: number; fail: number, failWithFee: number };
	};
	ui: {
		defaultColor: string;
		showPerformanceOfRouteCompChart: boolean;
		showProfitChart: boolean;
		showTradeHistory: boolean;
		hideRpc: boolean;
		showHelp: boolean;
		allowClear: boolean;
	};
	chart: {
		spottedMax: {
			buy: Array<number>;
			sell: Array<number>;
		};
		performanceOfRouteComp: Array<number>;
	};
	hotkeys: {
		e: boolean;
		r: boolean;
	};
	tradingEnabled: boolean;
	wrapUnwrapSOL: boolean;
	swappingRightNow: boolean;
	fetchingResultsFromSolscan: boolean;
	fetchingResultsFromSolscanStart: number;
	tradeHistory: TradeEntry[];
	performanceOfTxStart: number;
	availableRoutes: {
		buy: number;
		sell: number;
	};
	isSetupDone: boolean;
};

export const cache: Cache = {
	startTime: new Date(),
	queue: {},
	queueThrottle: 1,
	sideBuy: true,
	iteration: 0,
	lastRpcUsed: -1,
	config: {
		rpc: [],
		ui: { defaultColor: ''},
		tokenB: { address: '', chainId: 0, name: '', logoURI: '', tags: [], decimals: 0, symbol: ''},
		tokenA: { address: '', chainId: 0, name: '', logoURI: '', tags: [], decimals: 0, symbol: ''},
		minPercProfit: 0,
		legacyTransaction: undefined,
		priorityFee: 0,
		minInterval: 0,
		slippage: 0,
		queueThrottle: 0,
		wrapUnwrapSOL: undefined,
		network: "mainnet-beta",
		storeFailedTxInHistory: true,
		tradeSize: { value: 0, strategy: ''},
		tradingStrategy: ''

	},
	last10Error: new Array(10).fill(0),
	iterationPerMinute: {
		start: performance.now(),
		value: 0,
		counter: 0
	},
	initialBalance: {
		tokenA: 0,
		tokenB: 0
	},

	currentBalance: {
		tokenA: 0,
		tokenB: 0
	},
	currentProfit: {
		tokenA: 0,
		tokenB: 0
	},
	lastBalance: {
		tokenA: 0,
		tokenB: 0
	},
	profit: {
		tokenA: 0,
		tokenB: 0
	},
	maxProfitSpotted: {
		buy: 0,
		sell: 0
	},
	tradeCounter: {
		buy: { success: 0, fail: 0, failWithFee: 0 },
		sell: { success: 0, fail: 0, failWithFee: 0 }
	},
	ui: {
		defaultColor: process.env.UI_COLOR ?? "cyan",
		showPerformanceOfRouteCompChart: false,
		showProfitChart: true,
		showTradeHistory: true,
		hideRpc: false,
		showHelp: true,
		allowClear: true
	},
	chart: {
		spottedMax: {
			buy: new Array(120).fill(0),
			sell: new Array(120).fill(0)
		},
		performanceOfRouteComp: new Array(120).fill(0)
	},
	hotkeys: {
		e: false,
		r: false
	},
	tradingEnabled:
		process.env.TRADING_ENABLED === undefined
			? true
			: process.env.TRADING_ENABLED === "true",
	wrapUnwrapSOL:
		process.env.WRAP_UNWRAP_SOL === undefined
			? true
			: process.env.WRAP_UNWRAP_SOL === "true",
	swappingRightNow: false,
	fetchingResultsFromSolscan: false,
	fetchingResultsFromSolscanStart: 0,
	tradeHistory: [],
	performanceOfTxStart: 0,
	availableRoutes: {
		buy: 0,
		sell: 0
	},
	isSetupDone: false,
	bannedRoute: new Map<string, number>()
};

export default cache;
