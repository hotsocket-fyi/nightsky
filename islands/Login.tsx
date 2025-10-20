import { useRef, useState } from "preact/hooks";
import Modal from "../components/bits/Modal.tsx";
import Button from "../components/bits/Button.tsx";
import { client, LoginState } from "../support/bsky.ts";
import { IS_BROWSER } from "fresh/runtime";

export default function Login() {
	const [modal, setModalState] = useState(false);
	const idRef = useRef<HTMLInputElement>(null);
	const passRef = useRef<HTMLInputElement>(null);
	if (!IS_BROWSER) return null;

	async function handleSubmit(ev: SubmitEvent) {
		ev.preventDefault();
		const form = ev.target as HTMLFormElement;
		const data = new FormData(form);
		idRef.current!.classList.remove("caution");
		passRef.current!.classList.remove("caution");
		const id = data.get("id") as string;
		const pass = data.get("pass") as string;
		if (!id) {
			idRef.current!.classList.add("caution");
			return;
		}
		if (!pass) {
			passRef.current!.classList.add("caution");
			return;
		}
		try {
			await client.login(id, pass);
			setModalState(false);
		} catch (e) {
			console.error(e);
		}
	}
	return (
		<>
			<Button
				onClick={() => {
					setModalState(true);
				}}
				disabled={client.loginState.value == LoginState.RESUMING}
			>
				Log In
			</Button>
			<Modal
				openModal={modal}
				closeModal={() => {
					setModalState(false);
				}}
			>
				<form onSubmit={handleSubmit}>
					<label for="id">Handle/DID</label>
					<input type="text" name="id" ref={idRef} autocomplete="username" required />
					<label for="pass">Password</label>
					<input type="password" name="pass" ref={passRef} autocomplete="current-password" required />
					<button type="submit">HIT IT</button>
				</form>
			</Modal>
		</>
	);
}
