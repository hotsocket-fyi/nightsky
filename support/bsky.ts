import { assert } from "@std/assert";
import { SetRefreshData } from "../routes/api/setRefresh.tsx";
import { RefreshSessionData } from "../routes/api/refreshSession.tsx";
import { signal } from "@preact/signals";
import { IS_BROWSER } from "fresh/runtime";
import * as Slingshot from "./slingshot.ts";
import Constellation from "./constellation.ts";
import { AtURI, DID, ListRecords, LocalATRecord, localizeRecord } from "./atproto.ts";
import { GetSponsorInfoData, GetSponsorInfoResponse } from "../routes/api/getSponsorInfo.tsx";

export enum LoginState {
	LOGGED_OUT,
	RESUMING,
	LOGGED_IN,
}

class Client {
	miniDoc: Slingshot.MiniDoc | undefined;
	session: BaseSession | Session | undefined;
	loginState = signal(LoginState.LOGGED_OUT);
	constructor() {}
	async XQuery<T>(
		method: string,
		params: Record<string, string | number | null> | null = null,
		service: string = this.miniDoc!.pds,
	): Promise<T | XError> {
		let QueryURL = `${service}/xrpc/${method}`;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		// no need to give away our tokens
		if (service == this.miniDoc?.pds && this.session) {
			headers["Authorization"] = `Bearer ${this.session.accessJwt}`;
		}
		if (params) {
			const usp = new URLSearchParams();
			for (const key in params) {
				if (params[key]) {
					usp.append(key, params[key].toString());
				}
			}
			QueryURL += "?" + usp.toString();
		}
		return (await (await fetch(QueryURL, {
			headers: headers,
		})).json()) as T;
	}
	/** Executes an XRPC procedure (HTTP POST) */
	async XCall<T>(
		method: string,
		params?: unknown,
		service: string = this.miniDoc!.pds,
	): Promise<T> {
		const QueryURL = `${service}/xrpc/${method}`;
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (service == this.miniDoc?.pds && this.session) {
			headers["Authorization"] = `Bearer ${this.session.accessJwt}`;
		}
		const stuff: Record<string, unknown> = {
			method: "POST",
			headers: headers,
		};
		if (params) {
			stuff["body"] = JSON.stringify(params);
		}

		return (await (await fetch(QueryURL, stuff)).json()) as T;
	}
	async login(id: string, password: string) {
		// snag mini doc from constellation
		this.miniDoc = await Slingshot.resolveMiniDoc(id);
		// create session
		// rate limit: 30 per 5 minutes, 300 per day
		const session = await this.XCall(
			"com.atproto.server.createSession",
			{
				identifier: this.miniDoc.handle,
				password: password,
			},
		);

		if ("error" in (session as Record<string, string>)) {
			const err = session as XError;
			throw new Error(`${err.error}: ${err.message}`);
		}
		this.session = session as Session;
		localStorage.did = this.miniDoc.did;
		localStorage.accessJwt = this.session.accessJwt;
		this.loginState.value = LoginState.LOGGED_IN;
		await this.api_setRefresh((this.session! as Session).refreshJwt!);
	}
	/** Calls {@link file://../routes/api/refreshSession.tsx /api/setRefresh} */
	async api_setRefresh(refreshJwt: string) {
		const body: SetRefreshData = {
			refreshJwt: refreshJwt,
		};
		const setRefreshResponse = await fetch("/api/setRefresh", {
			credentials: "include",
			method: "POST",
			body: JSON.stringify(body),
		});
		if (setRefreshResponse.status != 204) {
			throw new Error(`setRefresh gave a ${setRefreshResponse.status} ${setRefreshResponse.statusText}`);
		}
	}
	async api_refreshSession() {
		const body: RefreshSessionData = {
			pds: this.miniDoc!.pds,
		};
		const refreshFetch = await fetch("/api/refreshSession", {
			credentials: "include",
			method: "POST",
			body: JSON.stringify(body),
		});
		const refreshedSession = await refreshFetch.json() as Session;
		this.session = refreshedSession;
		localStorage.accessJwt = refreshedSession.accessJwt;
		this.loginState.value = LoginState.LOGGED_IN;
	}
	async api_deleteSession() {
		await fetch("/api/deleteSession", {
			credentials: "include",
			method: "POST",
		});
	}
	async resume() {
		this.loginState.value = LoginState.RESUMING;
		this.miniDoc = await Slingshot.resolveMiniDoc(localStorage.did);
		this.session = {
			accessJwt: localStorage.accessJwt,
			did: this.miniDoc.did,
			handle: this.miniDoc.handle,
		} as BaseSession;
		// check if the session is even any good
		const sesRsp = await this.XQuery<Session>("com.atproto.server.getSession");
		if (Object.hasOwn(sesRsp, "error")) {
			const err = sesRsp as XError;
			if (err.error == "ExpiredToken") {
				this.api_refreshSession();
				return;
			} else {
				throw new Error(`Client.resume(): getSession ::: ${err.error}: ${err.message}`);
			}
		}
		this.session = sesRsp as Session;
		this.session.accessJwt = localStorage.accessJwt;
		this.loginState.value = LoginState.LOGGED_IN;
	}
	async logout() {
		await this.api_deleteSession();
		localStorage.clear();
		this.loginState.value = LoginState.LOGGED_OUT;
		this.session = undefined;
		this.miniDoc = undefined;
	}
	async createRecord(
		input: RecordInput,
	): Promise<RecordOutput> {
		assert(this.miniDoc != undefined);
		assert(this.session != undefined);
		return await this.XCall<RecordOutput>(
			"com.atproto.repo.createRecord",
			input,
		);
	}
	async deleteRecord(
		collection: string,
		rkey: string,
	) {
		assert(this.miniDoc != undefined);
		assert(this.session != undefined);
		return await this.XCall(
			"com.atproto.repo.deleteRecord",
			{
				repo: this.miniDoc.did,
				collection: collection,
				rkey: rkey,
			},
		);
	}
	async uploadBlob(
		uri: string,
		mimeType?: string,
	): Promise<Blob> {
		assert(this.miniDoc != undefined);
		assert(this.session != undefined);
		const res = await fetch(uri);
		const data = await res.blob();
		const nowType: string = mimeType || data.type;
		if (!nowType) {
			throw new Error("no mime type fetched nor provided.");
		}
		const blerg = await fetch(
			`${this.miniDoc!.pds}/xrpc/com.atproto.repo.uploadBlob`,
			{
				body: data,
				headers: {
					"Authorization": `Bearer ${this.session.accessJwt}`,
					"Content-Type": nowType,
				},
				method: "POST",
			},
		);
		const postRes = await blerg.json();
		if (postRes.error) {
			throw new Error(`${postRes.error}: ${postRes.message} (${blerg.status})`);
		}
		return postRes.blob;
	}
	async createPost(post: Post) {
		assert(this.miniDoc != undefined);
		assert(this.session != undefined);
		return await this.createRecord({
			repo: this.miniDoc.did,
			collection: "app.bsky.feed.post",
			record: post,
		});
	}

