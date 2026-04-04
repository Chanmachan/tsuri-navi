/**
 * Full batch runner: collect → score.
 * Run this daily (e.g. via cron) to refresh all data.
 *
 * Usage:
 *   npx tsx scripts/run-batch.ts
 */

import { seedPresetSpots } from "../src/db/seed";
import { saveCollectedData } from "../src/lib/db/cache";
import { collectSpotData } from "../src/lib/batch/collector";
import { runScoreBatchForSpot } from "../src/lib/batch/score-batch";
import { getDb, closeDb } from "../src/db/client";
import type { Spot } from "../src/db/schema";

async function main() {
	console.log("=== tsuri-navi: full batch (collect + score) ===\n");

	seedPresetSpots();

	const db = getDb();
	const spots = db.prepare("SELECT * FROM spots").all() as Spot[];
	console.log(`Spots: ${spots.length}\n`);

	let collectOk = 0;
	let collectFail = 0;
	let totalHourly = 0;
	let totalSummaries = 0;

	for (const spot of spots) {
		process.stdout.write(`[${spot.id}] ${spot.name}\n  collect ... `);

		// ── Collect ──────────────────────────────────────────────────────────
		let data;
		try {
			data = await collectSpotData(spot, new Date(), 7);
			saveCollectedData(data);
			if (data.errors.length > 0) {
				console.log(`⚠  ${data.errors[0]}`);
			} else {
				console.log("✓");
			}
			collectOk++;
		} catch (err) {
			console.log(`✗ collect failed: ${(err as Error).message}`);
			collectFail++;
			continue; // skip scoring if no data
		}

		// ── Score ─────────────────────────────────────────────────────────────
		process.stdout.write("  score  ... ");
		try {
			// Build Map<date, tideType> from the just-collected daily tide types
			const tideTypeByDate = new Map<string, string>(
				data.dailyTideTypes.map((t) => [t.date, t.tideType]),
			);
			const dates = data.hourly.map((h) => h.date).filter((v, i, a) => a.indexOf(v) === i); // unique dates

			const result = runScoreBatchForSpot(spot, dates, tideTypeByDate);
			totalHourly += result.hourlyCount;
			totalSummaries += result.summaryCount;

			if (result.errors.length > 0) {
				console.log(`⚠  ${result.errors[0]}`);
			} else {
				console.log(`✓  (${result.hourlyCount}h, ${result.summaryCount}d)`);
			}
		} catch (err) {
			console.log(`✗ score failed: ${(err as Error).message}`);
		}
	}

	console.log(`
=== Summary ===
Collect : ${collectOk} ok, ${collectFail} failed
Scores  : ${totalHourly} hourly rows, ${totalSummaries} daily summaries
`);

	closeDb();
	process.exit(collectFail > 0 ? 1 : 0);
}

main();
