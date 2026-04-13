/**
 * Daily batch scheduler.
 * Registered via instrumentation.ts on Next.js server startup.
 * Runs at 05:00 JST every day: collect → score → notify.
 */

import cron from "node-cron";
import { runFullBatch } from "./batch/run-all";
import { runNotifyBatch } from "./push/notify-batch";

let scheduled = false;

export function setupScheduler(): void {
	if (scheduled) return;
	scheduled = true;

	cron.schedule(
		"0 5 * * *",
		async () => {
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
		},
		{ timezone: "Asia/Tokyo" },
	);

	console.log("[scheduler] registered — daily batch at 05:00 JST");
}
