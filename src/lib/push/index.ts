import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscription {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export interface PushPayload {
	title: string;
	body: string;
	url?: string;
}

export function getVapidPublicKey(): string {
	return VAPID_PUBLIC_KEY;
}

export async function sendPushNotification(
	subscription: PushSubscription,
	payload: PushPayload,
): Promise<void> {
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
		throw new Error(
			"VAPID keys are not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
		);
	}
	await webpush.sendNotification(
		{
			endpoint: subscription.endpoint,
			keys: {
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
			},
		},
		JSON.stringify(payload),
	);
}
