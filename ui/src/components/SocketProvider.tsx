import {
	useRef,
	useEffect,
	useContext,
	createContext,
	ReactNode,
	useState,
	useCallback,
} from "react";
import { useParamsProvider } from "./ParameterProvider";
import { Message, Config, BotData, TradeCounter, Balances, InitData, TradeEntry } from "../types";
import { toast } from 'react-toastify';

export type SocketData = {
	status: "started" | "paused";
	config?: Config;
	data?: BotData;
	connected: boolean;
	tradeHistory: TradeEntry[];
	tradeCounter: TradeCounter;
	balances: Balances;
	initData?: InitData;
	pingTime: Date | undefined;
	messages: {
		message: string;
		type: "info" | "error" | "success";
		time: number;
	}[];
	start: () => void;
	stop: () => void;
	execute: () => void;
	reverse: () => void;
	sim: () => void;
};

type BotWsProps = { children: ReactNode };
export const BotWsContext = createContext<SocketData | undefined>(undefined);

export function SocketProvider({ children }: BotWsProps) {
	const { botWs } = useParamsProvider();
	const [status, setStatus] = useState<"started" | "paused">("paused");
	const [connected, setConnected] = useState<boolean>(false);
	const [config, setConfig] = useState<Config>();
	const [data, setData] = useState<BotData>();
	const [pingTime, setPingTime] = useState<Date>();
	const [tradeCounter, setTradeCounter] = useState<TradeCounter>({
		buy: { fail: 0, success: 0, failWithFee: 0 }, sell: { fail: 0, success: 0, failWithFee: 0 }
	});
	const [tradeHistory, setTradeHistory] = useState<TradeEntry[]>([]);
	const [initData, setInitData] = useState<InitData>();
	const [balances, setBalances] = useState<Balances>({
		initBalance: { tokenA: 0, tokenB: 0 },
		lastBalance: { tokenA: 0, tokenB: 0 },
		currentBalance: { tokenA: 0, tokenB: 0 },
		profit: { tokenB: 0, tokenA: 0 }
	});
	const tradeHistoryRef = useRef<Map<string, TradeEntry>>(new Map<string, TradeEntry>());
	const [retrying, setRetrying] = useState<number>(0);
	const retryingRef = useRef(0);
	const [messages, setMessages] = useState<Message[]>([]);
	const messagesRef = useRef<Message[]>([]);
	const socket = useRef<WebSocket | undefined>(undefined);

	const start = useCallback(() => {
		if (socket.current) {
			socket.current.send("start");
		}
	}, []);

	function addMessage(message: Message) {
		messagesRef.current.push(message);
		messagesRef.current.sort((b, a) => a.time - b.time);
		setMessages(messagesRef.current);
	}

	function addMessages(newMessages: Message[]) {
		messagesRef.current = [...messagesRef.current, ...newMessages];
		messagesRef.current.sort((b, a) => a.time - b.time);
		setMessages(messagesRef.current);
	}

	const stop = useCallback(() => {
		if (socket.current) {
			socket.current.send("stop");
		}
	}, []);

	const execute = useCallback(() => {
		if (socket.current) {
			socket.current.send(JSON.stringify({ method: "execute" }));
		}
	}, []);

	const reverse = useCallback(() => {
		if (socket.current) {
			socket.current.send(JSON.stringify({ method: "swap" }));
		}
	}, []);

	const sim = useCallback(() => {
		if (socket.current) {
			socket.current.send(JSON.stringify({ method: "sim" }));
		}
	}, []);

	useEffect(() => {
		const interval = setInterval(function () {
			if (socket.current && socket.current?.readyState > 1) {
				retryingRef.current += 1
				setRetrying(retryingRef.current)
			}
		}, 5000);

		return () => clearInterval(interval)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (socket.current) {
			socket.current.close();
			socket.current = undefined;
		}

		if (!botWs) return;

		try {
			socket.current = new WebSocket(botWs);
		} catch (e) {
			socket.current = undefined;
			toast.error(`Socket is invalid: ${e}`)
			return;
		}

		socket.current.onopen = () => {
			setConnected(true);
			addMessage({
				message: "Websocket connected",
				time: new Date().getTime(),
				type: "success",
			});
		};

		socket.current.onmessage = (evt) => {
			const d = JSON.parse(evt.data);
			const source = d.type as string;
			if (source) {
				if (source === "messages") {
					addMessages(d.data);
				} else if (source === "message") {
					addMessage(d.data);
				} else if (source === "config") {
					setConfig(d.data);
				} else if (source === "status") {
					setStatus(d.data);
				} else if (source === "data") {
					setData(d.data);
				} else if (source === "balances") {
					setBalances(d.data);
				} else if (source === "init") {
					setInitData(d.data);
				} else if (source === "ping") {
					setPingTime(new Date());
				} else if (source === "tradeHistory") {
					setTradeCounter(d.data.tradeCounter);
					tradeHistoryRef.current = new Map<string, TradeEntry>();
					for (const t of d.data.tradeHistory) {
						tradeHistoryRef.current.set(t.id, t);
					}
					const newHistory = Array.from(tradeHistoryRef.current.values());
					newHistory.sort((b, a) => a.date - b.date);
					setTradeHistory(newHistory);
				} else if (source === "trade") {
					setTradeCounter(d.data.tradeCounter);
					tradeHistoryRef.current.set(d.data.trade.id, d.data.trade);
					const newHistory = Array.from(tradeHistoryRef.current.values());
					newHistory.sort((b, a) => a.date - b.date);
					setTradeHistory(newHistory)
					console.log('New trade', d.data.trade);
				}
			} else {
				console.log("Message received is not understood", evt.data);
			}
		};

		socket.current.onclose = () => {
			if (connected) {
				setConnected(false);
				addMessage({
					message: "Websocket disconnected",
					time: new Date().getTime(),
					type: "error",
				});
			}
		};

		return () => setConnected(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [botWs, retrying]);

	const resp: SocketData = {
		config,
		status,
		messages,
		start,
		stop,
		connected,
		data,
		tradeCounter,
		tradeHistory,
		balances,
		initData,
		execute,
		reverse,
		pingTime,
		sim
	};

	return <BotWsContext.Provider value={resp}>{children}</BotWsContext.Provider>;
}

export function useSocketProvider() {
	const socketContext = useContext(BotWsContext);
	if (socketContext === undefined) {
		throw new Error(`useBotWsProvider must be used within a botWsContext`);
	}
	return socketContext;
}