	/* less "core"-ish things */
	async getRecord<T>(ref: RecordRef): Promise<LocalATRecord<T>>;
	async getRecord<T>(uri: AtURI): Promise<LocalATRecord<T>>;
	async getRecord<T>(repo: string | RecordRef, collection?: string, rkey?: string): Promise<LocalATRecord<T>>;
	async getRecord<T>(
		repo: string | RecordRef | AtURI,
		collection?: string,
		rkey?: string,
		//service: string | undefined = this.miniDoc!.pds,
	): Promise<LocalATRecord<T>> {
		if (typeof repo == "string") {
			return await Slingshot.getRecord<T>(
				repo as string,
				collection!,
				rkey!,
			);
		} else if (repo instanceof AtURI) {
			return await Slingshot.getUriRecord<T>(repo);
		} else {
			return await Slingshot.getUriRecord<T>(
				AtURI.fromString(repo.uri),
				repo.cid,
			);
		}
	}

	/* now we're basically just wrapping getRecord */
	async getProfile(id: string) {
		const doc = await Slingshot.resolveMiniDoc(id);
		return (await Slingshot.getRecord<Profile>(doc.did, "app.bsky.actor.profile", "self")).value;
	}
	async getFollow(follower: string, followee: string = this.miniDoc!.did): Promise<AtURI | null> {
		return (await Constellation.getLinks({
			target: follower,
			collection: "app.bsky.graph.follow",
			path: ".subject",
			did: followee,
			limit: 1,
		}))[0] ?? null;
	}
	/* ...or createRecord */
	/** Follows an account with the currently signed-in one.
	 * @param assurance - Locally tracked follow state. Will only create the follow if this is null.
	 */
	async follow(followee: string, assurance: AtURI | null): Promise<AtURI | null> {
		const follow = assurance != null || await this.getFollow(followee, this.miniDoc!.did);
		if (follow) {
			console.error("attempted to create a duplicate follow");
			return null;
		}
		const out = await this.createRecord({
			repo: this.miniDoc!.did,
			collection: "app.bsky.graph.follow",
			record: {
				$type: "app.bsky.graph.follow",
				subject: followee,
				createdAt: new Date().toISOString(),
			} as Follow,
		});
		return AtURI.fromString(out.uri);
	}
	/** Unfollows an account with the currently signed-in one.
	 * @param toUnfollow -
	 */
	async unfollow(toUnfollow: string | AtURI | null) {
		if (!toUnfollow) {
			console.error("attempted to unfollow a account with no follow record");
			return;
		}
		const follow = toUnfollow instanceof AtURI ? toUnfollow : await this.getFollow(this.miniDoc!.did, toUnfollow);
		if (!follow) {
			console.error("attempted to unfollow a account with no follow record (past initial check)");
			return;
		}
		await this.deleteRecord(
			"app.bsky.graph.follow",
			follow.rkey!,
		);
	}

