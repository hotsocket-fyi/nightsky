import { AtURI } from "@/lib.ts";
import { blobToURL, FeedItem } from "../../support/bsky.ts";
import DescriptionText from "../bits/DescriptionText.tsx";

// i have decided to make this a perfect little angel with no recursion. don't fuck this up for me PLEASE
export default function PostView({ item, clickable }: { item: FeedItem; clickable: boolean }) {
	if ("error" in item.post) {
		const error = item.post;
		return (
			<div class="post-view error">
				Error loading post: {error.error}: {error.message}
			</div>
		);
	} else {
		const date = <span class="post-date">{new Date(item.post.value.createdAt).toLocaleString()}</span>;
		return (
			<div class="post-view">
				<div class="post-header">
					<img src={blobToURL(item.author.doc, item.author.profile.avatar)} class="avatar post-avatar" />
					<div class="post-header-text">
						<span class="post-header-name">{item.author.profile.displayName}</span>
						{clickable
							? (
								<span class="post-header-handle">
									<a href={`/profile/${item.author.doc.did}`}>@{item.author.doc.handle}</a>
								</span>
							)
							: date}
					</div>
					{clickable
						? (
							<a href={`/profile/${item.author.doc.did}/post/${new AtURI(item.post.uri).rkey!}`} class="post-date">
								{date}
							</a>
						)
						: date}
				</div>
				<div class="post-content">
					{item.post.value.text && <DescriptionText class="post-text" text={item.post.value.text} />}
				</div>
			</div>
		);
	}
}
