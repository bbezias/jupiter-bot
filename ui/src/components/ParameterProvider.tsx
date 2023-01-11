import { ReactNode, createContext, useContext, useState, useCallback, useEffect } from "react";
import { ConfigEditType } from './EditModal';

type Params = {
	botWs?: string;
	showLatency: boolean;
	changeLatency: (value: boolean) => void;
	showProfit: boolean;
	changeProfit: (value: boolean) => void;
	darkMode: boolean;
	changeDarkMode: (value: boolean) => void;
	showEdit: boolean;
	noFeeError: boolean;
	setShowEdit: (value: boolean) => void;
	changeBotWs: (value: string) => void;
	changeNoFeeError: (value: boolean) => void;
	editModalType?: ConfigEditType;
	setEditModalType: (value: ConfigEditType) => void;
};

type ParamsProps = { children: ReactNode };
export const ParamsContext = createContext<Params | undefined>(undefined);

export function ParamsProvider({ children }: ParamsProps) {
	const [botWs, setBotWs] = useState<string>();
	const [darkMode, setDarkMode] = useState<boolean>(false);
	const [noFeeError, setNoFeeError] = useState<boolean>(true);
	const [showEdit, setShowEdit] = useState<boolean>(false);
	const [showLatency, setShowLatency] = useState<boolean>(false);
	const [showProfit, setShowProfit] = useState<boolean>(true);
	const [editModalType, setEditModalType] = useState<ConfigEditType>();

	const changeLatency = useCallback((value: boolean) => {
		window.localStorage.setItem("show-latency", value ? 'true' : 'false');
		setShowLatency(value);
	}, []);

	const changeProfit = useCallback((value: boolean) => {
		window.localStorage.setItem("show-profit", value ? 'true' : 'false');
		setShowProfit(value);
	}, []);

	const changeDarkMode = useCallback((value: boolean) => {
		window.localStorage.setItem("dark-mode", value ? 'true' : 'false');
		setDarkMode(value);
	}, []);

	const changeNoFeeError = useCallback((value: boolean) => {
		window.localStorage.setItem("no-fee-error", value ? 'true' : 'false');
		setNoFeeError(value);
	}, []);

	const changeBotWs = useCallback((value: string) => {
		window.localStorage.setItem("url", value);
		setBotWs(value);
	}, []);

	useEffect(() => {

		let value = window.localStorage.getItem("url");
		if (!value) {
			setBotWs("ws://localhost:3002");
		} else {
			setBotWs(value);
		}

		value = window.localStorage.getItem("show-latency");
		if (!value || value === 'false') {
			setShowLatency(false);
		} else {
			setShowLatency(true);
		}

		value = window.localStorage.getItem("show-profit");
		if (!value || value === 'false') {
			setShowProfit(false);
		} else {
			setShowProfit(true);
		}

		value = window.localStorage.getItem("dark-mode");
		if (!value || value === 'false') {
			setDarkMode(false);
		} else {
			setDarkMode(true);
		}

		value = window.localStorage.getItem("no-fee-error");
		if (!value || value === 'false') {
			setNoFeeError(false);
		} else {
			setNoFeeError(true);
		}
	}, [])

	const resp: Params = {
		botWs,
		changeBotWs,
		showLatency,
		changeLatency,
		changeProfit,
		showProfit,
		darkMode,
		changeDarkMode,
		editModalType,
		setEditModalType,
		showEdit, setShowEdit,
		noFeeError, changeNoFeeError
	};

	return (
		<ParamsContext.Provider value={resp}>{children}</ParamsContext.Provider>
	);
}

export function useParamsProvider() {
	const endpointContext = useContext(ParamsContext);
	if (endpointContext === undefined) {
		throw new Error(`useParamsProvider must be used within a ParamsProvider`);
	}
	return endpointContext;
}
