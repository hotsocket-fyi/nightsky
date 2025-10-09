import { createDefine } from "fresh";
import { XError } from "./support/bsky.ts";

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
	shared: string;
}

export const define = createDefine<State>();

export function errorResponse(status: number, error: Error): Response;
export function errorResponse(status: number, error: string, message?: string): Response;
export function errorResponse(status: number, error: string | Error, message?: string): Response {
	if (error instanceof Error) {
		return new Response(
			JSON.stringify({
				error: error.constructor.name,
				message: error.message,
			} as XError),
			{ status: status },
		);
	} else {
		return new Response(
			JSON.stringify({
				error: error,
				message: message,
			} as XError),
			{ status: status },
		);
	}
}

/** Returns 'An' if str starts with a vowel. */
export function aOrAn(upper: boolean, str: string) {
	if (str.match(/^\s*[AaEeIiOoUu]/)) {
		return upper ? "An" : "an";
	} else return upper ? "A" : "a";
}
