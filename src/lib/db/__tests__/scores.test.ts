import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDailyScore, getAllSpotsWithTodayScore, getWeeklyScores } from "../scores";
import { getDb } from "../../../db/client";

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
				db.exec(`
          CREATE TABLE IF NOT EXISTS spots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            latitude REAL NOT NULL DEFAULT 0,
            longitude REAL NOT NULL DEFAULT 0,
            type TEXT NOT NULL DEFAULT '漁港',
            prefecture TEXT NOT NULL DEFAULT '福島',
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_preset INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            hour INTEGER CHECK (hour BETWEEN 0 AND 23),
            score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
            score_breakdown TEXT NOT NULL DEFAULT '{}',
            best_time_flag INTEGER NOT NULL DEFAULT 0,
            calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (spot_id, date, hour)
          );
          CREATE INDEX IF NOT EXISTS idx_scores_spot_date ON scores (spot_id, date);
        `);
			}
			return db;
		},
	};
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function insertSpot(name: string): number {
	const db = getDb();
	return (db.prepare(`INSERT INTO spots (name) VALUES (?)`).run(name)
		.lastInsertRowid as number);
}

function insertDailySummary(spotId: number, date: string, score: number): void {
	getDb()
		.prepare(
			`INSERT OR REPLACE INTO scores (spot_id, date, hour, score, best_time_flag)
       VALUES (?, ?, NULL, ?, 1)`,
		)
		.run(spotId, date, score);
}

function insertHourlyScore(
	spotId: number,
	date: string,
	hour: number,
	score: number,
): void {
	getDb()
		.prepare(
			`INSERT OR REPLACE INTO scores (spot_id, date, hour, score, best_time_flag)
       VALUES (?, ?, ?, ?, 0)`,
		)
		.run(spotId, date, hour, score);
}

afterEach(() => {
	const db = getDb();
	db.exec(`DELETE FROM scores; DELETE FROM spots;`);
});

// ---------------------------------------------------------------------------
// getDailyScore
// ---------------------------------------------------------------------------

describe("getDailyScore", () => {
	it("returns null when no score data exists", () => {
		const spotId = insertSpot("テスト港A");
		expect(getDailyScore(spotId, "2026-04-04")).toBeNull();
	});

	it("returns score and label for existing data", () => {
		const spotId = insertSpot("テスト港B");
		insertDailySummary(spotId, "2026-04-04", 85);
		insertHourlyScore(spotId, "2026-04-04", 6, 85);

		const result = getDailyScore(spotId, "2026-04-04");
		expect(result?.score).toBe(85);
		expect(result?.label).toBe("◎");
	});

	it("returns bestHour as the hour with the highest hourly score", () => {
		const spotId = insertSpot("テスト港C");
		insertDailySummary(spotId, "2026-04-04", 70);
		insertHourlyScore(spotId, "2026-04-04", 6, 60);
		insertHourlyScore(spotId, "2026-04-04", 18, 75);
		insertHourlyScore(spotId, "2026-04-04", 12, 40);

		const result = getDailyScore(spotId, "2026-04-04");
		expect(result?.bestHour).toBe(18);
	});

	it("picks earliest hour on tie for bestHour (deterministic)", () => {
		const spotId = insertSpot("テスト港D");
		insertDailySummary(spotId, "2026-04-04", 80);
		insertHourlyScore(spotId, "2026-04-04", 18, 80);
		insertHourlyScore(spotId, "2026-04-04", 6, 80);

		const result = getDailyScore(spotId, "2026-04-04");
		expect(result?.bestHour).toBe(6); // MIN(hour) wins on tie
	});
});

// ---------------------------------------------------------------------------
// getWeeklyScores
// ---------------------------------------------------------------------------

describe("getWeeklyScores", () => {
	it("returns empty array when no data", () => {
		const spotId = insertSpot("テスト港E");
		expect(getWeeklyScores(spotId, "2026-04-04", 7)).toEqual([]);
	});

	it("returns only scores within the calendar window", () => {
		const spotId = insertSpot("テスト港F");
		insertDailySummary(spotId, "2026-04-04", 75);
		insertDailySummary(spotId, "2026-04-05", 65);
		insertDailySummary(spotId, "2026-04-11", 80); // outside 7-day window

		const results = getWeeklyScores(spotId, "2026-04-04", 7);
		expect(results).toHaveLength(2);
		expect(results.map((r) => r.date)).toEqual(["2026-04-04", "2026-04-05"]);
	});

	it("assigns correct labels per spec thresholds", () => {
		const spotId = insertSpot("テスト港G");
		insertDailySummary(spotId, "2026-04-04", 85); // ◎
		insertDailySummary(spotId, "2026-04-05", 65); // ○
		insertDailySummary(spotId, "2026-04-06", 45); // △
		insertDailySummary(spotId, "2026-04-07", 30); // ×

		const results = getWeeklyScores(spotId, "2026-04-04", 7);
		expect(results.map((r) => r.label)).toEqual(["◎", "○", "△", "×"]);
	});
});

// ---------------------------------------------------------------------------
// getAllSpotsWithTodayScore
// ---------------------------------------------------------------------------

describe("getAllSpotsWithTodayScore", () => {
	it("includes spot with null todayScore when no score data exists", () => {
		insertSpot("テスト港H");
		const results = getAllSpotsWithTodayScore("2026-04-04");
		const spot = results.find((s) => s.name === "テスト港H");
		expect(spot).toBeDefined();
		expect(spot?.todayScore).toBeNull();
	});

	it("returns todayScore with score, label and bestHour", () => {
		const spotId = insertSpot("テスト港I");
		insertDailySummary(spotId, "2026-04-04", 72);
		insertHourlyScore(spotId, "2026-04-04", 5, 72);

		const results = getAllSpotsWithTodayScore("2026-04-04");
		const spot = results.find((s) => s.name === "テスト港I");
		expect(spot?.todayScore?.score).toBe(72);
		expect(spot?.todayScore?.label).toBe("○");
		expect(spot?.todayScore?.bestHour).toBe(5);
	});
});
