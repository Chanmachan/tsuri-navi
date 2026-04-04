/**
 * Static fish × season × region master data.
 * region values must match the `prefecture` stored in the spots table
 * (or the helper maps them to a broad region key below).
 */

export interface FishEntry {
	fish: string;
	method: string;
	bait: string;
	note?: string;
}

export interface MonthlyFishData {
	/** 1–12 */
	months: number[];
	entries: FishEntry[];
}

/** Broad region key derived from prefecture */
export type RegionKey = "iwaki" | "miyagi" | "shikoku";

export const REGION_MAP: Record<string, RegionKey> = {
	福島: "iwaki",
	宮城: "miyagi",
	高知: "shikoku",
	徳島: "shikoku",
	愛媛: "shikoku",
	香川: "shikoku",
};

/** Fish data keyed by region → list of monthly entries */
export const FISH_SEASONS: Record<RegionKey, MonthlyFishData[]> = {
	iwaki: [
		{
			months: [3, 4, 5],
			entries: [
				{ fish: "メバル", method: "ウキ釣り・アジング", bait: "虫エサ・ワーム" },
				{ fish: "カレイ", method: "投げ釣り", bait: "イシゴカイ・アオイソメ" },
				{ fish: "アイナメ", method: "胴突き・穴釣り", bait: "イシゴカイ" },
			],
		},
		{
			months: [5, 6, 7, 8, 9],
			entries: [
				{ fish: "クロダイ（チヌ）", method: "ウキ釣り・フカセ釣り", bait: "オキアミ・コーン" },
				{ fish: "シロギス", method: "投げ釣り", bait: "イシゴカイ・アオイソメ" },
				{ fish: "アジ", method: "サビキ釣り・アジング", bait: "アミコマセ・ワーム" },
			],
		},
		{
			months: [7, 8, 9, 10],
			entries: [
				{
					fish: "イナダ（ワカシ）",
					method: "ショアジギング・カゴ釣り",
					bait: "メタルジグ・コマセ+ウキ",
				},
				{
					fish: "タチウオ",
					method: "ウキ釣り・テンヤ",
					bait: "キビナゴ・ワーム",
					note: "夜釣りが効果的",
				},
			],
		},
		{
			months: [10, 11, 12],
			entries: [
				{ fish: "アイナメ", method: "胴突き・穴釣り", bait: "イシゴカイ" },
				{
					fish: "カレイ",
					method: "投げ釣り",
					bait: "イシゴカイ・アオイソメ",
					note: "秋の荒食い期",
				},
				{ fish: "メバル", method: "ウキ釣り", bait: "虫エサ・ワーム" },
			],
		},
		{
			months: [1, 2, 3],
			entries: [
				{ fish: "カレイ", method: "投げ釣り", bait: "イシゴカイ・アオイソメ" },
				{ fish: "アイナメ", method: "穴釣り", bait: "イシゴカイ" },
			],
		},
	],
	miyagi: [
		{
			months: [3, 4, 5],
			entries: [
				{ fish: "メバル", method: "ウキ釣り・メバリング", bait: "虫エサ・ワーム" },
				{ fish: "カレイ", method: "投げ釣り", bait: "イシゴカイ・アオイソメ" },
				{ fish: "ソイ", method: "胴突き・穴釣り", bait: "イシゴカイ・ワーム" },
			],
		},
		{
			months: [6, 7, 8, 9],
			entries: [
				{ fish: "アジ", method: "サビキ釣り", bait: "アミコマセ" },
				{ fish: "クロダイ", method: "フカセ釣り", bait: "オキアミ" },
				{ fish: "マゴチ", method: "ルアー・泳がせ", bait: "メタルジグ・小魚" },
			],
		},
		{
			months: [9, 10, 11],
			entries: [
				{ fish: "サバ", method: "サビキ・ジギング", bait: "アミコマセ・メタルジグ" },
				{ fish: "ヒラメ", method: "泳がせ・ルアー", bait: "アジ・メタルジグ" },
				{ fish: "カレイ", method: "投げ釣り", bait: "イシゴカイ" },
			],
		},
		{
			months: [12, 1, 2],
			entries: [
				{ fish: "カレイ", method: "投げ釣り", bait: "イシゴカイ・アオイソメ" },
				{ fish: "アイナメ", method: "穴釣り・胴突き", bait: "イシゴカイ" },
			],
		},
	],
	shikoku: [
		{
			months: [3, 4, 5, 6],
			entries: [
				{ fish: "メバル", method: "ウキ釣り・メバリング", bait: "虫エサ・ワーム" },
				{ fish: "チヌ（クロダイ）", method: "フカセ釣り・ダンゴ釣り", bait: "オキアミ・コーン" },
				{
					fish: "グレ（メジナ）",
					method: "フカセ釣り",
					bait: "オキアミ",
					note: "磯場が好ポイント",
				},
			],
		},
		{
			months: [5, 6, 7, 8, 9],
			entries: [
				{ fish: "アジ", method: "アジング・サビキ", bait: "ワーム・アミコマセ" },
				{
					fish: "カツオ",
					method: "カゴ釣り・ジギング",
					bait: "コマセ+ウキ・メタルジグ",
					note: "回遊シーズン",
				},
				{
					fish: "シイラ",
					method: "ショアジギング・ポッパー",
					bait: "メタルジグ・トップウォーター",
				},
			],
		},
		{
			months: [9, 10, 11, 12],
			entries: [
				{ fish: "ヒラメ", method: "泳がせ・ルアー", bait: "アジ・ワーム" },
				{ fish: "チヌ", method: "フカセ釣り", bait: "オキアミ" },
				{
					fish: "太刀魚（タチウオ）",
					method: "ウキ釣り・テンヤ",
					bait: "キビナゴ",
					note: "夕マズメ以降が好調",
				},
			],
		},
		{
			months: [11, 12, 1, 2, 3],
			entries: [
				{ fish: "グレ（メジナ）", method: "フカセ釣り", bait: "オキアミ", note: "冬グレシーズン" },
				{ fish: "カサゴ", method: "穴釣り・胴突き", bait: "イシゴカイ・ワーム" },
			],
		},
	],
};

/**
 * Get fish recommendations for a given prefecture and month (1-12).
 */
export function getFishRecommendations(prefecture: string, month: number): FishEntry[] {
	const regionKey = REGION_MAP[prefecture];
	if (!regionKey) return [];

	const seasons = FISH_SEASONS[regionKey];
	const seen = new Set<string>();
	const result: FishEntry[] = [];

	for (const season of seasons) {
		if (season.months.includes(month)) {
			for (const entry of season.entries) {
				if (!seen.has(entry.fish)) {
					seen.add(entry.fish);
					result.push(entry);
				}
			}
		}
	}
	return result;
}
