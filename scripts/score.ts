/**
 * Score batch runner.
 * Re-uses cached weather data already in the DB to compute and persist scores.
 * NOTE: tide cycle (大潮/中潮 etc.) is NOT stored in the DB cache.
 * Run `npx tsx scripts/run-batch.ts` instead, which collects + scores in one
 * pipeline so tide-cycle data is available in memory.
 *
 * This script is useful when you want to re-score without re-fetching data,
 * but it will fall back to a neutral (0.5) tide-cycle score.
 *
 * Usage:
 *   npx tsx scripts/score.ts
 */

import { runScoreBatch } from "../src/lib/batch/score-batch";
import { getDb } from "../src/db/client";
import { getTodayJST } from "../src/lib/utils";

function main() {
	console.log("=== tsuri-navi: score batch (no tide-cycle data) ===");

	const today = getTodayJST();
	const dates: string[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() + i);
		dates.push(d.toISOString().slice(0, 10));
	}
	console.log(`Scoring dates: ${dates[0]} … ${dates[dates.length - 1]}`);

	// No tide-cycle data available — pass empty maps (score-batch falls back to "")
	const result = runScoreBatch(dates, new Map());

	console.log(`Done: ${result.totalHourly} hourly rows, ${result.totalSummaries} summaries`);
	if (result.errors.length > 0) {
		console.warn(`Warnings (${result.errors.length}):`);
		for (const e of result.errors.slice(0, 10)) console.warn(`  ${e}`);
	}

	const db = getDb();
	db.close();
}

main();
