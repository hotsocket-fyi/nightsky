import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { FeedGenerator, FeedItem } from "../support/bsky.ts";
import FeedItemView, { ChainOpts } from "./FeedItemView.tsx";

export type FeedConfig = {
	isPostPage?: boolean;
};

export default function PostFeed(
	{ generator, config = { isPostPage: false } }: { generator: FeedGenerator; config?: FeedConfig },
) {
	const [posts, setPosts] = useState<FeedItem[]>([]);
	const [isDone, setIsDone] = useState(false);
	const [isProfile, setIsProfile] = useState(false);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const loading = useRef(false);

	useEffect(() => {
		setPosts([]);
		// drops ""
		const pathParts = location.pathname.split("/").filter((x) => x);
		setIsProfile(pathParts.length == 2 && pathParts[0] == "profile");
		setIsDone(false);
	}, [generator]);

	const loadMorePosts = useCallback(async () => {
		if (loading.current || isDone) return;
		loading.current = true;

		try {
			const newPosts: FeedItem[] = [];
			for (let i = 0; i < 10; i++) {
				const { value, done } = await generator.next();
				if (done) {
					setIsDone(true);
					break;
				}
				if (value) {
					newPosts.push(value);
				}
			}

			if (newPosts.length > 0) {
				setPosts((prevPosts) => [...prevPosts, ...newPosts]);
			}
		} catch (error) {
			console.error("Error loading more posts:", error);
		} finally {
			loading.current = false;
		}
	}, [generator, isDone]);

	useEffect(() => {
		if (isDone) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadMorePosts();
				}
			},
			{ rootMargin: "200px" },
		);

		const sentinel = sentinelRef.current;
		if (sentinel) {
			observer.observe(sentinel);
		}

		return () => {
			if (sentinel) {
				observer.unobserve(sentinel);
			}
		};
	}, [loadMorePosts, isDone]);

	return (
		<div class="post-feed">
			{posts.map((item, idx) => {
				const opts: ChainOpts = {
					sameAuthor: isProfile,
					shouldChain: !(config.isPostPage && idx == 0),
				};
				return <FeedItemView key={item.post.uri} item={item} chainOpts={opts} />;
			})}
			{!isDone && <div ref={sentinelRef} style={{ height: "1px" }} />}
		</div>
	);
}
