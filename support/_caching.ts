import { DID, Handle, StripHandle } from "./atproto.ts";
import { MiniDoc, resolveMiniDoc } from "./slingshot.ts";

type Identifier = DID | Handle;
type PromiseCallbacks = {
	resolve: (doc: MiniDoc) => void;
	reject: (err: unknown) => void;
};

class _DocCache {
	cache: Map<Identifier, MiniDoc> = new Map();
	waiting: Map<Identifier, PromiseCallbacks[]> = new Map();
	async get(k: Identifier): Promise<MiniDoc> {
		const key = StripHandle(k);
		if (this.cache.has(key)) {
			console.debug("cache hit " + key);
			return this.cache.get(key)!;
		}

		if (this.waiting.has(key)) {
			console.debug("cache soft miss " + key);
			return new Promise((resolve, reject) => {
				this.waiting.get(key)!.push({ resolve, reject });
			});
		}

		this.waiting.set(key, []);
		try {
			console.debug("cache hard miss " + key);
			const grabbed = await resolveMiniDoc(key);
			this.cache.set(key, grabbed);
			this.cache.set(grabbed.did, grabbed);
			this.cache.set(grabbed.handle, grabbed);
			this.waiting.get(key)!.forEach((p) => p.resolve(grabbed));
			return grabbed;
		} catch (error) {
			this.waiting.get(key)!.forEach((p) => p.reject(error));
			throw error;
		} finally {
			this.waiting.delete(key);
		}
	}
}

export const DocProxy = new _DocCache();
