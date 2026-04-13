/**
 * Full batch: collect → score for all spots.
 * Used by the scheduler (instrumentation.ts) and scripts/run-batch.ts.
 */

import { getDb } from "../../db/client";
import { seedPresetSpots } from "../../db/seed";
import type { Spot } from "../../db/schema";
import { saveCollectedData } from "../db/cache";
import { collectSpotData } from "./collector";
import { runScoreBatchForSpot } from "./score-batch";

export interface FullBatchResult {
	collectOk: number;
	collectFail: number;
	totalHourly: number;
	totalSummaries: number;
	errors: string[];
}

export async function runFullBatch(): Promise<FullBatchResult> {
	seedPresetSpots();

	const batchStart = new Date();
	const db = getDb();
	const spots = db.prepare("SELECT * FROM spots").all() as Spot[];

	let collectOk = 0;
	let collectFail = 0;
	let totalHourly = 0;
	let totalSummaries = 0;
	const errors: string[] = [];

	for (const spot of spots) {
		let data;
		try {
			data = await collectSpotData(spot, batchStart, 7);
			saveCollectedData(data);
			if (data.errors.length > 0) {
				errors.push(...data.errors.map((e) => `[${spot.name}] ${e}`));
			}
			collectOk++;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`[${spot.name}] collect failed: ${msg}`);
			collectFail++;
			continue;
		}

		try {
			const tideTypeByDate = new Map<string, string>(
				data.dailyTideTypes.map((t) => [t.date, t.tideType]),
			);
			const dates = [...new Set(data.hourly.map((h) => h.date))];
			const result = runScoreBatchForSpot(spot, dates, tideTypeByDate);
			totalHourly += result.hourlyCount;
			totalSummaries += result.summaryCount;
			if (result.errors.length > 0) {
				errors.push(...result.errors.map((e) => `[${spot.name}] ${e}`));
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`[${spot.name}] score failed: ${msg}`);
		}
	}

	return { collectOk, collectFail, totalHourly, totalSummaries, errors };
}
