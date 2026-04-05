import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { getSettings, saveSettings } from "../settings";
import { DEFAULT_WEIGHTS } from "../../../types/score";

let db: ReturnType<typeof Database>;

vi.mock("../../../db/client", () => ({ getDb: () => db }));

beforeEach(() => {
	db = new Database(":memory:");
	db.exec(`
    CREATE TABLE user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_latitude REAL,
      home_longitude REAL,
      notification_enabled INTEGER NOT NULL DEFAULT 0,
      notification_timing TEXT NOT NULL DEFAULT '2days_before',
      score_weights TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO user_settings (id) VALUES (1);
  `);
});

afterEach(() => db.close());

describe("getSettings", () => {
	it("returns defaults when row has empty score_weights", () => {
		const s = getSettings();
		expect(s.notification_enabled).toBe(false);
		expect(s.home_latitude).toBeNull();
		expect(s.score_weights).toEqual(DEFAULT_WEIGHTS);
	});
});

describe("saveSettings", () => {
	it("persists home location", () => {
		saveSettings({ home_latitude: 37.0, home_longitude: 141.0 });
		const s = getSettings();
		expect(s.home_latitude).toBe(37.0);
		expect(s.home_longitude).toBe(141.0);
	});

	it("persists notification_enabled toggle", () => {
		saveSettings({ notification_enabled: true });
		expect(getSettings().notification_enabled).toBe(true);
		saveSettings({ notification_enabled: false });
		expect(getSettings().notification_enabled).toBe(false);
	});

	it("persists custom score weights", () => {
		const custom = { ...DEFAULT_WEIGHTS, tideCycle: 25, moon: 0 };
		saveSettings({ score_weights: custom });
		expect(getSettings().score_weights.tideCycle).toBe(25);
		expect(getSettings().score_weights.moon).toBe(0);
	});

	it("clears home location with null", () => {
		saveSettings({ home_latitude: 37.0, home_longitude: 141.0 });
		saveSettings({ home_latitude: null, home_longitude: null });
		const s = getSettings();
		expect(s.home_latitude).toBeNull();
		expect(s.home_longitude).toBeNull();
	});
});
