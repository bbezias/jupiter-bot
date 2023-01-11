import { useSocketProvider } from "./SocketProvider";
import { useParamsProvider } from './ParameterProvider';
import { useState } from 'react';

export type ConfigEditType = 'slippage' | 'additionalFee';

export function EditModal() {
	const { config } = useSocketProvider();
	const [value, setValue] = useState('');
	const { editModalType, showEdit, setShowEdit } = useParamsProvider();

	function save(event: any) {
		event.preventDefault();
		closeModal();
	}

	function handleChange(event: any) {
		console.log(event.target);
    if (event.target) setValue(event.target.value);
  }

	function clickInside(ev: any) {
		ev.stopPropagation();
	}

	function closeModal() {
		setValue("");
		setShowEdit(false);
	}

	return (
		<label htmlFor="edit-modal" onClick={closeModal} className={`modal ${showEdit && 'modal-open'}`}>
			<div onClick={clickInside} className="modal-box relative space-y-2">
				<h3 className="font-bold text-lg">{editModalType}</h3>
				<input type="text" value={value} onChange={handleChange} className="input input-bordered input-secondary w-full max-w-xs" />
				<div className="modal-action">
					<button onClick={save} className="btn">Save</button>
				</div>
			</div>
		</label>
	);
}
