// @ts-nocheck
// Service Worker custom entry – bundled by @ducanh2912/next-pwa.
// Uses ServiceWorker globals (PushEvent, NotificationEvent, etc.) that conflict
// with the DOM lib in the main tsconfig, so type-checking is skipped here.

self.addEventListener("push", (event) => {
	if (!event.data) return;

	let payload;
	try {
		payload = event.data.json();
	} catch {
		payload = { title: "釣りナビ", body: event.data.text() };
	}

	const title = payload.title ?? "釣りナビ";
	const options = {
		body: payload.body ?? "",
		icon: "/icons/icon-192x192.png",
		badge: "/icons/icon-192x192.png",
		data: { url: payload.url ?? "/" },
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = event.notification.data?.url ?? "/";
	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
			const existing = clients.find((c) => c.url === url);
			if (existing) return existing.focus();
			return self.clients.openWindow(url);
		}),
	);
});
