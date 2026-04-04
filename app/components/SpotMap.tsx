"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { useState } from "react";
import Link from "next/link";
import type { Spot, SpotType } from "../../src/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
	spots: Spot[];
}

const SPOT_TYPES: SpotType[] = ["漁港", "磯", "サーフ", "堤防", "その他"];

// ---------------------------------------------------------------------------
// Map click handler sub-component
// ---------------------------------------------------------------------------

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
	useMapEvents({
		click(e) {
			onMapClick(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SpotMap({ spots: initialSpots }: Props) {
	const [spots, setSpots] = useState(initialSpots);
	const [adding, setAdding] = useState(false);
	const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
	const [form, setForm] = useState({ name: "", type: "漁港" as SpotType, prefecture: "" });
	const [submitting, setSubmitting] = useState(false);

	function handleMapClick(lat: number, lng: number) {
		if (!adding) return;
		setPendingLatLng({ lat, lng });
	}

	async function handleToggleFavorite(spotId: number) {
		const res = await fetch(`/api/spots/${spotId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "toggle_favorite" }),
		});
		if (res.ok) {
			const { is_favorite } = (await res.json()) as { is_favorite: 0 | 1 };
			setSpots((prev) => prev.map((s) => (s.id === spotId ? { ...s, is_favorite } : s)));
		}
	}

	async function handleAddSpot(e: React.FormEvent) {
		e.preventDefault();
		if (!pendingLatLng || !form.name.trim() || !form.prefecture.trim()) return;
		setSubmitting(true);
		const res = await fetch("/api/spots", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...form, ...pendingLatLng }),
		});
		if (res.ok) {
			const newSpot = (await res.json()) as Spot;
			setSpots((prev) => [...prev, newSpot]);
			setAdding(false);
			setPendingLatLng(null);
			setForm({ name: "", type: "漁港", prefecture: "" });
		}
		setSubmitting(false);
	}

	function cancelAdd() {
		setAdding(false);
		setPendingLatLng(null);
	}

	return (
		<div className="relative w-full" style={{ height: "calc(100dvh - 112px)" }}>
			{/* Controls */}
			<div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
				<button
					type="button"
					onClick={() => (adding ? cancelAdd() : setAdding(true))}
					className={`px-3 py-2 rounded-xl text-sm font-medium shadow-md ${
						adding ? "bg-gray-600 text-white" : "bg-white text-sky-600 border border-sky-200"
					}`}
				>
					{adding ? "キャンセル" : "+ 釣り場を追加"}
				</button>
			</div>

			{/* Hint banner */}
			{adding && !pendingLatLng && (
				<div className="absolute top-3 left-3 z-[1000] bg-sky-600 text-white text-xs rounded-xl px-3 py-2 shadow-md">
					地図をタップして場所を選択
				</div>
			)}

			{/* Leaflet map */}
			<MapContainer
				center={[36.5, 138.0]}
				zoom={6}
				style={{ height: "100%", width: "100%" }}
				className={adding ? "cursor-crosshair" : ""}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<ClickHandler onMapClick={handleMapClick} />

				{spots.map((spot) => (
					<CircleMarker
						key={spot.id}
						center={[spot.latitude, spot.longitude]}
						radius={9}
						color={spot.is_favorite === 1 ? "#d97706" : "#0369a1"}
						fillColor={spot.is_favorite === 1 ? "#fbbf24" : "#38bdf8"}
						fillOpacity={0.85}
						weight={2}
					>
						<Popup>
							<div className="text-sm min-w-[150px] space-y-1">
								<p className="font-semibold">{spot.name}</p>
								<p className="text-xs text-gray-500">
									{spot.prefecture} · {spot.type}
								</p>
								<div className="flex items-center gap-3 pt-1">
									<Link href={`/spots/${spot.id}`} className="text-sky-600 text-xs hover:underline">
										詳細を見る →
									</Link>
									<button
										type="button"
										onClick={() => handleToggleFavorite(spot.id)}
										className="text-xs"
									>
										{spot.is_favorite === 1 ? "★ 解除" : "☆ お気に入り"}
									</button>
								</div>
							</div>
						</Popup>
					</CircleMarker>
				))}

				{/* Pending marker while adding */}
				{pendingLatLng && (
					<CircleMarker
						center={[pendingLatLng.lat, pendingLatLng.lng]}
						radius={11}
						color="#059669"
						fillColor="#34d399"
						fillOpacity={0.9}
						weight={2}
					/>
				)}
			</MapContainer>

			{/* Add-spot form overlay */}
			{pendingLatLng && (
				<div className="absolute bottom-4 left-4 right-4 z-[1000]">
					<form
						onSubmit={handleAddSpot}
						className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 space-y-3"
					>
						<h3 className="font-semibold text-sm text-gray-800">新しい釣り場を追加</h3>
						<p className="text-xs text-gray-400">
							{pendingLatLng.lat.toFixed(4)}, {pendingLatLng.lng.toFixed(4)}
						</p>
						<input
							type="text"
							placeholder="釣り場名 *"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
							required
						/>
						<div className="flex gap-2">
							<select
								value={form.type}
								onChange={(e) => setForm({ ...form, type: e.target.value as SpotType })}
								className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
							>
								{SPOT_TYPES.map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
							<input
								type="text"
								placeholder="都道府県 *"
								value={form.prefecture}
								onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
								className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
								required
							/>
						</div>
						<div className="flex gap-2">
							<button
								type="submit"
								disabled={submitting}
								className="flex-1 bg-sky-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
							>
								{submitting ? "追加中…" : "追加する"}
							</button>
							<button
								type="button"
								onClick={() => setPendingLatLng(null)}
								className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm"
							>
								戻る
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
