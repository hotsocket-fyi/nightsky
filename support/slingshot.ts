import { ATRecord, AtURI, DID, localizeRecord, XQuery } from "./atproto.ts";

const SLINGSHOT = "https://slingshot.microcosm.blue";

export async function resolveHandle(handle: string) {
	const res = await XQuery("com.atproto.identity.resolveHandle", { handle: handle }, SLINGSHOT) as { did: DID };
	return res.did;
}

export type MiniDoc = {
	did: DID;
	handle: string;
	pds: string; // has https://, no trailing /
	signing_key: string;
};
export async function resolveMiniDoc(identifier: string) {
	return await XQuery<MiniDoc>("com.bad-example.identity.resolveMiniDoc", { identifier: identifier }, SLINGSHOT);
}
export async function getUriRecord<T>(at_uri: AtURI, cid: string | null = null) {
	return localizeRecord(
		await XQuery<ATRecord<T>>(
			"com.bad-example.repo.getUriRecord",
			{ at_uri: at_uri.toString()!, cid: cid },
			SLINGSHOT,
		),
	);
}

/** Calls com.atproto.repo.getRecord with XQuery */
export async function getRecord<T>(
	repo: string,
	collection: string,
	rkey: string,
) {
	return localizeRecord<T>(
		await XQuery<ATRecord<T>>("com.atproto.repo.getRecord", {
			repo: repo,
			collection: collection,
			rkey: rkey,
		}, SLINGSHOT),
	);
}

const Slingshot = {
	resolveHandle,
	resolveMiniDoc,
	getUriRecord,
	getRecord,
};
export default Slingshot;
