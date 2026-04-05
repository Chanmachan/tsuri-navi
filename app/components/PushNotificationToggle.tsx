"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = atob(base64);
	return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationToggle() {
	const [supported, setSupported] = useState(false);
	const [subscribed, setSubscribed] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
		setSupported(true);

		navigator.serviceWorker.ready.then(async (reg) => {
			const sub = await reg.pushManager.getSubscription();
			setSubscribed(!!sub);
		});
	}, []);

	if (!supported) return null;

	async function handleToggle() {
		setLoading(true);
		try {
			const reg = await navigator.serviceWorker.ready;
			const existing = await reg.pushManager.getSubscription();

			if (existing) {
				await existing.unsubscribe();
				const delRes = await fetch("/api/push/subscribe", {
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ endpoint: existing.endpoint }),
				});
				if (delRes.ok || delRes.status === 404) {
					setSubscribed(false);
				}
			} else {
				const keyRes = await fetch("/api/push/vapid-key");
				if (!keyRes.ok) return;
				const { publicKey } = (await keyRes.json()) as { publicKey: string };
				const keyBytes = urlBase64ToUint8Array(publicKey);
				const sub = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: keyBytes.buffer.slice(
						keyBytes.byteOffset,
						keyBytes.byteOffset + keyBytes.byteLength,
					) as ArrayBuffer,
				});
				const json = sub.toJSON();
				const postRes = await fetch("/api/push/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						endpoint: json.endpoint,
						keys: json.keys,
					}),
				});
				if (postRes.ok) {
					setSubscribed(true);
				}
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex items-center justify-between">
			<div>
				<p className="text-sm font-medium text-gray-900">プッシュ通知</p>
				<p className="text-xs text-gray-500">好条件の2日前にお知らせします</p>
			</div>
			<button
				type="button"
				onClick={handleToggle}
				disabled={loading}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
					subscribed ? "bg-sky-600" : "bg-gray-200"
				} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
				aria-label={subscribed ? "通知をオフにする" : "通知をオンにする"}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
						subscribed ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</button>
		</div>
	);
}
