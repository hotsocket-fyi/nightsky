import { define } from "../../utils.ts";
import { Session } from "../../support/bsky.ts";
import { getCookies } from "@std/http/cookie";
import { assert } from "@std/assert/assert";
import { XError } from "@/lib.ts";

export type RefreshSessionData = {
	pds: string;
};

export const handler = define.handlers({
	async POST(ctx) {
		const cookies = getCookies(ctx.req.headers);
		if (!cookies["refreshJwt"]) {
			return new Response(JSON.stringify({
				error: "InvalidRequest",
				message: "Missing refreshJWT in request cookies.",
			} as XError));
		}
		const refreshJwt = cookies["refreshJwt"];
		const reqData = await ctx.req.json() as RefreshSessionData;
		assert(reqData.pds);
		const refreshRsp = await fetch(new URL("/xrpc/com.atproto.server.refreshSession", reqData.pds), {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${refreshJwt}`,
			},
		});
		const refreshedSession = await refreshRsp.json() as Session;
		const newRefreshJwt = refreshedSession.refreshJwt;
		refreshedSession.refreshJwt = undefined;

		const url = new URL(ctx.req.url);
		const isSecure = url.hostname != "127.0.0.1" && url.hostname != "localhost";
		const cookie = `refreshJwt=${newRefreshJwt}; HttpOnly; Path=/; SameSite=Strict${isSecure ? "; Secure" : ""}`;

		return new Response(JSON.stringify(refreshedSession), {
			status: refreshRsp.status,
			statusText: refreshRsp.statusText,
			headers: {
				"Set-Cookie": cookie,
			},
		});
	},
});
