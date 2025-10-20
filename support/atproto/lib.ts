import { Stringifiable } from "./impl/types.ts";

/** A probably-standard way of conveying errors.
 * @see {@link https://atproto.com/specs/xrpc#error-responses}
 */
export type XError = {
	error: string;
	message?: string;
};

// full:   "at://" AUTHORITY [ PATH ] [ "?" QUERY ] [ "#" FRAGMENT ]
// actual: "at://" AUTHORITY [ "/" COLLECTION [ "/" RKEY ] ]
/** {@link URL}-like at:// URI thing */
export class AtURI implements Stringifiable {
	authority: string;
	collection?: string;
	rkey?: string;

	private static getSerialization(uri: Stringifiable, base?: Stringifiable): string[] {
		const uriString = uri.toString();
		if (uriString!.startsWith("at://")) {
			const parts = uriString!.split(/(\/+)/);
			if (parts.length > 1 && parts[1] !== "//") {
				throw new Error("Invalid URI: missing // after at:");
			}
			return [parts[2], parts[4], parts[6]];
		}
		console.log(uriString);

		if (!base) {
			throw new Error("Relative URI without base???");
		}
		const baseString = base.toString()!;
		if (!baseString.startsWith("at://")) {
			throw new Error("must start with at://");
		}

		// steal the built-in stuff
		const httpBase = baseString.replace(/^at:/, "http:");
		const resolvedUrl = new URL(uriString!, httpBase);

		const { hostname, pathname } = resolvedUrl;

		// literally dont care
		const newParts = [hostname];
		const pathSegments = pathname.split("/").filter((p) => p);

		if (pathSegments.length > 0) {
			newParts.push("/");
			newParts.push(pathSegments[0]);
		}
		if (pathSegments.length > 1) {
			newParts.push("/");
			newParts.push(pathSegments[1]);
		}
		if (pathSegments.length > 2) {
			throw new Error(`path too long: ${pathname}`);
		}

		return newParts;
	}

	constructor(uri: Stringifiable, base?: Stringifiable);
	constructor(authority: string, collection: string, rkey: string);
	constructor(uriOrAuthority: Stringifiable, baseOrCollection?: Stringifiable, rkey?: string) {
		if (uriOrAuthority.toString()!.startsWith("at://")) {
			try {
				const srz = AtURI.getSerialization(uriOrAuthority, baseOrCollection);
				this.authority = srz[0];
				this.collection = srz[1];
				this.rkey = srz[2];
			} catch (e) {
				throw new Error(
					`Invalid AtURI: '${uriOrAuthority}'${baseOrCollection && ` with base '${baseOrCollection}'`}: ${
						(e as Error).message
					}`,
				);
			}
		} else {
			this.authority = uriOrAuthority.toString()!;
			if (baseOrCollection) {
				const strungCollection = baseOrCollection?.toString();
				this.collection = strungCollection ? strungCollection : undefined;
				this.rkey = rkey;
			}
		}
	}

	static parse(uri: Stringifiable, base?: Stringifiable): AtURI | null {
		try {
			return new AtURI(uri, base);
		} catch {
			return null;
		}
	}
	static canParse(uri: Stringifiable, base?: Stringifiable): boolean {
		return AtURI.parse(uri, base) instanceof AtURI ? true : false;
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

// named XBlob to avoid conflicts with built-in "Blob"
export type XBlob = {
	$type: "blob";
	ref: {
		$link: string;
	};
	mimeType: string;
	size: number;
};

const rkeyExpression = /^([A-Za-z0-9.\-_:~]{1,512})$/;
export function validateRecordKey(rkey: string): string | null {
	const matched = rkey.match(rkeyExpression);
	if (!matched) return null;
	return matched[0];
}
