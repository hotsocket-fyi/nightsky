// from https://medium.com/@dimterion/modals-with-html-dialog-element-in-javascript-and-react-fb23c885d62e

import { useEffect, useRef } from "preact/hooks";
import { ComponentChildren } from "preact";

function Modal(
	{ openModal, closeModal, children, title }: {
		openModal: boolean;
		closeModal: () => void;
		title?: string;
		children?: ComponentChildren;
	},
) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (openModal && ref.current) {
			ref.current.showModal();
		} else if (ref.current) {
			ref.current.close();
		}
	}, [openModal]);

	return (
		<dialog ref={ref} onCancel={closeModal}>
			<div class="content">
				<div class="top">
					<span class="title">{title}</span>
					<button type="button" onClick={closeModal} class="close">
						Close
					</button>
				</div>
				{children}
			</div>
		</dialog>
	);
}

export default Modal;
