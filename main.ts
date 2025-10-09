/// <reference lib="deno.unstable" />
// ^ for kv
import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";
import { Root } from "./components/views/Root.tsx";

export const app = new App<State>()
	.use(async (ctx) => {
		const res = await ctx.next();
		res.headers.append(
			"Content-Security-Poilcy",
			`default-src 'self';
			script-src 'self' 'unsafe-inline';
			style-src 'self' 'unsafe-inline';
			font-src 'self';
			img-src *;
			media-src *;
			worker-src 'self' blob:;
			connect-src 'self';
			object-src 'none';
			base-uri 'self';
			form-action 'self';
			frame-ancestors 'none';
			upgrade-insecure-requests;`
				.replaceAll(/\s+/g, " "),
		);
		res.headers.append("X-Frame-Options", "NONE");
		res.headers.append("X-Content-Type-Options", "nosniff");
		res.headers.append("Referrer-Policy", "no-referrer");
		return res;
	})
	.layout("*", Root);

app.use(staticFiles());

// Pass a shared value from a middleware
app.use(async (ctx) => {
	ctx.state.shared = "hello";
	return await ctx.next();
});

// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get("/api2/:name", (ctx) => {
	const name = ctx.params.name;
	return new Response(
		`Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`,
	);
});

// this can also be defined via a file. feel free to delete this!
const exampleLoggerMiddleware = define.middleware((ctx) => {
	console.log(`${ctx.req.method} ${ctx.req.url}`);
	return ctx.next();
});
app.use(exampleLoggerMiddleware);

// Include file-system based routes here
app.fsRoutes();
