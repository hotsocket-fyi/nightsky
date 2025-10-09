import { blobToURL, FeedItem, XError } from "../../support/bsky.ts";
import DescriptionText from "../bits/DescriptionText.tsx";

// i have decided to make this a perfect little angel with no recursion. don't fuck this up for me PLEASE
export default function PostView({ item }: { item: FeedItem }) {
	if ("error" in item.post) {
		const error = item.post as XError;
		return (
			<div class="post-view error">
				Error loading post: {error.error}: {error.message}
			</div>
		);
	} else {
		return (
			<div class="post-view">
				<div class="post-header">
					<img src={blobToURL(item.author.doc, item.author.profile.avatar)} class="avatar post-avatar" />
					<div class="post-header-text">
						<span class="post-header-name">{item.author.profile.displayName}</span>
						<span class="post-header-handle">@{item.author.doc.handle}</span>
					</div>
					<span class="post-date">{new Date(item.post.value.createdAt).toLocaleString()}</span>
				</div>
				<div class="post-content">
					{item.post.value.text && <DescriptionText class="post-text" text={item.post.value.text} />}
				</div>
			</div>
		);
	}
}
