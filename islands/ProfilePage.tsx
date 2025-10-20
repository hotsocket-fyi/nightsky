import { IS_BROWSER } from "fresh/runtime";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Account, blobToURL, client } from "../support/bsky.ts";
import DescriptionText from "../components/bits/DescriptionText.tsx";
import { ProfileActions } from "./ProfileActions.tsx";
import { contextActions } from "../signals/context.ts";
import MiniCard from "../components/bits/MiniCard.tsx";
import PostFeed from "./PostFeed.tsx";
import EgoBooster from "../egobooster.ts";
import { SponsorInfo } from "../routes/api/getSponsorInfo.tsx";

let observer: ResizeObserver | undefined;
export default function ProfilePage({ id }: { id: string }) {
	const [loading, setLoading] = useState(true);
	const [sponsorInfo, setSponsorInfo] = useState<SponsorInfo>();
	const [account, setAccount] = useState<Account>({} as Account);
	const [followers, setFollowers] = useState("(loading)");
	const avatarRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		async function doItAlreadyGodDamn() {
			setLoading(true);
			const acct = await client.getAccount(id);
			setAccount(acct);
			console.log(acct);
			acct.followers.then((x) => setFollowers(x.toLocaleString()));
			client.getSponsorInfo(acct.doc.did).then((x) => setSponsorInfo(x.info));
			setLoading(false);
			contextActions.value = <ProfileActions account={acct} />;
		}
		doItAlreadyGodDamn();
	}, [id]);
	useEffect(() => {
		if (!observer) {
			observer = new ResizeObserver((en) => {
				const tgt = en[0].target as HTMLImageElement;
				tgt.style.marginTop = `-${tgt.height * 3 / 5}px`;
			});
		}
		if (!loading) {
			contextActions.value = <ProfileActions account={account} />;
		}
		observer.disconnect();
		observer.observe(avatarRef.current!);
	}, [loading, avatarRef]);
	const generator = useMemo(() => {
		if (!IS_BROWSER || loading) return null;
		return client.authorFeed(account, false);
	}, [IS_BROWSER, loading, id]);
	if (!IS_BROWSER || loading) {
		return (
			<>
				<div class="profile-banner loading-placeholder" />
				<div class="profile-body">
					<div className="avatar profile-avatar loading-placeholder" ref={avatarRef} />
					<h2 class="profile-display-name">Loading...</h2>
				</div>
			</>
		);
	} else {
		return (
			<>
				<div class="profile-page-header">
					<img src={blobToURL(account.doc, account.profile.banner) ?? "/assets/banner.png"} class="profile-banner" />
					<div class="profile-body">
						<img src={blobToURL(account.doc, account.profile.avatar)} class="avatar profile-avatar" ref={avatarRef} />
						<h2 class="profile-display-name">{account.profile.displayName}</h2>
						<a class="profile-handle">@{account.doc.handle}</a>
						<div class="profile-data">
							<div class="profile-stats">
								<MiniCard>{`${followers} followers`}</MiniCard>
							</div>
							<div class="profile-labels">
								{EgoBooster.awesome.includes(id) && <MiniCard className="awesome">Awesome</MiniCard>}
								{sponsorInfo && sponsorInfo.sponsoring &&
									EgoBooster.sponsorings.filter((def) => def.login in sponsorInfo.sponsoring!).map((def) => (
										<MiniCard className={def.class}>
											<a href={`https://github.com/sponsors/${def.login}`}>{def.text}</a>
										</MiniCard>
									))}
							</div>
						</div>
						<DescriptionText className="pre-line profile-description" text={account.profile.description ?? ""} />
					</div>
					<hr />
				</div>
				<div class="profile-page-content">
					<PostFeed generator={generator!} />
				</div>
			</>
		);
	}
}
