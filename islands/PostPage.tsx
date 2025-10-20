import { IS_BROWSER } from "fresh/runtime";
import { useEffect, useMemo, useState } from "preact/hooks";
import { client } from "../support/bsky.ts";
import { contextActions } from "../signals/context.ts";
import PostFeed from "./PostFeed.tsx";
import { PostActions } from "./actions/PostActions.tsx";
import { AtURI } from "@/lib.ts";

export default function PostPage({ did, id }: { did: string; id: string }) {
	useEffect(() => {
		contextActions.value = <PostActions />;
	}, [did, id]);
	const generator = useMemo(() => client.threadFeed(new AtURI(did, "app.bsky.feed.post", id)), [IS_BROWSER, did, id]);
	if (IS_BROWSER) {
		return <PostFeed generator={generator!} config={{ isPostPage: true }} />;
	}
}
