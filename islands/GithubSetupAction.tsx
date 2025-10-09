import { useState } from "preact/hooks";
import Button from "../components/bits/Button.tsx";
import Form from "../components/bits/Form.tsx";
import Modal from "../components/bits/Modal.tsx";
import { client, XError } from "../support/bsky.ts";
import { GithubLink } from "../routes/api/getSponsorInfo.tsx";

export default function VisitProfileAction() {
	const [modal, setModalState] = useState(false);
	const [message, setMessage] = useState("");
	async function createGithubRecord(data: FormData) {
		const gist = data.get("gist");
		if (!gist) {
			setMessage("A gist URL is required.");
			return;
		}
		let url: URL;
		try {
			url = new URL(gist as string);
		} catch {
			setMessage("Invalid URL.");
			return;
		}
		if (url.hostname != "gist.github.com") {
			setMessage("Must be a link to gist.github.com.");
			return;
		}
		const parts = url.pathname.split("/");
		if (parts.length != 3) {
			setMessage("That URL doesn't look right.");
			return;
		}
		const record = {
			$type: "pro.hotsocket.nightsky.github",
			login: parts[1],
			gist: parts[2],
		} as GithubLink;
		const newRecord = await client.createRecord({
			repo: client.miniDoc!.did,
			collection: "pro.hotsocket.nightsky.github",
			rkey: "self",
			record: record,
		});
		if ("error" in newRecord) {
			const error = newRecord as XError;
			setMessage(`Failed to create linking record: "${error.error}: ${error.message ?? "(no message)"}"`);
			return;
		}
		// gotta wait for the slow-ass pds to catch up to our absolute SPEEeED
		setMessage("(Waiting to let PDS process record)");
		await new Promise((res, _) => setTimeout(res, 2000));
		const newInfo = await client.getSponsorInfo(client.miniDoc!.did, true);
		if ("error" in newInfo) {
			const error = newInfo as XError;
			setMessage(`Error verifying link: "${error.error}: ${error.message ?? "(no message)"}"`);
			await client.deleteRecord("pro.hotsocket.nightsky.github", "self");
			return;
		}
		if (!newInfo!.info.linked) {
			setMessage("Failed to link accounts. Did you input the right URL?");
			await client.deleteRecord("pro.hotsocket.nightsky.github", "self");
			return;
		}
		location.reload();
	}
	return (
		<>
			<Button
				onClick={() => {
					setModalState(true);
				}}
			>
				Link GitHub
			</Button>
			<Modal
				// the "GLU"e, if you will :P
				title="GitHub Link Utility"
				openModal={modal}
				closeModal={() => {
					setModalState(false);
				}}
			>
				<p>
					To link your GitHub account and show neat little badges on your profile, simply paste the following into a new
					gist with the name "_atproto", and paste the link into the form below:
				</p>
				<code>did={client.miniDoc!.did}</code>
				<Form class="github-form" onSubmit={createGithubRecord}>
					<input name="gist" class="github-gist" placeholder="Link to gist" required />
					<button type="submit">Go!</button>
				</Form>
				<span class="message visit-message">{message}</span>
			</Modal>
		</>
	);
}
