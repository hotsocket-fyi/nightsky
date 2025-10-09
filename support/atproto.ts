// skinny atproto types file for supporting constellation.ts

import { Session } from "./bsky.ts";
import { ValidationError } from "./errors.ts";

// Why'd I put this here? Shouldn't this be in bluesky.ts?
const DEFAULT_SERVICE = "https://api.bsky.app";

/** Type used to imply that a parameter will be run through {@link ValidateNSID} */
export type NSID = string;
const NSIDExpression =
	/^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z0-9]{0,62})?)$/;
export function ValidateNSID(nsid: string): string | null {
	return NSIDExpression.test(nsid) ? nsid : null;
}

export type Handle = string;
export function StripHandle(handle: Handle) {
	return handle.replace("@", "");
}
export type DID = `did:${"web" | "plc"}:${string}`;
export function ValidateDID(did: DID): DID {
	if (!did) throw new ValidationError("Missing DID");
	const parts = did.split(":");
	const isValid = parts.length == 3 && parts[0] == "did" &&
		((parts[1] == "plc" && parts[2].length == 24) || parts[1] == "web") &&
		parts[2].length > 0;
	if (!isValid) {
		throw new ValidationError("Invalid DID");
	}
	return did;
}

export type AtURIString = string; //`at://${string}/${string}/${string}`;
export class AtURI {
	readonly authority: string | null;
	readonly collection: string | null;
	readonly rkey: string | null;
	static fromString(uri: AtURIString): AtURI {
		const parts = uri.split("/").slice(2);
		return new AtURI(ValidateDID(parts[0] as DID), ValidateNSID(parts[1]), parts[2]);
	}
	constructor(authority: string | null, collection: string | null = null, rkey: string | null = null) {
		this.authority = authority;
		this.collection = collection;
		this.rkey = rkey;
	}
	/**
	 * Converts URI to at:// URI.
	 * @returns The string form of this URI, unless if any parts are specified without any preceding elements.
	 * @example ```
	 * // Invalid collection NSID, returns null.
	 * new AtURI("at://did:web:example.com/cheese/abc123").toString()
	 * // Invalid 'authority' DID, returns null.
	 * new AtURI("at://not-a-did/com.example.nsid").toString()
	 * // All good and happy, returns the string fed in.
	 * new AtURI("at://did:web:example.com/com.example.nsid/abc123").toString()
	 * ```
	 */
	toString(): string | null {
		const ret: (string | null)[] = ["at://"];
		// using `?? ""` to have a "bad" value to find
		if (this.authority) {
			ret.push(this.authority ?? "");
		} else ret.push(null);
		if (this.collection) {
			if (ret.indexOf(null) != -1) return null;
			ret.push("/");
			ret.push(this.collection ?? "");
		} else ret.push(null);
		if (this.rkey) {
			if (ret.indexOf(null) != -1) return null;
			ret.push("/");
			ret.push(this.rkey ?? "");
		}
		return ret.join("");
	}
}

export type ATRecord<T> = {
	cid: string;
	uri: AtURIString;
	value: T;
};
export type LocalATRecord<T> = {
	cid: string;
	uri: AtURI;
	value: T;
};
/** Function that essentially converts the uri field to an AtURI. Makes grabbing parts of them easier. */
export function localizeRecord<T>(outer: ATRecord<T> | LocalATRecord<T>): LocalATRecord<T> {
	return {
		cid: outer.cid,
		uri: (outer.uri instanceof AtURI ? outer.uri : AtURI.fromString(outer.uri)),
		value: outer.value,
	};
}

type Error = {
	error: string;
	message: string;
};

// technically you can cast it to whatever you want but i feel like using a generic(?) makes it cleaner
/** Executes an XRPC query (HTTP GET)
 * @param service Defaults to the {@link https://api.bsky.app/ Bluesky (PBC) API} service.
 */
export async function XQuery<T>(
	method: string,
	params: Record<string, string | number | boolean | null | undefined> | null = null,
	service: string = DEFAULT_SERVICE,
): Promise<T> {
	let QueryURL = `${service}/xrpc/${method}`;
	if (params) {
		const usp = new URLSearchParams();
		for (const key in params) {
			if (params[key]) {
				usp.append(key, params[key].toString());
			}
		}
		QueryURL += "?" + usp.toString();
	}
	return (await (await fetch(QueryURL, { cache: "no-store" })).json()) as T;
}
/** Executes an XRPC procedure (HTTP POST) */
export async function XCall<T>(
	method: string,
	params: Record<string, string | number | null> | null = null,
	session: Session | null = null,
	service: string = DEFAULT_SERVICE,
): Promise<T | Error> {
	const QueryURL = `${service}/xrpc/${method}`;
	const data = JSON.stringify(params);
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (session) {
		headers["Authorization"] = `Bearer ${session.accessJwt}`;
	}
	return (await (await fetch(QueryURL, {
		method: "POST",
		headers: headers,
		body: data,
	})).json()) as T;
}

type ListRecordsResponse<T> = {
	cursor?: string;
	records: ATRecord<T>[];
};
export async function ListRecords<T>(
	{ repo, collection, cursor, limit = 50, reverse = false }: {
		repo: string;
		collection: NSID;
		cursor: string | undefined;
		limit?: number;
		reverse?: boolean;
	},
	service: string = DEFAULT_SERVICE,
) {
	return await XQuery<ListRecordsResponse<T>>("com.atproto.repo.listRecords", {
		repo: repo,
		collection: collection,
		limit: limit,
		cursor: cursor,
		reverse: reverse,
	}, service) as ListRecordsResponse<T>;
}

export async function ListRecordsRecursive<T>(repo: string, collection: NSID, service: string) {
	let cursor: string | undefined;
	const records: ATRecord<T>[] = [];
	do {
		const res = await XQuery<ListRecordsResponse<T>>("com.atproto.repo.listRecords", {
			repo: repo,
			collection: collection,
			limit: 100,
			cursor: cursor,
		}, service) as ListRecordsResponse<T>;
		records.push(...res.records);
		cursor = res.cursor;
	} while (cursor);
	return records;
}
