// DB schema type definitions

export type SpotType = "漁港" | "磯" | "サーフ" | "堤防" | "その他";
export type TideType = "満潮" | "干潮" | null;

export interface Spot {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
	type: SpotType;
	prefecture: string;
	is_favorite: 0 | 1;
	is_preset: 0 | 1;
	created_at: string;
	updated_at: string;
}

export interface FishSeason {
	id: number;
	fish_name: string;
	region: string;
	month_start: number;
	month_end: number;
	fishing_method: string;
	bait: string | null;
	notes: string | null;
}

export interface WeatherCache {
	id: number;
	spot_id: number;
	date: string;
	hour: number;
	weather_code: number | null;
	temperature: number | null;
	wind_speed: number | null;
	wind_direction: number | null;
	precipitation: number | null;
	pressure: number | null;
	wave_height: number | null;
	swell_height: number | null;
	tide_level: number | null;
	tide_type: TideType;
	sunrise: string | null;
	sunset: string | null;
	moon_age: number | null;
	fetched_at: string;
}

export interface ScoreBreakdown {
	tide?: number;
	wind?: number;
	wave?: number;
	weather?: number;
	mazdume?: number;
	pressure?: number;
	moon?: number;
}

export interface Score {
	id: number;
	spot_id: number;
	date: string;
	hour: number | null;
	score: number;
	score_breakdown: string; // JSON string of ScoreBreakdown
	best_time_flag: 0 | 1;
	calculated_at: string;
}

export interface UserSettings {
	id: number;
	home_latitude: number | null;
	home_longitude: number | null;
	notification_enabled: 0 | 1;
	notification_timing: string;
	score_weights: string; // JSON string
	updated_at: string;
}
