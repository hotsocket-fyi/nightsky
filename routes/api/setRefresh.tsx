import { define } from "../../utils.ts";

export type SetRefreshData = {
	refreshJwt?: string;
};

export const handler = define.handlers({
	async POST(ctx) {
		const req = await ctx.req.json() as SetRefreshData;
		if (!req.refreshJwt) {
			return new Response(null, {
				status: 400,
			});
		} else {
			const url = new URL(ctx.req.url);
			const isSecure = url.hostname != "127.0.0.1" && url.hostname != "localhost";
			const cookie = `refreshJwt=${req.refreshJwt}; HttpOnly; Path=/; SameSite=Strict${isSecure ? "; Secure" : ""}`;
			return new Response(null, {
				status: 204,
				headers: {
					"Set-Cookie": cookie,
				},
			});
		}
	},
});
