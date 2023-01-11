import { useSocketProvider } from "./SocketProvider";
import { useEffect, useMemo, useState } from 'react';
import { toDecimal } from '../utils';
import numbro from 'numbro';
import { useParamsProvider } from './ParameterProvider';
import { ConfigEditType } from './EditModal';

export function Main() {
	const { config, data, tradeCounter, balances, execute, reverse, sim, tradeHistory } = useSocketProvider();
	const { setEditModalType, setShowEdit } = useParamsProvider();
	const [fees, setFees] = useState(0);
	const [inputTokenAmount, outputTokenAmount, simulatedProfit, minOut, decoration] =
		useMemo<[string, string, string, string, string]>(() => {
			if (!data) return ["0", "0", "0", "0", "text-primary"];

			let decoration = "text-primary";
			if (data.simulatedProfit >= 0) {
				decoration = "text-success";
			} else if (data.simulatedProfit < 0) {
				decoration = "text-error";
			}
			return [
				toDecimal(data.route.inAmount, data.inputToken.decimals),
				toDecimal(data.route.outAmount, data.outputToken.decimals),
				numbro(data.simulatedProfit).format({ mantissa: 4 }),
				toDecimal(data.route.otherAmountThreshold, data.outputToken.decimals),
				decoration
			]
		}, [data]);

	useEffect(() => {
		let fee = 0;
		for (const t of tradeHistory) {
			if (t.fee) fee += t.fee;
		}
		setFees(fee);
	}, [tradeHistory]);

	const balanceFormatted =
		useMemo<any>(() => {

			const decimalA = config ? config.tokenA.decimals : 0;
			const decimalB = config ? config.tokenB.decimals : 0;

			return {
				currentBalance: {
					tokenA: toDecimal(balances.currentBalance.tokenA, decimalA),
					tokenB: toDecimal(balances.currentBalance.tokenB, decimalB),
				},
				initBalance: {
					tokenA: toDecimal(balances.initBalance.tokenA, decimalA),
					tokenB: toDecimal(balances.initBalance.tokenB, decimalB),
				},
				lastBalance: {
					tokenA: toDecimal(balances.lastBalance.tokenA, decimalA),
					tokenB: toDecimal(balances.lastBalance.tokenB, decimalB),
				},
				profit: {
					tokenA: numbro(balances.profit.tokenA).format({ mantissa: 2, trimMantissa: false, thousandSeparated: true }),
					tokenB: numbro(balances.profit.tokenB).format({ mantissa: 2, trimMantissa: false, thousandSeparated: true }),
				},
			}
		}, [balances, config]);

	function openEditModal(type: ConfigEditType) {
		setEditModalType(type);
		setShowEdit(true);
	}

	return (
		<div
			className="font-mono flex w-full space-y-2 items-center flex-col bg-base-200 rounded-xl p-4 overflow-y-auto">
			<table className="w-full border-separate border-spacing-y-1">
				<tbody>
				<tr>
					<td>TRADING: {config && <span className="font-bold text-secondary">{config.tokenA.symbol}</span>}
						{" ->"} {config && <span className="font-bold text-secondary">{config.tokenB.symbol}</span>}</td>
					<td>ROUTES: {data && <span className="font-bold text-primary">{data.availableRoutes}</span>}</td>
					<td>STRATEGY: {config && <span className="font-bold text-secondary">{config.tradingStrategy}</span>}</td>
				</tr>
				<tr>
					<td>
						<div>BUY</div>
						<div>SUCCESS : <span className="text-success">{tradeCounter.buy.success}</span></div>
						<div>FAIL: <span className="text-error">{tradeCounter.buy.failWithFee} / {tradeCounter.buy.fail - tradeCounter.buy.failWithFee}</span></div>
					</td>
					<td>
						<div>SELL</div>
						<div>SUCCESS: <span className="text-success">{tradeCounter.sell.success}</span></div>
						<div>FAIL: <span className="text-error">{tradeCounter.sell.failWithFee} / {tradeCounter.sell.fail - tradeCounter.sell.failWithFee}</span></div>
					</td>
					<td>
						<div className="space-x-2">
							<button className="btn btn-primary" onClick={execute}> FORCE EXECUTION</button>
							<button className="btn btn-primary" onClick={reverse}> REVERSE SWAP</button>
							<button className="btn btn-primary" onClick={sim}>SIM MODE ON/OFF</button>
						</div>
					</td>
				</tr>
				<tr>
					<td>
						<div>IN: <span className="text-primary">&nbsp;{inputTokenAmount} </span>
							{data && <span className={`text-secondary`}>{data.inputToken.symbol} </span>}</div>
						<div>OUT: <span className={decoration}>{outputTokenAmount} </span>
							{data && <span className="text-secondary">{data.outputToken.symbol}</span>}</div>
						<div>PROFIT: <span className={decoration}>{simulatedProfit}% </span>
							{config && <span className="text-neutral">({config.minPercProfit}%)</span>}</div>
					</td>
					<td>
						<div>SLIPPAGE: {config && <label htmlFor="edit-modal" onClick={() => openEditModal("slippage")} className="text-secondary cursor-pointer">{config.slippage}</label>}</div>
						<div>MIN OUT: <span className="text-secondary">{minOut}</span></div>
						<div>W/UNWRAP SOL: <span className="text-secondary">{config && config.wrapUnwrapSOL ? "on" : "off"}</span></div>
					</td>
					<td>
						<div>FEE: <span className="text-secondary">{fees}</span></div>
					</td>
				</tr>
				<tr>
					<td>
						<div>CURRENT BALANCE</div>
						<div><span>{balanceFormatted.currentBalance.tokenA}</span> {config &&
				<span className="text-secondary">{config.tokenA.symbol}</span>}
						</div>
						{config && config.tradingStrategy === "pingpong" && <div><span>{balanceFormatted.currentBalance.tokenB}</span> {config &&
				<span className="text-secondary">{config.tokenB.symbol}</span>}</div>}
					</td>
					<td>
						<div>LAST BALANCE</div>
						<div><span>{balanceFormatted.lastBalance.tokenA}</span> {config &&
				<span className="text-secondary">{config.tokenA.symbol}</span>}</div>
						{config && config.tradingStrategy === "pingpong" &&
				<div><span>{balanceFormatted.lastBalance.tokenB}</span> {config &&
					<span className="text-secondary">{config.tokenB.symbol}</span>}
				</div>}
					</td>
					<td>
						<div>INIT BALANCE</div>
						<div>
							<span>{balanceFormatted.initBalance.tokenA}</span> {config && <span className="text-secondary">{config.tokenA.symbol}</span>}
						</div>
						{config && config.tradingStrategy === "pingpong" &&
				<div><span>{balanceFormatted.initBalance.tokenB}</span> {config &&
					<span className="text-secondary">{config.tokenB.symbol}</span>}
				</div>}
					</td>
					<td>
						<div>PROFIT</div>
						<div><span className={balances.profit.tokenA > 0 ? "text-success" : "text-error"}>{balanceFormatted.profit.tokenA}</span>
						</div>
						{config && config.tradingStrategy === "pingpong" &&
				<div><span className={balances.profit.tokenB > 0 ? "text-success" : "text-error"}>{balanceFormatted.profit.tokenB}</span> %
				</div>}
					</td>
					<td></td>
				</tr>
				</tbody>
			</table>
		</div>
	);
}
