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
	minPercProfit: number;
	tradeSize: { value: number; strategy: string };
	storeFailedTxInHistory: boolean;
	ui: { defaultColor: string };
	wrapUnwrapSOL?: boolean;
	queueThrottle: number;
};

export type Balances = {
	currentBalance: { tokenA: number, tokenB: number };
	initBalance: { tokenA: number, tokenB: number };
	lastBalance: { tokenA: number, tokenB: number };
	profit: { tokenA: number, tokenB: number };
}

export type BotData = {
	date: number;
	i: number;
	performanceOfRouteComp: number;
	inputToken: Token;
	outputToken: Token;
	tokenA: Token;
	tokenB: Token;
	route: any;
	availableRoutes: number;
	simulatedProfit: any;
	iterationPerMinute: number;
	queue: number;
	routeStr?: string;
	tradingEnabled: boolean
};

export type InitData = {
	startTime: number;
}

export type Message = {
	message: string;
	type: "info" | "error" | "success";
	time: number;
};

export type TradeCounter = {
	buy: { success: number; fail: number, failWithFee: number };
	sell: { success: number; fail: number, failWithFee: number };
};

export type SwapErrorType =
	| "slippage"
	| "unknown"
	| "notConfirmed"
	| "internalError";

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

export type TradeUpdate = {
	tradeCounter: TradeCounter;
	trade: TradeEntry;
}

export type TradeHistory = {
	tradeCounter: TradeCounter;
	tradeHistory: TradeEntry[];
}
