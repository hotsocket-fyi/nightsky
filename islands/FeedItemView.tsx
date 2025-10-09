import PostView from "../components/views/PostView.tsx";
import { ATRecord, AtURI } from "../support/atproto.ts";
import {
	client,
	Embed_Record,
	Embed_RecordMedia,
	// Embed_Video,
	// EmbedImageData,
	FeedItem,
	Post,
	RecordRef,
} from "../support/bsky.ts";
import PostComposer from "./PostComposer.tsx";
import { useEffect, useState } from "preact/hooks";

export default function FeedItemView({ item }: { item: FeedItem }) {
	const [quote, setQuote] = useState<ATRecord<Post>>();
	const [altQuote, setAltQuote] = useState<string>();
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
		(async () => {
			if (recordRef) {
				const uri = AtURI.fromString(recordRef.uri);
				if (uri.collection == "app.bsky.feed.post") {
					setQuote(await client.getRecord(recordRef));
				} else {
					console.warn(`hey dumbass you gotta add support for ${uri.collection} in FeedItemView at some point`);
					setAltQuote(uri.collection!);
				}
			}
		})();
	}, []);
	return (
		<div class="feed-item">
			<PostView item={item} />
			{quote != undefined && (
				<div class="quote quote-post">
					<PostView item={{ post: quote, author: item.author }} />
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
				<hr />
			</div>
		</div>
	);
}
