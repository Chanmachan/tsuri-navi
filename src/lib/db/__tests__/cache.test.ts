import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectedSpotData } from "../../batch/collector";
import { clearCache, getCachedHour, getCachedHourly, isCacheFresh, saveCollectedData } from "../cache";

// ---------------------------------------------------------------------------
// Mock the db client to use an in-memory database for tests
// ---------------------------------------------------------------------------

vi.mock("../../../db/client", () => {
	let db: Database.Database | null = null;
	return {
		getDb: () => {
			if (!db) {
				db = new Database(":memory:");
				db.pragma("journal_mode = WAL");
				db.pragma("foreign_keys = ON");
				// Minimal schema needed for cache tests
				db.exec(`
          CREATE TABLE IF NOT EXISTS spots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            type TEXT NOT NULL DEFAULT '漁港',
            prefecture TEXT NOT NULL DEFAULT '福島',
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_preset INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS weather_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
            weather_code INTEGER,
            temperature REAL,
            wind_speed REAL,
            wind_direction REAL,
            precipitation REAL,
            pressure REAL,
            wave_height REAL,
            swell_height REAL,
            tide_level REAL,
            tide_type TEXT,
            sunrise TEXT,
            sunset TEXT,
            moon_age REAL,
            fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (spot_id, date, hour)
          );
        `);
				// Insert a test spot
				db.prepare(
					"INSERT INTO spots (id, name, latitude, longitude, type, prefecture) VALUES (1, '久ノ浜漁港', 37.05, 140.97, '漁港', '福島')",
				).run();
			}
			return db;
		},
		closeDb: () => {
			/* no-op for tests */
		},
	};
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCollectedData(
	overrides: Partial<CollectedSpotData> = {},
): CollectedSpotData {
	return {
		spotId: 1,
		hourly: [
			{
				date: "2026-04-04",
				hour: 6,
				weatherCode: 1,
				temperature: 14.5,
				windSpeed: 3.5,
				windDirection: 210,
				precipitation: 0,
				pressure: 1013,
				waveHeight: 0.8,
				swellHeight: 0.5,
				tideLevel: 150,
				tideType: "満潮",
				sunrise: "05:20",
				sunset: "18:05",
				moonAge: 16.3,
			},
			{
				date: "2026-04-04",
				hour: 12,
				weatherCode: 2,
				temperature: 18.0,
				windSpeed: 5.0,
				windDirection: 220,
				precipitation: 0,
				pressure: 1011,
				waveHeight: 1.0,
				swellHeight: 0.7,
				tideLevel: 30,
				tideType: "干潮",
				sunrise: "05:20",
				sunset: "18:05",
				moonAge: 16.3,
			},
		],
		dailyTideTypes: [{ date: "2026-04-04", tideType: "大潮" }],
		errors: [],
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("saveCollectedData / getCachedHourly", () => {
	afterEach(() => {
		clearCache(1);
	});

	it("saves hourly rows and retrieves them by spot + date", () => {
		saveCollectedData(makeCollectedData());
		const rows = getCachedHourly(1, "2026-04-04");
		expect(rows).toHaveLength(2);
	});

	it("persists all weather fields correctly", () => {
		saveCollectedData(makeCollectedData());
		const rows = getCachedHourly(1, "2026-04-04");
		const row = rows.find((r) => r.hour === 6);
		expect(row?.weather_code).toBe(1);
		expect(row?.temperature).toBe(14.5);
		expect(row?.wind_speed).toBe(3.5);
		expect(row?.wind_direction).toBe(210);
		expect(row?.precipitation).toBe(0);
		expect(row?.pressure).toBe(1013);
	});

	it("persists marine fields correctly", () => {
		saveCollectedData(makeCollectedData());
		const row = getCachedHour(1, "2026-04-04", 6);
		expect(row?.wave_height).toBe(0.8);
		expect(row?.swell_height).toBe(0.5);
	});

	it("persists tide fields correctly", () => {
		saveCollectedData(makeCollectedData());
		const row = getCachedHour(1, "2026-04-04", 6);
		expect(row?.tide_level).toBe(150);
		expect(row?.tide_type).toBe("満潮");
	});

	it("persists astronomical fields correctly", () => {
		saveCollectedData(makeCollectedData());
		const row = getCachedHour(1, "2026-04-04", 6);
		expect(row?.sunrise).toBe("05:20");
		expect(row?.sunset).toBe("18:05");
		expect(row?.moon_age).toBeCloseTo(16.3);
	});

	it("upserts on re-save (no duplicate rows)", () => {
		saveCollectedData(makeCollectedData());
		saveCollectedData(makeCollectedData());
		const rows = getCachedHourly(1, "2026-04-04");
		expect(rows).toHaveLength(2); // still 2, not 4
	});

	it("handles null fields without error", () => {
		const data = makeCollectedData();
		data.hourly[0].waveHeight = null;
		data.hourly[0].tideLevel = null;
		data.hourly[0].tideType = null;
		saveCollectedData(data);
		const row = getCachedHour(1, "2026-04-04", 6);
		expect(row?.wave_height).toBeNull();
		expect(row?.tide_level).toBeNull();
		expect(row?.tide_type).toBeNull();
	});
});

describe("getCachedHour", () => {
	afterEach(() => {
		clearCache(1);
	});

	it("returns the row for a specific hour", () => {
		saveCollectedData(makeCollectedData());
		const row = getCachedHour(1, "2026-04-04", 12);
		expect(row?.hour).toBe(12);
		expect(row?.temperature).toBe(18.0);
	});

	it("returns undefined for a non-existent hour", () => {
		saveCollectedData(makeCollectedData());
		const row = getCachedHour(1, "2026-04-04", 0);
		expect(row).toBeUndefined();
	});
});

describe("isCacheFresh", () => {
	afterEach(() => {
		clearCache(1);
	});

	it("returns false when no data exists", () => {
		expect(isCacheFresh(1, "2026-04-04")).toBe(false);
	});

	it("returns true immediately after saving", () => {
		saveCollectedData(makeCollectedData());
		expect(isCacheFresh(1, "2026-04-04")).toBe(true);
	});

	it("returns false when maxAgeHours is 0", () => {
		saveCollectedData(makeCollectedData());
		// maxAgeHours=0 means any data is stale
		expect(isCacheFresh(1, "2026-04-04", 0)).toBe(false);
	});
});

describe("clearCache", () => {
	it("removes all rows for the spot", () => {
		saveCollectedData(makeCollectedData());
		clearCache(1);
		expect(getCachedHourly(1, "2026-04-04")).toHaveLength(0);
	});
});
