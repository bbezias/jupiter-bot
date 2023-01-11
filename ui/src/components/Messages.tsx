import { useSocketProvider } from "./SocketProvider";
import Moment from "react-moment";

export function Messages() {
	const { messages } = useSocketProvider();

	return (
		<div className="flex w-full space-y-2 items-center flex-col bg-base-200 rounded-xl p-4 overflow-y-auto min-h-[200px] max-h-[400px]">
			<h2>Messages</h2>
			{messages.map((d, i) => (
				<div
					className={`w-full space-x-2 border rounded-xl p-3 flex items-center ${
						d.type === "error" && "badge-error"
					} ${d.type === "success" && "badge-success"}`}
					key={i}
				>
					<div>
						<Moment format="hh:mm:ss">{new Date(d.time)}</Moment>
					</div>
					<div>{d.message}</div>
				</div>
			))}
		</div>
	);
}
