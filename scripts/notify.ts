/**
 * Push notification batch.
 * Finds spots with a good score (≥60) for the date 2 days from now
 * and sends push notifications to all registered subscriptions.
 *
 * Usage:
 *   npx tsx scripts/notify.ts
 */

import { getTodayJST } from "../src/lib/utils";
import { getDb, closeDb } from "../src/db/client";
import {
	assertPushConfigured,
	sendPushNotification,
	type PushPayload,
} from "../src/lib/push/index";
import { deleteSubscription, getAllSubscriptions } from "../src/lib/push/subscriptions";

interface ScoreRow {
	spot_id: number;
	spot_name: string;
	score: number;
}

const NOTIFY_SCORE_THRESHOLD = 60;

function getTargetDate(): string {
	const today = getTodayJST();
	const fmt = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const targetMs = new Date(`${today}T00:00:00+09:00`).getTime() + 2 * 86_400_000;
	return fmt.format(new Date(targetMs));
}

function getGoodSpots(date: string): ScoreRow[] {
	const db = getDb();
	return db
		.prepare(
			`SELECT s.id AS spot_id, s.name AS spot_name, sc.score
       FROM scores sc
       JOIN spots s ON s.id = sc.spot_id
       WHERE sc.date = ? AND sc.hour IS NULL AND sc.best_time_flag = 1
         AND sc.score >= ?
       ORDER BY sc.score DESC`,
		)
		.all(date, NOTIFY_SCORE_THRESHOLD) as ScoreRow[];
}

async function main() {
	console.log("=== tsuri-navi: push notification batch ===");

	const targetDate = getTargetDate();
	console.log(`Target date: ${targetDate}`);

	const spots = getGoodSpots(targetDate);
	if (spots.length === 0) {
		console.log("No spots with good conditions — no notifications sent.");
		closeDb();
		return;
	}

	console.log(`Good spots (${spots.length}): ${spots.map((s) => s.spot_name).join(", ")}`);

	assertPushConfigured();

	const subscriptions = getAllSubscriptions();
	if (subscriptions.length === 0) {
		console.log("No push subscriptions registered.");
		closeDb();
		return;
	}

	const bestSpot = spots[0];
	const payload: PushPayload = {
		title: "釣りナビ：好条件の予報",
		body:
			spots.length === 1
				? `${targetDate} は ${bestSpot.spot_name} が好条件（スコア ${bestSpot.score}）です！`
				: `${targetDate} は ${bestSpot.spot_name} など ${spots.length} 箇所が好条件です！`,
		url: `/spots/${bestSpot.spot_id}`,
	};

	let sent = 0;
	let failed = 0;
	for (const sub of subscriptions) {
		try {
			await sendPushNotification(sub, payload);
			sent++;
		} catch (err) {
			const statusCode = (err as { statusCode?: number }).statusCode;
			if (statusCode === 404 || statusCode === 410) {
				deleteSubscription(sub.endpoint);
			}
			const preview = `${sub.endpoint.slice(0, 24)}…`;
			console.warn(`Failed to send to ${preview}: ${String(err)}`);
			failed++;
		}
	}

	console.log(`Done: sent=${sent}, failed=${failed}`);
	closeDb();
}

main().catch((err) => {
	console.error(err);
	closeDb();
	process.exit(1);
});