	async getAccount(id: string): Promise<Account> {
		const doc = await Slingshot.resolveMiniDoc(id);
		const profile = await this.getProfile(doc.did);
		const followers = Constellation.countLinks({
			target: doc.did,
			collection: "app.bsky.graph.follow",
			path: ".subject",
		});
		return {
			doc: doc,
			profile: profile,
			followers: followers,
		};
	}

	async *authorFeed(account: Account, includeReplies: boolean = false): FeedGenerator {
		let cursor: string | undefined;
		while (true) {
			const rsp = await ListRecords<Post>({
				repo: account.doc.did,
				collection: "app.bsky.feed.post",
				cursor: cursor,
			}, account.doc.pds);
			for (const post of rsp.records) {
				if (post.value.reply && !includeReplies) continue;
				yield {
					post: localizeRecord(post),
					author: account,
				};
			}
			cursor = rsp.cursor;
			if (!cursor) return;
		}
	}

	async *threadFeed(postUri: AtURI): FeedGenerator {
		const parents: LocalATRecord<Post>[] = [];
		const post = await this.getRecord<Post>(postUri);
		let currentParent: RecordRef | undefined = post.value.reply?.parent;
		while (currentParent) {
			const currentRecord = await client.getRecord<Post>(currentParent);
			parents.push(currentRecord);
			currentParent = currentRecord.value.reply?.parent;
		}
		// push out parents
		while (parents.length > 0) {
			const parent = parents.pop()!;
			const author = await client.getAccount(parent.uri.authority!);
			yield {
				author: author,
				post: parent,
			};
		}
		yield {
			author: await client.getAccount(post.uri.authority!),
			post: post,
		};
		// now grab replies to this post
		const replies = Constellation.genLinks({
			target: post.uri.toString()!,
			collection: "app.bsky.feed.post",
			path: ".reply.parent.uri",
		});
		while (true) {
			const reply = await replies.next();
			if (reply.done) break;
			yield {
				author: await client.getAccount(reply.value.authority!),
				post: await client.getRecord<Post>(reply.value),
			};
		}
	}

	async getSponsorInfo(did: DID, forceRecheck?: boolean): Promise<GetSponsorInfoResponse> {
		return await (await fetch("/api/getSponsorInfo", {
			method: "POST",
			body: JSON.stringify({ did: did, forceRecheck: forceRecheck } as GetSponsorInfoData),
		})).json();
	}
}

export function blobToURL(miniDoc: Slingshot.MiniDoc, blob: Blob | undefined): string | undefined {
	if (!blob) return undefined;
	return `${miniDoc.pds}/xrpc/com.atproto.sync.getBlob?did=${miniDoc.did}&cid=${blob.ref.$link}`;
}

