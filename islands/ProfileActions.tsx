import { IS_BROWSER } from "fresh/runtime";
import Button from "../components/bits/Button.tsx";
import { useEffect, useState } from "preact/hooks";
import { Account, client } from "../support/bsky.ts";
import { AtURI } from "../support/atproto.ts";

enum FollowStates {
	NONE = "Follow",
	FOLLOWS_YOU = "Follow back",
	FOLLOWING = "Following",
	MUTUALS = "Mutuals",
}

export function ProfileActions({ account }: { account: Account }) {
	const [following, setFollowing] = useState<AtURI | null>(null);
	const [follows, setFollows] = useState<AtURI | null>(null);
	const [ready, setReady] = useState(false);
	let followState = FollowStates.NONE;
	// figure out the relationship status
	useEffect(() => {
		(async () => {
			// skip if logged out
			if (!client.loginState.value) return;

			setReady(false);
			const followRecord = await client.getFollow(client.miniDoc!.did, account.doc.did);
			const followingRecord = await client.getFollow(account.doc.did);
			setFollows(followRecord);
			setFollowing(followingRecord);
			setReady(true);
		})();
	}, [account]);
	if (!IS_BROWSER) {
		return (
			<nav>
				<Button disabled>Follow</Button>
			</nav>
		);
	}
	if (following && follows) followState = FollowStates.MUTUALS;
	else if (following) followState = FollowStates.FOLLOWING;
	else if (follows) followState = FollowStates.FOLLOWS_YOU;

	const followClasses = ["follow-button"];
	switch (followState) {
		case FollowStates.FOLLOWING:
			followClasses.push("following");
			break;
		case FollowStates.FOLLOWS_YOU:
			followClasses.push("follows");
			break;
		case FollowStates.MUTUALS:
			followClasses.push("mutuals");
			break;
	}
	return (
		<>
			<Button
				disabled={!client.loginState.value || !ready}
				className={followClasses.join(" ")}
				onClick={async () => {
					if (followState == FollowStates.FOLLOWING) {
						await client.unfollow(following);
						setFollowing(null);
					} else {
						const newFollow = await client.follow(account.doc.did, following);
						setFollowing(newFollow);
					}
				}}
			>
				{followState}
			</Button>
		</>
	);
}
