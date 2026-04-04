/**
 * Spot CRUD helpers — create, update, delete, toggle favorite.
 */

import { getDb } from "../../db/client";
import type { Spot, SpotType } from "../../db/schema";

export interface CreateSpotInput {
	name: string;
	latitude: number;
	longitude: number;
	type: SpotType;
	prefecture: string;
}

export function createSpot(input: CreateSpotInput): Spot {
	const db = getDb();
	const { lastInsertRowid } = db
		.prepare(
			`INSERT INTO spots (name, latitude, longitude, type, prefecture, is_preset, is_favorite)
       VALUES (@name, @latitude, @longitude, @type, @prefecture, 0, 0)`,
		)
		.run(input);
	return db.prepare("SELECT * FROM spots WHERE id = ?").get(lastInsertRowid) as Spot;
}

export function updateSpot(
	id: number,
	input: Partial<Pick<CreateSpotInput, "name" | "type" | "prefecture">>,
): Spot | null {
	const db = getDb();
	const pairs = (Object.keys(input) as (keyof typeof input)[]).filter(
		(k) => input[k] !== undefined,
	);
	const findById = () =>
		(db.prepare("SELECT * FROM spots WHERE id = ?").get(id) as Spot | undefined) ?? null;

	if (pairs.length === 0) return findById();

	const setClause = pairs.map((k) => `${k} = @${k}`).join(", ");
	db.prepare(`UPDATE spots SET ${setClause}, updated_at = datetime('now') WHERE id = @id`).run({
		...input,
		id,
	});

	return findById();
}

export function deleteSpot(id: number): boolean {
	const db = getDb();
	const { changes } = db.prepare("DELETE FROM spots WHERE id = ?").run(id);
	return changes > 0;
}

/**
 * Toggle is_favorite for the given spot.
 * Returns the new is_favorite value (1 = favorited, 0 = unfavorited).
 */
export function toggleFavorite(id: number): 0 | 1 {
	const db = getDb();
	db.prepare(
		`UPDATE spots
     SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
         updated_at = datetime('now')
     WHERE id = ?`,
	).run(id);
	const row = db.prepare("SELECT is_favorite FROM spots WHERE id = ?").get(id) as
		| { is_favorite: 0 | 1 }
		| undefined;
	return row?.is_favorite ?? 0;
}

export function getAllSpots(): Spot[] {
	const db = getDb();
	return db
		.prepare("SELECT * FROM spots ORDER BY is_favorite DESC, is_preset DESC, name")
		.all() as Spot[];
}