export const client = new Client();

if (IS_BROWSER && localStorage.accessJwt) {
	client.resume();
}

console.log("i be flossin");

export type FeedGenerator = AsyncGenerator<FeedItem, void, unknown>;
export type FeedItem = {
	post: LocalATRecord<Post>;
	author: Account;
};
/** app.bsky.actor.profile */
export type Profile = {
	$type: "app.bsky.actor.profile";
	displayName: string;
	description?: string;
	avatar?: Blob;
	banner?: Blob;
	indexedAt: string;
};
export type Account = {
	doc: Slingshot.MiniDoc;
	profile: Profile;
	/** Getting a follower count is slow, so this is a promise to await later. */
	followers: Promise<number>;
	// would love this, but spamming com.atproto.
	//following: number;
	//posts: number;
};
export type Follow = {
	$type: "app.bsky.graph.follow";
	subject: string;
	createdAt: string;
};

export type Blob = {
	$type: "blob";
	ref: { $link: string };
	mimeType: string;
	size: number;
};

export type Embed_AspectRatio = {
	width: number;
	height: number;
};

export type Embed_Record = {
	$type: "app.bsky.embed.record";
	record: RecordRef;
};
export type Embed_RecordMedia = {
	$type: "app.bsky.embed.recordWithMedia";
	media?: Embed_Video | Embed_Images | Embed_External;
	record: Embed_Record;
};

export type EmbedImageData = {
	image: Blob;
	alt: string;
	aspectRatio?: Embed_AspectRatio;
};
export type Embed_Images = {
	$type: "app.bsky.embed.images";
	images: EmbedImageData[];
};
export type Embed_Video_Caption = {
	lang: string;
	caption: Blob;
};
export type Embed_Video = {
	$type: "app.bsky.embed.video";
	video: Blob;
	captions?: Embed_Video_Caption[];
	alt?: string;
	aspectRatio?: Embed_AspectRatio;
};
export type Embed_External = {
	$type: "app.bsky.embed.external";
	external: {
		uri: string;
		title: string;
		description: string;
		thumb?: Blob;
	};
};

export type Post_Facet = {
	index: [number, number];
	features: { $type: string; [key: string]: unknown }[];
};

export type RecordRef = {
	uri: string;
	cid: string;
};
export type Post_ReplyRef = {
	root: RecordRef;
	parent: RecordRef;
};

export type Post_Embed = Embed_Images | Embed_Video | Embed_External | Embed_Record | Embed_RecordMedia;

type _ATRecord = {
	$type: string;
};

export type Label_SelfLabel = {
	src: string;
	uri: string;
	val: string;
	cts: string;
	ver?: number;
	cid?: string;
	neg?: boolean;
	exp?: string;
	sig?: string;
};
export type Label_SelfLabels = {
	values: Label_SelfLabel[];
};
export type Post = _ATRecord & {
	$type: "app.bsky.feed.post";
	text: string;
	createdAt: string;
	facets?: Post_Facet[];
	reply?: Post_ReplyRef;
	embed?: Post_Embed;
	langs?: string[];
	labels?: Label_SelfLabels;
	tags?: string[];
};

export type BaseSession = {
	accessJwt: string;
	handle: string;
	did: string;
};
export type Session = BaseSession & {
	refreshJwt?: string;
	didDoc?: string;
	email?: string;
	emailConfirmed?: boolean;
	emailAuthFactor?: boolean;
	active?: boolean;
	status?: string;
};

export type RecordInput = {
	repo: string;
	collection: string;
	record: _ATRecord;
	rkey?: string;
	/** Can be set to 'false' to skip Lexicon schema validation of record data, 'true' to require it, or leave unset to validate only for known Lexicons. */
	validate?: boolean;
	swapCommit?: string;
};
export type Repo_CommitMeta = {
	cid: string;
	rev: string;
};
export type RecordOutput = {
	uri: string;
	cid: string;
	ref?: Repo_CommitMeta;
	validationStatus?: "valid" | "unknown";
};

export type XError = {
	error: string; //"InvalidRequest" | "ExpiredToken" | "InvalidToken";
	message?: string;
};
