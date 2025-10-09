import { define } from "../../utils.ts";

export const handler = define.handlers({
	POST(_ctx) {
		return new Response(null, {
			status: 204,
			headers: {
				"Set-Cookie": "refreshJwt=; HttpOnly; Path=/; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 GMT",
			},
		});
	},
});
