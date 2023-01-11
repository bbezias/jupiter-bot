import { useSocketProvider } from "./SocketProvider";
import Moment from 'react-moment';
import { buildExplorerUrl } from '../utils';
import { CheckCircleIcon, ExclamationCircleIcon, PrinterIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useParamsProvider } from './ParameterProvider';

export function Trades() {
	const { tradeHistory } = useSocketProvider();
	const { noFeeError } = useParamsProvider();

	return (
		<div
			className="font-mono flex w-full space-y-2 items-center flex-col bg-base-200 rounded-xl p-4 max-h-[400px] overflow-y-auto">
			<table className="overflow-x-auto w-full table table-compact">
				<thead>
				<tr>
					<td></td>
					<td>TIMESTAMP</td>
					<td>SIDE</td>
					<td>IN</td>
					<td>OUT</td>
					<td>PROFIT</td>
					<td>EXP. OUT</td>
					<td>EXP. PROFIT</td>
					<td>FEE</td>
					<td>ERROR</td>
				</tr>
				</thead>
				<tbody>
				{tradeHistory.filter((item) => noFeeError || (item.fee && item.fee > 0) || item.status !== 'error').map((trade, index) =>
					<tr key={`t-${index}`}>
						<td className="w-[24px]">
							{trade.status === "processing" && <TruckIcon className="text-primary h-[18px] w-[18px]"/> }
							{trade.status === "confirmed" && <PrinterIcon className="text-success h-[18px] w-[18px]"/> }
							{trade.status === "completed" && <CheckCircleIcon className="text-success h-[18px] w-[18px]"/> }
							{trade.status === "error" && <ExclamationCircleIcon className="text-error h-[18px] w-[18px]"/> }
						</td>
						<td><Moment format="HH:mm:ss">{new Date(trade.date)}</Moment>
						</td>
						{trade.txId ? <td>
							<a className="link link-primary" href={buildExplorerUrl('tx', trade.txId as string)} rel="noreferrer"
								 target="_blank">{trade.buy ? "BUY" : "SELL"}</a>
						</td> :
							<td>
						{trade.buy ? "BUY" : "SELL"}
							</td>}
						<td>{trade.inputToken}</td>
						<td>{trade.outputToken}</td>
						<td>{!trade.profit ? "0" : trade.profit?.toFixed(2)}</td>
						<td>{trade.expectedOutAmount}</td>
						<td>{trade.expectedProfit.toFixed(2)}%</td>
						<td>{trade.fee ? trade.fee.toFixed(6): ""}</td>
						<td>
							{trade.error &&
									<div className="tooltip tooltip-left z-50 tooltip-secondary" data-tip={trade.error}>
								{trade.errorType}
							</div>}
						</td>
					</tr>
				)}
				</tbody>
			</table>
		</div>
	);
}
