import { useSocketProvider } from "./SocketProvider";
import { useEffect, useRef } from 'react';
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

export function LatencyChart() {
	const { data } = useSocketProvider();
	const chartRef = useRef<HighchartsReact.RefObject>(null);
	const optionRef = useRef<Highcharts.Options>({
		title: { text: "" },
		yAxis: { title: { text: "" } },
		tooltip: {enabled: false},
		chart: {backgroundColor: "transparent"},
		xAxis: {labels: {enabled: false}},
		series: [{
			type: 'line',
			marker: {enabled: false, states: {hover: {enabled: false}}},
			showInLegend: false,
			color: '#570DF8',
			label: {enabled: false},
			data: Array(20).fill(0),
		}], credits: { enabled: false }
	})

	useEffect(() => {
		if (data) {
			const c = (chartRef.current as any).chart;
			c.series[0].addPoint(data.performanceOfRouteComp, true, true);
		}
	}, [data]);

	useEffect(() => {
		const c = (chartRef.current as any).chart;
		c.reflow();
	}, []);

	return (
		<div
			className="font-mono flex w-full space-y-2 items-center flex-col bg-base-200 rounded-xl p-4 overflow-y-auto relative">
			<div className="absolute">LATENCY</div>
			<HighchartsReact
				height={30}
				ref={chartRef}
				highcharts={Highcharts}
				options={optionRef.current}
				containerProps={{ style: { width: "100%", height: "150px" } }}
			/>
		</div>
	);
}
