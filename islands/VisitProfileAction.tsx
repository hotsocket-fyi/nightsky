import { useState } from "preact/hooks";
import Button from "../components/bits/Button.tsx";
import Form from "../components/bits/Form.tsx";
import Modal from "../components/bits/Modal.tsx";
import Slingshot from "../support/slingshot.ts";
import { XError } from "../support/bsky.ts";

export default function VisitProfileAction() {
	const [modal, setModalState] = useState(false);
	const [message, setMessage] = useState("");
	async function visitProfile(data: FormData) {
		const destination = data.get("destination");
		if (!destination) {
			setMessage("You must enter a destination profile!");
			return;
		}
		const doc = await Slingshot.resolveMiniDoc(destination as string);
		if ("error" in doc) {
			setMessage((doc as unknown as XError).message ?? "(no mesage)");
		} else {
			location.href = new URL(`/profile/${doc.did}`, location.href).toString();
		}
	}
	return (
		<>
			<Button
				onClick={() => {
					setModalState(true);
				}}
			>
				Visit Profile
			</Button>
			<Modal
				title="Visit Profile"
				openModal={modal}
				closeModal={() => {
					setModalState(false);
				}}
			>
				<Form class="visit-form" onSubmit={visitProfile}>
					<input name="destination" class="visit-destination" placeholder="Handle or DID" required />
					<button type="submit">Go!</button>
				</Form>
				<span class="message visit-message">{message}</span>
			</Modal>
		</>
	);
}
