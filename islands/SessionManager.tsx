import { useState } from "preact/hooks";
import Modal from "../components/bits/Modal.tsx";
import Button from "../components/bits/Button.tsx";
import { client } from "../support/bsky.ts";
import { IS_BROWSER } from "fresh/runtime";

export default function SessionManager() {
	const [modal, setModalState] = useState(false);
	if (!IS_BROWSER) return null;
	return (
		<>
			<Button
				onClick={() => {
					setModalState(true);
				}}
			>
				Manage Session
			</Button>
			<Modal
				openModal={modal}
				closeModal={() => {
					setModalState(false);
				}}
			>
				<Button
					onClick={() => {
						client.logout();
						setModalState(false);
					}}
					class="caution"
				>
					Log Out
				</Button>
			</Modal>
		</>
	);
}
