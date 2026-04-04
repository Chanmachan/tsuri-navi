import { getDb } from "../../db/client";
import type { PushSubscription } from "./index";

interface SubscriptionRow {
	id: number;
	endpoint: string;
	p256dh: string;
	auth: string;
	created_at: string;
}

export function saveSubscription(sub: PushSubscription): void {
	const db = getDb();
	db.prepare(
		`INSERT INTO push_subscriptions (endpoint, p256dh, auth)
     VALUES (@endpoint, @p256dh, @auth)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = @p256dh, auth = @auth`,
	).run({
		endpoint: sub.endpoint,
		p256dh: sub.keys.p256dh,
		auth: sub.keys.auth,
	});
}

export function deleteSubscription(endpoint: string): void {
	const db = getDb();
	db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export function getAllSubscriptions(): PushSubscription[] {
	const db = getDb();
	const rows = db
		.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions")
		.all() as SubscriptionRow[];
	return rows.map((r) => ({
		endpoint: r.endpoint,
		keys: { p256dh: r.p256dh, auth: r.auth },
	}));
}
