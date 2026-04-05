/**
 * User settings DB helpers.
 * There is always exactly one row (id = 1) in user_settings.
 */

import { getDb } from "../../db/client";
import { DEFAULT_WEIGHTS } from "../../types/score";
import type { ScoreWeights } from "../../types/score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserSettings {
	home_latitude: number | null;
	home_longitude: number | null;
	notification_enabled: boolean;
	notification_timing: string;
	score_weights: ScoreWeights;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getSettings(): UserSettings {
	const db = getDb();
	const row = db.prepare("SELECT * FROM user_settings WHERE id = 1").get() as
		| {
				home_latitude: number | null;
				home_longitude: number | null;
				notification_enabled: 0 | 1;
				notification_timing: string;
				score_weights: string;
		  }
		| undefined;

	if (!row) {
		return {
			home_latitude: null,
			home_longitude: null,
			notification_enabled: false,
			notification_timing: "2days_before",
			score_weights: { ...DEFAULT_WEIGHTS },
		};
	}

	let score_weights: ScoreWeights = { ...DEFAULT_WEIGHTS };
	try {
		const parsed = JSON.parse(row.score_weights) as Partial<ScoreWeights>;
		score_weights = { ...DEFAULT_WEIGHTS, ...parsed };
	} catch {
		// Keep defaults if JSON is invalid
	}

	return {
		home_latitude: row.home_latitude,
		home_longitude: row.home_longitude,
		notification_enabled: row.notification_enabled === 1,
		notification_timing: row.notification_timing,
		score_weights,
	};
}

export function saveSettings(input: Partial<UserSettings>): void {
	const db = getDb();
	const updates: string[] = ["updated_at = datetime('now')"];
	const params: Record<string, unknown> = {};

	if (input.home_latitude !== undefined) {
		updates.push("home_latitude = @home_latitude");
		params.home_latitude = input.home_latitude;
	}
	if (input.home_longitude !== undefined) {
		updates.push("home_longitude = @home_longitude");
		params.home_longitude = input.home_longitude;
	}
	if (input.notification_enabled !== undefined) {
		updates.push("notification_enabled = @notification_enabled");
		params.notification_enabled = input.notification_enabled ? 1 : 0;
	}
	if (input.notification_timing !== undefined) {
		updates.push("notification_timing = @notification_timing");
		params.notification_timing = input.notification_timing;
	}
	if (input.score_weights !== undefined) {
		updates.push("score_weights = @score_weights");
		params.score_weights = JSON.stringify(input.score_weights);
	}

	if (updates.length === 1) return; // only timestamp — nothing to do

	db.prepare(`UPDATE user_settings SET ${updates.join(", ")} WHERE id = 1`).run(params);
}
