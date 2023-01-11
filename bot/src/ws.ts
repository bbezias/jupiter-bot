import { WebSocketServer } from "ws";
import { cache, Token, TradeEntry } from "./cache";

function formatMessage(type: string, data: any): string {
	return JSON.stringify({
		type,
		timestamp: new Date().getTime(),
		data
	});
}

export type Message = {
	message: string;
	type: "info" | "error" | "success";
	time: number;
};

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

export type TradeCounter = { buy: { success: number, fail: number }, sell: { success: number, fail: number } };

export type TradeUpdate = {
	tradeCounter: TradeCounter;
	trade: TradeEntry;
}

export type TradeHistory = {
	tradeCounter: TradeCounter;
	tradeHistory: TradeEntry[];
}

export type Balances = {
	currentBalance: { tokenA: number, tokenB: number };
	initBalance: { tokenA: number, tokenB: number };
	lastBalance: { tokenA: number, tokenB: number };
	profit: { tokenA: number, tokenB: number };
}

export type InitData = {
	startTime: number;
}

export class BotWs extends WebSocketServer {
	messages: Message[] = [];

	sendStatus() {
		const fmt = formatMessage("status", "started");
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendData(data: BotData) {
		const fmt = formatMessage("data", data);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendConfig() {
		const fmt = formatMessage("config", cache.config);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendTradeHistory(data: TradeHistory) {
		const fmt = formatMessage("tradeHistory", data);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendInitData(data: InitData) {
		const fmt = formatMessage("init", data);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendTrade(data: TradeUpdate) {
		const fmt = formatMessage("trade", data);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendBalances(data: Balances) {
		const fmt = formatMessage("balances", data);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendMessage(msg: Message) {
		if (msg) {
			if (this.messages.length > 30) {
				this.messages.shift();
			}

			this.messages.push(msg);
		}

		const fmt = formatMessage("message", msg);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendMessages() {
		const fmt = formatMessage("messages", this.messages);
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	sendInfo(message: string) {
		this.sendMessage({ message, type: "info", time: new Date().getTime() });
	}

	sendError(message: string) {
		this.sendMessage({ message, type: "error", time: new Date().getTime() });
	}

	sendSuccess(message: string) {
		this.sendMessage({ message, type: "success", time: new Date().getTime() });
	}

	sendPing() {
		const fmt = formatMessage("ping", {});
		for (const ws of this.clients) {
			ws.send(fmt);
		}
	}

	initialise(): void {
		this.on("connection", (ws) => {
			ws.on("message", (messageStr) => {
				const message = JSON.parse(messageStr.toString());
				console.log(message);
				switch (message.method) {
					case "stop":
						console.log("Stop");
						process.exit();
						break;
					case "sim":
						cache.tradingEnabled = !cache.tradingEnabled;
						break;
					case "swap":
						cache.hotkeys.r = true;
						break;
					case "execute":
						cache.hotkeys.e = true;
						break;
					case "slippage":
						if (cache.config && (message.data === "profitOrKill" || typeof message.data === "number")) cache.config.slippage = message.data;
						this.sendConfig();
						break;
					case "legacy":
						if (typeof message.data === "boolean" && cache.config) cache.config.legacyTransaction = message.data;
						this.sendConfig();
						break;
					case "minPercProfit":
						if (cache.config && (typeof message.data === "number")) cache.config.slippage = message.data.toString();
						this.sendConfig();
						break;
					case "rpc":
						cache.changeRpc = message.data;
						break
				}
			});
			this.sendMessages();
			this.sendStatus();
			this.sendInitData({ startTime: cache.startTime.getTime() });
			this.sendBalances({
				currentBalance: cache.currentBalance,
				initBalance: cache.initialBalance,
				lastBalance: cache.lastBalance,
				profit: cache.currentProfit
			});
			this.sendTradeHistory({ tradeCounter: cache.tradeCounter, tradeHistory: cache.tradeHistory });
			if (cache.config) this.sendConfig();
		});
		this.on("close", () => {
			console.log("disconnected");
		});
	}
}

const ws = new BotWs({ port: 3002 });

export default ws;
