import "./App.css";
import { useSocketProvider } from "./components/SocketProvider";
import { ChartBarIcon, ClockIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, MoonIcon } from "@heroicons/react/24/outline";
import { Messages } from "./components/Messages";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Main } from './components/Main';
import { Top } from './components/Top';
import { LatencyChart } from './components/LatencyChart';
import { useParamsProvider } from './components/ParameterProvider';
import { ProfitChart } from './components/ProfitChart';
import { Trades } from './components/Trades';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditModal } from './components/EditModal';
import { ToastContainer, toast } from 'react-toastify';

const App = () => {
	// react hooks
	const { botWs, changeBotWs } = useParamsProvider();
	const { connected } = useSocketProvider();
	const [botUrl, setBotUrl] = useState(botWs || "");
	const { showLatency, showProfit, darkMode, changeDarkMode, changeLatency, changeProfit, noFeeError, changeNoFeeError } = useParamsProvider();
	const botWsInputRef = useRef<any>(null);

	useEffect(() => {
		document.title = 'Arb Protocol by Grosgrosbg';
	}, []);

	useEffect(() => {
		if (botWs && botWs !== botUrl) setBotUrl(botWs);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [botWs]);

	function handleChange(event: any) {
		if (event.target) {
			setBotUrl(event.target.value);
			event.target.focus();
		}
	}

	const saveBotWs = useCallback(() => {
		if (botUrl.slice(0, 5) === "ws://" || botUrl.slice(0, 6) === "wss://") {
			if (botUrl !== botWs) {
				changeBotWs(botUrl);
				toast(`Change to ${botUrl}`)
			}
		} else {
			setBotUrl(botWs || "");
			toast.error("Url must start with ws:// or wss://")
		}
	}, [botUrl, botWs, changeBotWs]);

	// useOutsideAlerter(botWsInputRef, saveBotWs);

	return (
		<div
			data-theme={darkMode ? "dark" : "light"}
			className={`flex flex-col items-center w-full h-screen bg-base-100 text-xs xl:text-base ${
				darkMode && "dark"
			}`}
		>
			<div className="w-full h-12 flex items-center justify-around">
				<div className="flex items-center">
					<img
						alt="logo"
						src="/Transparent-Logo-Only-930x1024.png"
						className="logo"
						width={50}
						height={50}
					/>
					<h1>SOLANA JUPITER BOT</h1>
				</div>
				<div className="flex items-center space-x-2">
					<input type="text" ref={botWsInputRef} value={botUrl} onBlur={saveBotWs} onChange={handleChange} className="input input-ghost w-full input-xs max-w-xs"/>
					<button onClick={() => changeLatency(!showLatency)}>
						<ClockIcon className="w-5 h-5"/>
					</button>
					<button onClick={() => changeProfit(!showProfit)}>
						<ChartBarIcon className="w-5 h-5"/>
					</button>
					<button onClick={() => changeDarkMode(!darkMode)}>
						<MoonIcon className="w-5 h-5"/>
					</button>
					<button onClick={() => changeNoFeeError(!noFeeError)}>
						{noFeeError ? <MagnifyingGlassMinusIcon className="w-5 h-5"/> : <MagnifyingGlassPlusIcon className="w-5 h-5"/>}
					</button>
					{connected ? (
						<CheckCircleIcon className="text-success w-8 h-8"/>
					) : (
						<XCircleIcon className="text-error  w-8 h-8"/>
					)}
				</div>
			</div>
			<div className="flex items-center flex-col space-y-2 py-4 w-10/12 justify-center">
				<Top/>
				<Main/>
				{showLatency && <LatencyChart/>}
				{showProfit && <ProfitChart/>}
				<Trades/>
				<Messages/>
			</div>
			<EditModal/>
			<ToastContainer theme={darkMode ? "dark" : "light"} position="bottom-right"/>
		</div>
	);
};

export default App;
