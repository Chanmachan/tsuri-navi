/**
 * Data collection batch runner.
 * Fetches weather/marine/tide data for all spots and saves to DB cache.
 *
 * Usage:
 *   npx tsx scripts/collect.ts
 */

import { seedPresetSpots } from "../src/db/seed";
import { saveCollectedData } from "../src/lib/db/cache";
import { collectSpotData } from "../src/lib/batch/collector";
import { getDb } from "../src/db/client";
import type { Spot } from "../src/db/schema";

async function main() {
	console.log("=== tsuri-navi: data collection ===");

	// Ensure preset spots are seeded
	seedPresetSpots();

	const db = getDb();
	const spots = db.prepare("SELECT * FROM spots").all() as Spot[];
	console.log(`Found ${spots.length} spots.`);

	let ok = 0;
	let fail = 0;

	for (const spot of spots) {
		process.stdout.write(`  [${spot.id}] ${spot.name} ... `);
		try {
			const data = await collectSpotData(spot, new Date(), 7);
			saveCollectedData(data);
			if (data.errors.length > 0) {
				console.log(`⚠  (${data.errors.length} warning(s): ${data.errors[0]})`);
			} else {
				console.log("✓");
			}
			ok++;
		} catch (err) {
			console.log(`✗  ${(err as Error).message}`);
			fail++;
		}
	}

	console.log(`\nDone: ${ok} ok, ${fail} failed.`);
	process.exit(fail > 0 ? 1 : 0);
}

main();
