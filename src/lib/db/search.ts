import { getDb } from "../../db/client";
import { scoreToLabel } from "../../types/score";
import { haversineKm } from "../utils/haversine";

export interface SpotSearchResult {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
	type: string;
	prefecture: string;
	is_favorite: 0 | 1;
	distanceKm: number;
	score: number | null;
	label: "◎" | "○" | "△" | "×" | null;
	bestHour: number | null;
}

interface SpotScoreRow {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
	type: string;
	prefecture: string;
	is_favorite: 0 | 1;
	score: number | null;
	bestHour: number | null;
}

/**
 * Returns all spots with their daily score for the given date,
 * filtered to within maxDistanceKm from (homeLat, homeLng),
 * sorted by score descending.
 */
export function searchSpotsByDistance(
	homeLat: number,
	homeLng: number,
	date: string,
	maxDistanceKm: number,
): SpotSearchResult[] {
	const db = getDb();

	const rows = db
		.prepare(
			`SELECT
        s.id, s.name, s.latitude, s.longitude, s.type, s.prefecture, s.is_favorite,
        sc.score,
        (
          SELECT MIN(h.hour)
          FROM scores AS h
          WHERE h.spot_id = s.id
            AND h.date = sc.date
            AND h.hour IS NOT NULL
            AND h.score = (
              SELECT MAX(hm.score) FROM scores AS hm
              WHERE hm.spot_id = s.id AND hm.date = sc.date AND hm.hour IS NOT NULL
            )
        ) AS bestHour
       FROM spots s
       LEFT JOIN scores sc
         ON sc.spot_id = s.id AND sc.date = ? AND sc.hour IS NULL AND sc.best_time_flag = 1
       ORDER BY sc.score DESC NULLS LAST`,
		)
		.all(date) as SpotScoreRow[];

	return rows
		.map((r) => ({
			...r,
			distanceKm: haversineKm(homeLat, homeLng, r.latitude, r.longitude),
			label: r.score != null ? scoreToLabel(r.score) : null,
		}))
		.filter((r) => r.distanceKm <= maxDistanceKm)
		.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
