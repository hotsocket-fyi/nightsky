import { aOrAn, define, errorResponse } from "../../utils.ts";
import { SignJWT } from "@panva/jose";
import { Gist } from "../../support/github.ts";
import AT from "@/index.ts";
import { assert } from "@std/assert";

export type GetSponsorInfoData = {
	did: string;
	forceRecheck?: boolean;
};
export type GetSponsorInfoResponse = {
	did: string; // just in case you forgot :P
	cached: boolean;
	info: SponsorInfo;
};
export type SponsorInfo = {
	linked: boolean;
	failReason?: string;
	checkDate: Date;
	sponsoring?: string[];
};
export type GithubLink = {
	$type: "pro.hotsocket.nightsky.github";
	login: string;
	gist: string;
};

export class LinkError extends Error {}

const EXPIRE_TIME = 1000 * 60 * 60 * 12;

// this was such a pain to figure out BUT I GOT IT!!!
async function makeJWT(): Promise<string> {
	const der64 = Deno.env.get("GITHUB_PKEY")!;
	const der = Uint8Array.fromBase64(der64);
	const clientid = Deno.env.get("GITHUB_CLIENTID")!;

	const now = Math.floor(Date.now() / 1000);
	const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, [
		"sign",
	]);

	return await new SignJWT({
		iat: now - 60,
		exp: now + 60,
		iss: clientid,
	})
		.setProtectedHeader({ alg: "RS256" })
		.sign(key);
}
async function getToken(jwt: string): Promise<string> {
	const installations = await (await fetch("https://api.github.com/app/installations", {
		headers: {
			"Accept": "application/vnd.github+json",
			"Authorization": `Bearer ${jwt}`,
			"X-GitHub-Api-Version": "2022-11-28",
		},
	})).json();
	const tokenResponse = await (await fetch(installations[0].access_tokens_url, {
		method: "POST",
		headers: {
			"Accept": "application/vnd.github+json",
			"Authorization": `Bearer ${jwt}`,
			"X-GitHub-Api-Version": "2022-11-28",
		},
	})).json();
	return tokenResponse.token;
}

// no need to repeat myself
function badCheck(reason: string): SponsorInfo {
	return { linked: false, failReason: reason, checkDate: new Date() };
}
async function determineInfo(did: string): Promise<SponsorInfo> {
	// grab link record, direct from pds to avoid timing issues
	const doc = await AT.com.bad_example.identity.resolveMiniDoc(
		new URL("https://slingshot.microcosm.blue"),
		{
			identifier: did,
		},
	);
	assert(!("error" in doc));
	const ghlink = await AT.com.atproto.repo.getRecord(
		new URL(doc.pds),
		{
			repo: doc.did,
			collection: "pro.hotsocket.nightsky.github",
			rkey: "self",
		},
	);
	//  await XQuery<ATRecordReply<GithubLink>>("com.atproto.repo.getRecord", {
	// 	repo: doc.did,
	// 	collection: "pro.hotsocket.nightsky.github",
	// 	rkey: "self",
	// }, doc.pds);
	if ("error" in ghlink) {
		console.log(ghlink);
		return badCheck("record not found");
	}

	// figure out the gist situation
	const gist = await (await fetch(`https://api.github.com/gists/${ghlink.value.gist}`, { cache: "no-store" }))
		.json() as Gist;
	// THE GREAT(ish) WALL OF IF!
	if (gist.owner.login != ghlink.value.login) return badCheck("login mismatch");
	if (!("_atproto" in gist.files)) return badCheck("_atproto missing");
	const gistFile = gist.files["_atproto"];
	if (gistFile.truncated) return badCheck("gist file too long");
	if (!(gistFile.content!.startsWith("did="))) return badCheck("gist missing did=");
	if (!(gistFile.content!.endsWith(did))) return badCheck("gist missing did");

	// now that we know this is good, it's time to screw with auth and grab those sponsorships
	const jwt = await makeJWT();
	const ghToken = await getToken(jwt);
	const qlRes = await (await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			"Accept": "application/json",
			"Authorization": `Bearer ${ghToken}`,
		},
		body: JSON.stringify({
			query:
				"query($sponsorLogin: String!){user(login:$sponsorLogin){sponsoring(first:100){nodes{...on User{login}...on Organization{login}}}}}",
			variables: {
				sponsorLogin: ghlink.value.login,
			},
		}),
	})).json();
	const sponsoring = qlRes.data.user.sponsoring.nodes;
	return {
		linked: true,
		checkDate: new Date(),
		sponsoring: sponsoring,
	};
}

export const handler = define.handlers({
	async POST(ctx) {
		let req: GetSponsorInfoData;
		try {
			req = await ctx.req.json() as GetSponsorInfoData;
			// const did = ValidateDID(req.did);
			const did = req.did;

			const kv = await Deno.openKv();

			// try to retrieve the stored sponsor info
			const key = ["external", did, "sponsoring"];
			const storedInfo = await kv.get<SponsorInfo>(key);
			if (!req.forceRecheck && storedInfo.value) {
				// these bits expire after 12 hours
				const checkTime = storedInfo.value.checkDate.getTime();
				const yesterdayish = Date.now() - EXPIRE_TIME; // 12 hours ago
				if (checkTime > yesterdayish) {
					const secondsUntilExpiration = Math.ceil((checkTime - yesterdayish) / 1000);
					return new Response(
						JSON.stringify({
							cached: true,
							did: did,
							info: storedInfo.value,
						} as GetSponsorInfoResponse),
						{
							headers: {
								// try to reduce requests in general
								"Cache-Control": `max-age=${secondsUntilExpiration}`,
							},
						},
					);
				}
			}
			const newInfo = await determineInfo(did);
			await kv.set(key, newInfo, { expireIn: Date.now() + EXPIRE_TIME });
			kv.close();
			return new Response(
				JSON.stringify({
					cached: false,
					did: did,
					info: newInfo,
				} as GetSponsorInfoResponse),
				{
					headers: {
						// try to reduce requests in general
						"Cache-Control": `max-age=${EXPIRE_TIME}`,
					},
				},
			);
		} catch (error) {
			if (error instanceof SyntaxError) {
				return errorResponse(400, error);
			}
			// if (error instanceof ValidationError) {
			// 	return errorResponse(400, error);
			// }
			if (error instanceof LinkError) {
				return errorResponse(400, error);
			}
			console.error(error);
			const ename = (error as Error).constructor.name;
			return errorResponse(
				500,
				"UnmanagedError",
				`${aOrAn(true, ename)} '${ename}' error was thrown, but not handled properly.`,
			);
		}
	},
});
