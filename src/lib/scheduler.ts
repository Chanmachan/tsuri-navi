/**
 * Daily batch scheduler.
 * Registered via instrumentation.ts on Next.js server startup.
 * Runs at 05:00 JST every day: collect → score → notify.
 * Also runs immediately on startup if no score data exists for today or later.
 */

import cron from "node-cron";
import { getDb } from "../db/client";
import { getTodayJST } from "./utils";
import { runFullBatch } from "./batch/run-all";
import { runNotifyBatch } from "./push/notify-batch";

let scheduled = false;

function hasUpToDateScores(): boolean {
	const db = getDb();
	const today = getTodayJST();
	const row = db
		.prepare("SELECT 1 FROM scores WHERE date >= ? AND hour IS NULL LIMIT 1")
		.get(today);
	return row !== undefined;
}

async function runBatch(): Promise<void> {
	const ts = new Date().toISOString();
	console.log(`[scheduler] ${ts} batch started`);

	try {
		const result = await runFullBatch();
		console.log(
			`[scheduler] batch done — collect: ${result.collectOk} ok / ${result.collectFail} fail, scores: ${result.totalHourly}h ${result.totalSummaries}d`,
		);
		for (const e of result.errors) {
			console.warn(`[scheduler] ${e}`);
		}
	} catch (err) {
		console.error(`[scheduler] batch error: ${String(err)}`);
	}

	try {
		const notifyResult = await runNotifyBatch();
		if (!notifyResult.skipped) {
			console.log(
				`[scheduler] notify done — sent: ${notifyResult.sent}, failed: ${notifyResult.failed}`,
			);
		}
	} catch (err) {
		console.warn(`[scheduler] notify error (skipping): ${String(err)}`);
	}
}

export function setupScheduler(): void {
	if (scheduled) return;
	scheduled = true;

	// Run immediately on startup if there is no score data for today or later
	if (!hasUpToDateScores()) {
		console.log("[scheduler] no current data found — running initial batch now");
		void runBatch();
	}

	cron.schedule("0 5 * * *", runBatch, { timezone: "Asia/Tokyo" });

	console.log("[scheduler] registered — daily batch at 05:00 JST");
}
