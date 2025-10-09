import { AtURI, AtURIString, DID, NSID, ValidateNSID } from "./atproto.ts";

const BASEURL = "https://constellation.microcosm.blue";

/** Essentially an AtURI, fed back by Constellation. */
export type Reference = {
	did: string;
	collection: string;
	rkey: string;
};

/** Raw response type from /links */
type LinksResponse = {
	total: number;
	linking_records: Reference[];
	cursor: string;
};

type Target = AtURIString | DID;
/**
 * Retrieves an array of record references to records containing links to the specified target.
 * @throws When the provided NSID is invalid.
 */
export async function getLinks(
	// see i didnt realize you could just do this until i started this project so yay
	{ target, collection, path, did, limit }: {
		target: Target | AtURI;
		collection: NSID;
		path: string;
		did?: string;
		limit?: number;
	},
): Promise<AtURI[]> {
	if (ValidateNSID(collection) == null) {
		throw new Error("invalid NSID for collection parameter");
	}
	const _path = encodeURIComponent(path);
	const _limit = limit ? limit.toString() : undefined;
	const url = new URL("/links", BASEURL);
	url.searchParams.set("target", target instanceof AtURI ? target.toString()! : target);
	url.searchParams.set("collection", collection);
	url.searchParams.set("path", _path);
	if (did) {
		url.searchParams.set("did", did);
	}
	if (_limit) {
		url.searchParams.set("limit", _limit);
	}
	let cursor = "";
	let records: AtURI[] = [];
	while (cursor != null) {
		const rsp = await fetch(url);
		const data = await rsp.json() as LinksResponse;
		records = records.concat(data.linking_records.map((x) => new AtURI(x.did, x.collection, x.rkey)));
		cursor = data.cursor;
		url.searchParams.set("cursor", cursor);
	}
	return records;
}
export async function* genLinks(
	// see i didnt realize you could just do this until i started this project so yay
	{ target, collection, path, did, limit }: {
		target: Target;
		collection: NSID;
		path: string;
		did?: string;
		limit?: number;
	},
): AsyncGenerator<AtURI, void, unknown> {
	if (ValidateNSID(collection) == null) {
		throw new Error("invalid NSID for collection parameter");
	}
	const _path = encodeURIComponent(path);
	const _limit = limit ? limit.toString() : undefined;
	const url = new URL("/links", BASEURL);
	url.searchParams.set("target", target);
	url.searchParams.set("collection", collection);
	url.searchParams.set("path", _path);
	if (did) {
		url.searchParams.set("did", did);
	}
	if (_limit) {
		url.searchParams.set("limit", _limit);
	}
	let cursor = "";
	while (cursor != null) {
		const rsp = await fetch(url);
		const data = await rsp.json() as LinksResponse;
		const links = data.linking_records.map((x) => new AtURI(x.did, x.collection, x.rkey));
		for (const link of links) {
			yield link;
		}
		cursor = data.cursor;
		url.searchParams.set("cursor", cursor);
	}
}

/**
 * The total number of links pointing at a given target.
 *
 * @param target - required, Example: did:plc:vc7f4oafdgxsihk4cry2xpze
 * @param collection - required. Example: app.bsky.graph.block
 * @param path - required, Example: .subject
 */
export async function countLinks({ target, collection, path }: {
	target: Target;
	collection: NSID;
	path: string;
}): Promise<number> {
	const url = new URL("/links/count", BASEURL);
	url.searchParams.set("target", target);
	url.searchParams.set("collection", collection);
	url.searchParams.set("path", path);
	return (await (await fetch(url)).json())["total"] as number;
}

const Constellation = {
	getLinks,
	genLinks,
	countLinks,
};

export default Constellation;
