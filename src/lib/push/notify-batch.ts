/**
 * Push notification batch logic.
 * Used by the scheduler (instrumentation.ts) and scripts/notify.ts.
 */

import { getDb } from "../../db/client";
import { getTodayJST } from "../utils";
import { deleteSubscription, getAllSubscriptions } from "./subscriptions";
import { sendPushNotification, type PushPayload } from "./index";

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

export interface NotifyBatchResult {
	targetDate: string;
	goodSpotCount: number;
	sent: number;
	failed: number;
	skipped: boolean;
}

export async function runNotifyBatch(): Promise<NotifyBatchResult> {
	const targetDate = getTargetDate();
	const spots = getGoodSpots(targetDate);

	if (spots.length === 0) {
		return { targetDate, goodSpotCount: 0, sent: 0, failed: 0, skipped: true };
	}

	const subscriptions = getAllSubscriptions();
	if (subscriptions.length === 0) {
		return { targetDate, goodSpotCount: spots.length, sent: 0, failed: 0, skipped: true };
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

	const results = await Promise.allSettled(
		subscriptions.map(async (sub) => {
			try {
				await sendPushNotification(sub, payload);
				return true;
			} catch (err) {
				const statusCode = (err as { statusCode?: number }).statusCode;
				if (statusCode === 404 || statusCode === 410) {
					deleteSubscription(sub.endpoint);
				}
				return false;
			}
		}),
	);

	let sent = 0;
	let failed = 0;
	for (const result of results) {
		if (result.status === "fulfilled" && result.value) sent++;
		else failed++;
	}

	return { targetDate, goodSpotCount: spots.length, sent, failed, skipped: false };
}
