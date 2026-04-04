import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createSpot, deleteSpot, getAllSpots, toggleFavorite, updateSpot } from "../spots-crud";

// ---------------------------------------------------------------------------
// Minimal in-memory DB setup
// ---------------------------------------------------------------------------

let db: ReturnType<typeof Database>;

// Patch getDb to return the test DB
vi.mock("../../../db/client", () => ({
	getDb: () => db,
}));

import { vi } from "vitest";

beforeEach(() => {
	db = new Database(":memory:");
	db.exec(`
    CREATE TABLE spots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('漁港', '磯', 'サーフ', '堤防', 'その他')),
      prefecture TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_preset INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
});

afterEach(() => {
	db.close();
});

// ---------------------------------------------------------------------------
// createSpot
// ---------------------------------------------------------------------------

describe("createSpot", () => {
	it("inserts a new spot and returns it with an id", () => {
		const spot = createSpot({
			name: "テスト漁港",
			latitude: 37.0,
			longitude: 141.0,
			type: "漁港",
			prefecture: "福島県",
		});
		expect(spot.id).toBeGreaterThan(0);
		expect(spot.name).toBe("テスト漁港");
		expect(spot.is_favorite).toBe(0);
		expect(spot.is_preset).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// updateSpot
// ---------------------------------------------------------------------------

describe("updateSpot", () => {
	it("updates name and returns the updated spot", () => {
		const created = createSpot({
			name: "旧名",
			latitude: 37.0,
			longitude: 141.0,
			type: "磯",
			prefecture: "宮城県",
		});
		const updated = updateSpot(created.id, { name: "新名" });
		expect(updated?.name).toBe("新名");
		expect(updated?.type).toBe("磯");
	});

	it("returns null for non-existent id", () => {
		const result = updateSpot(9999, { name: "X" });
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// deleteSpot
// ---------------------------------------------------------------------------

describe("deleteSpot", () => {
	it("deletes an existing spot and returns true", () => {
		const spot = createSpot({
			name: "消えるポイント",
			latitude: 33.0,
			longitude: 134.0,
			type: "サーフ",
			prefecture: "高知県",
		});
		expect(deleteSpot(spot.id)).toBe(true);
	});

	it("returns false for non-existent id", () => {
		expect(deleteSpot(9999)).toBe(false);
	});

	it("cannot delete a preset spot", () => {
		db.exec(`
      INSERT INTO spots (name, latitude, longitude, type, prefecture, is_preset)
      VALUES ('プリセット漁港', 37.0, 141.0, '漁港', '福島県', 1)
    `);
		const preset = db.prepare("SELECT id FROM spots WHERE name = 'プリセット漁港'").get() as {
			id: number;
		};
		expect(deleteSpot(preset.id)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// toggleFavorite
// ---------------------------------------------------------------------------

describe("toggleFavorite", () => {
	it("toggles from 0 to 1 then back to 0", () => {
		const spot = createSpot({
			name: "テスト",
			latitude: 37.0,
			longitude: 141.0,
			type: "堤防",
			prefecture: "福島県",
		});
		expect(spot.is_favorite).toBe(0);
		expect(toggleFavorite(spot.id)).toBe(1);
		expect(toggleFavorite(spot.id)).toBe(0);
	});

	it("returns null for non-existent spot", () => {
		expect(toggleFavorite(9999)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getAllSpots
// ---------------------------------------------------------------------------

describe("getAllSpots", () => {
	it("returns all spots ordered by favorite then preset then name", () => {
		createSpot({
			name: "Z堤防",
			latitude: 37.0,
			longitude: 141.0,
			type: "堤防",
			prefecture: "福島県",
		});
		createSpot({
			name: "A漁港",
			latitude: 37.1,
			longitude: 141.1,
			type: "漁港",
			prefecture: "福島県",
		});
		const spots = getAllSpots();
		expect(spots).toHaveLength(2);
		// non-favorite: sorted by name
		expect(spots[0].name).toBe("A漁港");
		expect(spots[1].name).toBe("Z堤防");
	});
});
