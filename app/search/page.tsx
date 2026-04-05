"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScoreLabel } from "../components/ScoreLabel";

// Leaflet must be loaded client-side only
const SearchMap = dynamic(() => import("../components/SearchMap"), { ssr: false });

interface SearchResult {
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

function getTodayJST(): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Tokyo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function getDateOptions(): string[] {
	const today = getTodayJST();
	return Array.from({ length: 7 }, (_, i) => {
		const ms = new Date(`${today}T00:00:00+09:00`).getTime() + i * 86_400_000;
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date(ms));
	});
}

export default function SearchPage() {
	const [maxDistanceKm, setMaxDistanceKm] = useState(100);
	const [date, setDate] = useState(getTodayJST);
	const [results, setResults] = useState<SearchResult[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const dateOptions = getDateOptions();

	const fetchResults = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/search?date=${date}&maxDistanceKm=${maxDistanceKm}`);
			if (res.status === 400) {
				const body = await res.json();
				if (body.error === "home_location_not_set") {
					setError("自宅位置が設定されていません。設定画面から緯度・経度を登録してください。");
				} else {
					setError("検索パラメータが不正です。");
				}
				setResults(null);
				return;
			}
			if (!res.ok) {
				setError("検索に失敗しました。");
				setResults(null);
				return;
			}
			setResults(await res.json());
		} catch {
			setError("ネットワークエラーが発生しました。");
			setResults(null);
		} finally {
			setLoading(false);
		}
	}, [date, maxDistanceKm]);

	useEffect(() => {
		fetchResults();
	}, [fetchResults]);

	return (
		<main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
			<header>
				<h1 className="text-xl font-bold text-sky-700">釣り場検索</h1>
				<p className="text-xs text-gray-400 mt-0.5">自宅からの直線距離でスコア順に表示</p>
			</header>

			{/* Filters */}
			<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-4">
				{/* Date */}
				<div className="space-y-1">
					<label
						htmlFor="search-date"
						className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
					>
						日付
					</label>
					<select
						id="search-date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
					>
						{dateOptions.map((d) => (
							<option key={d} value={d}>
								{d}
							</option>
						))}
					</select>
				</div>

				{/* Distance slider */}
				<div className="space-y-1">
					<div className="flex justify-between items-center">
						<label
							htmlFor="search-distance"
							className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
						>
							最大距離
						</label>
						<span className="text-sm font-semibold text-sky-600 tabular-nums">
							{maxDistanceKm === 500 ? "500km+" : `${maxDistanceKm}km`}
						</span>
					</div>
					<input
						id="search-distance"
						type="range"
						min={10}
						max={500}
						step={10}
						value={maxDistanceKm}
						onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
						className="w-full accent-sky-500"
					/>
					<div className="flex justify-between text-xs text-gray-400">
						<span>10km</span>
						<span>500km+</span>
					</div>
				</div>
			</section>

			{/* Error */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 space-y-1">
					<p>{error}</p>
					{error.includes("自宅位置") && (
						<Link href="/settings" className="underline text-sky-600">
							設定画面へ
						</Link>
					)}
				</div>
			)}

			{/* Loading */}
			{loading && <div className="text-center text-sm text-gray-400 py-8">検索中…</div>}

			{/* Results */}
			{!loading && results != null && (
				<>
					<p className="text-xs text-gray-400">
						{results.length > 0
							? `${results.length}件の釣り場が見つかりました`
							: "条件に合う釣り場がありません"}
					</p>

					{/* Map */}
					{results.length > 0 && (
						<section className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
							<SearchMap spots={results} selectedId={selectedId} onSelect={setSelectedId} />
						</section>
					)}

					{/* List */}
					<ul className="space-y-2">
						{results.map((spot) => (
							<li key={spot.id}>
								<Link
									href={`/spots/${spot.id}`}
									onClick={() => setSelectedId(spot.id)}
									className={`bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3 hover:border-sky-300 transition-colors ${
										selectedId === spot.id ? "border-sky-400" : "border-gray-200"
									}`}
								>
									<ScoreLabel label={spot.label ?? undefined} size="md" />
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5">
											<span className="font-semibold truncate">{spot.name}</span>
											{spot.is_favorite === 1 && <span className="text-yellow-400 text-sm">★</span>}
										</div>
										<div className="flex items-center gap-2 mt-0.5">
											<span className="text-xs text-gray-400">{spot.prefecture}</span>
											<span className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-full">
												{spot.type}
											</span>
											{spot.bestHour != null && (
												<span className="text-xs text-gray-500">ベスト {spot.bestHour}:00</span>
											)}
										</div>
									</div>
									<div className="text-right shrink-0">
										{spot.score != null ? (
											<span className="text-sm font-medium text-gray-600 tabular-nums block">
												{spot.score}点
											</span>
										) : (
											<span className="text-xs text-gray-300 block">データなし</span>
										)}
										<span className="text-xs text-gray-400 tabular-nums">
											{spot.distanceKm.toFixed(0)}km
										</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</>
			)}
		</main>
	);
}
