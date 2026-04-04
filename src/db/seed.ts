import { getDb } from "./client";
import type { SpotType } from "./schema";
import presetSpots from "../data/preset-spots.json";

interface PresetSpot {
	name: string;
	latitude: number;
	longitude: number;
	type: SpotType;
	prefecture: string;
}

export function seedPresetSpots(): void {
	const db = getDb();

	// Use WHERE NOT EXISTS so re-runs are safe even without a UNIQUE constraint on name.
	const insert = db.prepare(`
    INSERT INTO spots (name, latitude, longitude, type, prefecture, is_preset)
    SELECT @name, @latitude, @longitude, @type, @prefecture, 1
    WHERE NOT EXISTS (SELECT 1 FROM spots WHERE name = @name)
  `);

	const insertMany = db.transaction((spots: PresetSpot[]) => {
		for (const spot of spots) {
			insert.run(spot);
		}
	});

	insertMany(presetSpots as PresetSpot[]);

	console.log(`Seeded ${presetSpots.length} preset spots.`);
}

// Run directly: npx tsx src/db/seed.ts
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
	seedPresetSpots();
}
