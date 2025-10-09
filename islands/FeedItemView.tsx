import Button from "../components/bits/Button.tsx";
import PostView from "../components/views/PostView.tsx";
import { AtURI, LocalATRecord, localizeRecord } from "../support/atproto.ts";
import {
	client,
	Embed_Record,
	Embed_RecordMedia,
	// Embed_Video,
	// EmbedImageData,
	FeedItem,
	Like,
	LoginState,
	Post,
	RecordRef,
} from "../support/bsky.ts";
import Constellation from "../support/constellation.ts";
import PostComposer from "./PostComposer.tsx";
import { useEffect, useState } from "preact/hooks";

export type ChainOpts = {
	sameAuthor: boolean;
	shouldChain: boolean;
	chained?: boolean;
};

export default function FeedItemView({ item, chainOpts }: { item: FeedItem; chainOpts: ChainOpts }) {
	const [quote, setQuote] = useState<LocalATRecord<Post>>();
	const [chained, setChained] = useState<FeedItem>();
	const [likes, setLikes] = useState<number>(-1);
	const [myLike, setMyLike] = useState<AtURI>();
	const [altQuote, setAltQuote] = useState<string>();
	const chainedOpts: ChainOpts = {
		sameAuthor: chainOpts.sameAuthor,
		shouldChain: chainOpts.shouldChain,
		chained: true,
	};
	// if (!IS_BROWSER) return;
	let recordRef: RecordRef | undefined;
	// let media: EmbedImageData[] | Embed_Video | undefined;
	// let hasImages = false;
	// let hasVideo = false;
	if (item.post.value.embed) {
		// app.bsky.embed.[video]
		const lastPart = item.post.value.embed.$type.substring(item.post.value.embed.$type.lastIndexOf(".") + 1);
		// recordWithMedia is weird and annoying like just have a separate media field at that point
		// hasImages = lastPart == "images" || (lastPart == "recordWithMedia" && "images" in item.post.value.embed);
		// hasVideo = lastPart == "video" || (lastPart == "recordWithMedia" && "video" in item.post.value.embed);
		if (lastPart.startsWith("record")) {
			// wow! this is stupid!
			if (item.post.value.embed.$type == "app.bsky.embed.recordWithMedia") {
				recordRef = (item.post.value.embed as Embed_RecordMedia).record.record;
			} else if (item.post.value.embed.$type == "app.bsky.embed.record") {
				recordRef = (item.post.value.embed as Embed_Record).record;
			}
		}
	}
	useEffect(() => {
		// grab embed record
		(async () => {
			try {
				if (recordRef) {
					const uri = AtURI.fromString(recordRef.uri);
					if (uri.collection == "app.bsky.feed.post") {
						setQuote(await client.getRecord(recordRef));
					} else {
						console.warn(`hey dumbass you gotta add support for ${uri.collection} in FeedItemView at some point`);
						setAltQuote(uri.collection!);
					}
				}
			} catch (error) {
				console.error("Error loading quote:", error);
			}
		})();
		// grab next post in chain
		(async () => {
			try {
				if (chainOpts.shouldChain) {
					const links = await Constellation.getLinks({
						target: item.post.uri,
						collection: "app.bsky.feed.post",
						path: ".reply.parent.uri",
						did: chainOpts.sameAuthor ? item.author.doc.did : undefined,
						limit: 1,
					});
					if (links.length > 0) {
						const record = await client.getRecord<Post>(links[0]);
						const author = await client.getAccount(record.uri.authority!);
						setChained({ author: author, post: record });
					}
				}
			} catch (error) {
				console.error("Error loading chained post:", error);
			}
		})();
		// grab like count
		(async () => {
			const count = await Constellation.countLinks({
				target: item.post.uri,
				collection: "app.bsky.feed.like",
				path: ".subject.uri",
			});
			setLikes(count);
		})();
	}, []);
	useEffect(() => {
		if (client.loginState.value == LoginState.LOGGED_IN) {
			// grab own like record
			(async () => {
				const like = await Constellation.getLinks({
					target: item.post.uri,
					collection: "app.bsky.feed.like",
					path: ".subject.uri",
					did: client.miniDoc!.did,
					limit: 1,
				});
				if (like.length > 0) {
					setMyLike(like[0]);
				}
			})();
		}
	}, [client.loginState]);
	async function likePost() {
		if (myLike) {
			await client.deleteRecord(myLike);
			setMyLike(undefined);
			setLikes(likes - 1);
		} else {
			const newRecord = await client.createRecord({
				repo: client.miniDoc!.did,
				collection: "app.bsky.feed.like",
				record: {
					$type: "app.bsky.feed.like",
					createdAt: new Date().toISOString(),
					subject: {
						uri: item.post.uri.toString()!,
						cid: item.post.cid,
					} as RecordRef,
				} as Like,
			});
			setMyLike(AtURI.fromString(newRecord.uri));
			setLikes(likes + 1);
		}
	}
	const classNames: string[] = ["feed-item"];
	if (chainOpts.chained) {
		classNames.push("chained");
	}
	return (
		<div className={classNames.join(" ")}>
			<PostView clickable item={item} />
			{quote != undefined && (
				<div class="quote quote-post">
					<PostView clickable item={{ post: localizeRecord(quote), author: item.author }} />
				</div>
			)}
			{altQuote != undefined && (
				<div class="quote quote-alt mini-card">
					(unsupported {altQuote})
				</div>
			)}
			<div class="post-controls">
				<PostComposer reply={item} />
				<PostComposer quote={item} />
				<Button
					disabled={client.loginState.value != LoginState.LOGGED_IN}
					onClick={likePost}
					className={`post-like ${myLike ? "liked" : ""}`}
				>
					{`${likes < 0 ? "?" : likes.toLocaleString()} like${likes > 1 ? "s" : ""}`}
				</Button>
			</div>
			{chained && <FeedItemView chainOpts={chainedOpts} item={chained} />}
		</div>
	);
}
