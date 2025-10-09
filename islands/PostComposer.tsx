import { useEffect, useRef, useState } from "preact/hooks";
import Modal from "../components/bits/Modal.tsx";
import Button from "../components/bits/Button.tsx";
import {
	Blob,
	client,
	Embed_Images,
	Embed_Record,
	Embed_RecordMedia,
	Embed_Video,
	FeedItem,
	LoginState,
	Post,
	Post_ReplyRef,
} from "../support/bsky.ts";
import { IS_BROWSER } from "fresh/runtime";
import Form from "../components/bits/Form.tsx";
import Attachinator from "./Attachinator.tsx";
import { assert } from "@std/assert";
import PostView from "../components/views/PostView.tsx";
import { JSX } from "preact/jsx-runtime";
import constellation from "../support/constellation.ts";

export default function PostComposer({ reply, quote }: { reply?: FeedItem; quote?: FeedItem }) {
	const [modal, setModalState] = useState(false);
	const [quoteCount, setQuoteCount] = useState<number>();
	const [files, setFiles] = useState<File[]>([]);
	const composerRef = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		(async () => {
			if (quote) {
				setQuoteCount(
					await constellation.countLinks({
						target: quote.post.uri,
						collection: "app.bsky.feed.post",
						path: ".embed.record.uri",
					}),
				);
			}
		})();
	}, []);
	if (!IS_BROWSER) return null;

	async function createPost(data: FormData) {
		const text = data.get("text") as string;
		console.log(text);
		console.log(files);
		const isVideo = files[0].type.startsWith("video/");
		if (isVideo) assert(files.length == 1);
		const remoteBlobs: Blob[] = [];
		for (const file of files) {
			remoteBlobs.push(await client.uploadBlob(URL.createObjectURL(file)));
		}
		let postReply: Post_ReplyRef | undefined;
		if (reply) {
			//@ts-ignore deno-ts(2739) calm down bud im getting to it
			postReply = {};
			if (reply.post.value.reply) {
				postReply!.root = reply.post.value.reply.root;
			} else {
				postReply!.root = {
					cid: reply.post.cid,
					uri: reply.post.uri,
				};
			}
			postReply!.parent = {
				cid: reply.post.cid,
				uri: reply.post.uri,
			};
		}
		const wipPost: Post = {
			$type: "app.bsky.feed.post",
			createdAt: new Date().toISOString(),
			text: composerRef.current!.value,
			reply: postReply,
			langs: [navigator.language.substring(0, 2) ?? "en"],
		};
		let toEmbed: Embed_Images | Embed_Video | undefined;
		if (files.length > 0) {
			if (isVideo) {
				toEmbed = {
					$type: "app.bsky.embed.video",
					video: remoteBlobs[0],
				} as Embed_Video;
			} else {
				toEmbed = {
					$type: "app.bsky.embed.images",
					images: remoteBlobs.map((b) => {
						return { image: b, alt: "" };
					}),
				} as Embed_Images;
			}
		}
		if (quote) {
			const postQuote: Embed_Record = {
				$type: "app.bsky.embed.record",
				record: {
					cid: quote.post.cid,
					uri: quote.post.uri,
				},
			};
			// ewwww i stepped in something
			if (files.length > 0) {
				wipPost.embed = {
					$type: "app.bsky.embed.recordWithMedia",
					record: postQuote,
					media: toEmbed,
				} as Embed_RecordMedia;
			} else {
				wipPost.embed = postQuote;
			}
		} else if (toEmbed) {
			wipPost.embed = toEmbed;
		}
		await client.createPost(wipPost);
		if (quote) {
			setQuoteCount((quoteCount ?? 0) + 1);
		}
		setModalState(false);
	}
	let replyView: JSX.Element | undefined;
	if (reply) replyView = <PostView item={reply} />;
	if (quote) replyView = <PostView item={quote} />;
	return (
		<>
			<Button
				disabled={client.loginState.value != LoginState.LOGGED_IN}
				onClick={() => {
					setModalState(true);
				}}
			>
				{reply ? "Reply" : (quote ? (quoteCount ? `${quoteCount} Quotes` : "Quote") : "Compose Post")}
			</Button>
			<Modal
				title={reply ? "Reply Composer" : (quote ? "Quote Composer" : "Post Composer")}
				openModal={modal}
				closeModal={() => {
					setModalState(false);
				}}
			>
				{replyView}
				<Form
					onSubmit={createPost}
				>
					<textarea maxlength={300} name="text" ref={composerRef} />
					<br />
					<Attachinator files={files} setFiles={setFiles} />
					<button type="submit">Post!</button>
				</Form>
			</Modal>
		</>
	);
}
