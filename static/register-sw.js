if ("serviceWorker" in navigator) {
	globalThis.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js") // The path to your service worker file
			.then((registration) => {
				console.log("✅ Service Worker registered successfully:", registration.scope);
			})
			.catch((error) => {
				console.log("❌ Service Worker registration failed:", error);
			});
	});
}
