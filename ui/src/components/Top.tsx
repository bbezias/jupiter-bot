import { useSocketProvider } from "./SocketProvider";
import Moment from 'react-moment';
import numbro from 'numbro';

export function Top() {
	const { data, config, initData, pingTime } = useSocketProvider();

	return (
		<div
			className="font-mono flex w-full space-y-2 items-center flex-col bg-base-200 rounded-xl p-4 overflow-y-auto">
			<table className="w-full border-separate border-spacing-y-1 table-fixed">
				<tbody>
				<tr className="w-1/3">
					<td>TIMESTAMP: {data && <span className="font-bold text-secondary">
							<Moment format="YYYY-MM-DD HH:mm:ss">{new Date(data.date)}</Moment>
					</span>}
					</td>
					<td className="w-1/3">I: {data && <span className="font-bold text-secondary">{data.i}</span>} |
						{data && <span className="font-bold text-secondary">{data.iterationPerMinute}</span>} i/min
					</td>
					<td className="w-1/3">RPC: {config &&
			  <div className="tooltip tooltip-top z-50 absolute tooltip-secondary" data-tip={config && config.rpc && config.rpc[0] ? config.rpc[0] : "No RPC yet"}>
					{config && config.rpc && config.rpc[0] && <span className="font-bold text-secondary break-words">{config.rpc[0].slice(8, 17)}...{config.rpc[0].slice(-5)}</span>}
			  </div>}
					</td>
				</tr>
				<tr className="w-1/3">
					<td>
						<div>STARTED: <span className="font-bold text-secondary">
					{initData ? <Moment fromNow={true}>{new Date(initData.startTime)}</Moment> : <span>Not started</span>}
					</span></div>
						{data && !data.tradingEnabled && <div className="font-bold text-info">SIMULATION MODE</div>}
					</td>
					<td className="w-1/3">
						<div>LOOKUP (ROUTE): {data &&
				<span className="font-bold text-secondary">
					{numbro(data.performanceOfRouteComp).format({ mantissa: 0 })}</span>} ms
						</div>
						<div>ROUTE: {data && data.routeStr &&
				<span className="font-bold text-secondary whitespace-nowrap">{data.routeStr}</span>}
						</div>
					</td>
					<td className="w-1/3">MIN INTERVAL: {config &&
			  <span className="font-bold text-secondary break-words">{config.minInterval} </span>}
						ms QUEUE: {data && <span className="font-bold text-secondary break-words">{data.queue}</span>} /
						{config && <span className="font-bold text-secondary break-words"> {config.queueThrottle}</span>}
					</td>
				</tr>
				<tr className="w-1/3">
					<td>
						<div>LAST PING: <span className="font-bold text-secondary">
					{pingTime ? <Moment fromNow={true}>{pingTime}</Moment> : <span>Not received</span>}
					</span></div>
						{data && !data.tradingEnabled && <div className="font-bold text-info">SIMULATION MODE</div>}
					</td>
				</tr>
				</tbody>
			</table>
		</div>
	);
}
