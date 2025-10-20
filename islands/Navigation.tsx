import Login from "./Login.tsx";
import { client, LoginState } from "../support/bsky.ts";
import { IS_BROWSER } from "fresh/runtime";
import SessionManager from "./SessionManager.tsx";
import PostComposer from "./PostComposer.tsx";
import { useEffect, useState } from "preact/hooks";
import { contextActions } from "../signals/context.ts";

import "preact/debug";
import VisitProfileAction from "./VisitProfileAction.tsx";
import { GithubLink } from "../routes/api/getSponsorInfo.tsx";
import GithubSetupAction from "./GithubSetupAction.tsx";
import AT from "@/index.ts";
import { XError } from "@/lib.ts";
//const ghlink = await ;
/*
{
  "gist": "611d6f396f3c85f771a6ff479461ada1",
  "$type": "pro.hotsocket.nightsky.github",
  "login": "hotsocket-fyi"
}
 */
export function Navigation() {
	const [actions, setActions] = useState(contextActions.value);
	const [github, setGithub] = useState<AT.pro.hotsocket.nightsky.github | XError>();

	useEffect(() => {
		return contextActions.subscribe((value) => {
			setActions(value);
		});
	}, []);
	useEffect(() => {
		const unsubscribe = client.loginState.subscribe(async (value) => {
			if (value == LoginState.LOGGED_IN) {
				const record = await AT.com.atproto.repo.getRecord<AT.pro.hotsocket.nightsky.github>(
					new URL("https://slingshot.microcosm.blue/"),
					{
						repo: client.miniDoc!.did,
						collection: "pro.hotsocket.nightsky.github",
						rkey: "self",
					},
				);
				console.log(record);
				if ("error" in record) {
					setGithub(record as XError);
				} else {
					setGithub(record.value);
				}
			}
		});
		return unsubscribe;
	}, []);

	if (!IS_BROWSER) return <nav></nav>;
	return (
		<nav>
			<h1>Nightsky</h1>
			{"actions"}
			<PostComposer />
			<VisitProfileAction />
			<br />
			{actions && (
				<>
					{"context actions"} {actions} <br />
				</>
			)}
			{"settings"}
			{client.loginState.value == LoginState.LOGGED_IN ? <SessionManager /> : <Login />}
			{github && "error" in github && <GithubSetupAction />}

			<a href="https://github.com/hotsocket-fyi/nightsky" target="_blank" class="source-code-link">Source Code</a>
		</nav>
	);
}
