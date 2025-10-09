//
const CACHES = [
	{
		name: "atproto-blob-cache-v1",
		maxSize: 1000,
		noCheck: true, // these are opaque. it's probably fine.
		filter: (url) => url.pathname.endsWith("/com.atproto.sync.getBlob"),
	},
	{
		name: "atproto-minidoc-cache-v1",
		maxSize: 200,
		filter: (url) => url.pathname.endsWith("/com.bad-example.identity.resolveMiniDoc"),
	},
	{
		name: "atproto-profile-cache-v1",
		maxSize: 100,
		filter: (
			url,
		) => (url.pathname.endsWith("/com.atproto.repo.getRecord") &&
			url.searchParams.get("collection") === "app.bsky.actor.profile"),
	},
];

/**
 * Deletes the oldest entries in the cache until the cache is at a specified size.
 * @param {string} cacheName The name of the cache to trim.
 * @param {number} maxItems The maximum number of items allowed in the cache.
 */
const trimCache = async (cacheName, maxItems) => {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();

	if (keys.length > maxItems) {
		console.debug(`Trimming cache. Found ${keys.length} items, limit is ${maxItems}.`);
		// Delete the oldest entries (FIFO). The keys are generally returned in insertion order.
		for (let i = 0; i < keys.length - maxItems; i++) {
			await cache.delete(keys[i]);
		}
		console.debug(`Trimmed cache down to ${maxItems} items.`);
	}
};

// The 'fetch' event listener
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	const url = new URL(event.request.url);
	const found = CACHES.find((cache) => cache.filter(url));
	if (!found) {
		return;
	}

	event.respondWith((async () => {
		const cache = await caches.open(found.name);

		// 1. Check if we have a copy in the cache already (cache-first).
		const cachedResponse = await cache.match(event.request);
		if (cachedResponse) {
			console.debug("hit", url);
			return cachedResponse;
		}
		console.debug("miss", url);

		// 2. If not in the cache, fetch it from the network.
		try {
			const networkResponse = await fetch(event.request);
			const putClone = networkResponse.clone();

			// 3. If the fetch is successful, cache the response in the background.
			if (found.noCheck || putClone.ok) {
				console.debug("putting", url);
				event.waitUntil(
					cache.put(event.request, putClone).then(() => {
						console.debug("put", url);
						return trimCache(found.name, found.maxSize);
					}),
				);
			}

			// 4. Return the network response.
			return networkResponse;
		} catch (error) {
			// 5. If the network fetch fails, re-throw the error so it can be handled by the application.
			console.warn("Network request failed and not in cache.", error);
			throw error;
		}
	})());
});
