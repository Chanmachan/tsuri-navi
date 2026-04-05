"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

interface Spot {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
	score: number | null;
	label: "◎" | "○" | "△" | "×" | null;
	distanceKm: number;
}

interface Props {
	spots: Spot[];
	selectedId: number | null;
	onSelect: (id: number) => void;
}

function markerColor(label: Spot["label"]): string {
	if (label === "◎") return "#16a34a"; // green-600
	if (label === "○") return "#2563eb"; // blue-600
	if (label === "△") return "#ca8a04"; // yellow-600
	if (label === "×") return "#dc2626"; // red-600
	return "#9ca3af"; // gray-400 — no data
}

export default function SearchMap({ spots, selectedId, onSelect }: Props) {
	// Center on the average position of results; fall back to Japan center
	const center =
		spots.length > 0
			? ([
					spots.reduce((s, p) => s + p.latitude, 0) / spots.length,
					spots.reduce((s, p) => s + p.longitude, 0) / spots.length,
				] as [number, number])
			: ([36.5, 137.0] as [number, number]);

	return (
		<MapContainer
			center={center}
			zoom={7}
			style={{ height: 280, width: "100%" }}
			scrollWheelZoom={false}
		>
			<TileLayer
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{spots.map((spot) => (
				<CircleMarker
					key={spot.id}
					center={[spot.latitude, spot.longitude]}
					radius={selectedId === spot.id ? 10 : 7}
					pathOptions={{
						color: markerColor(spot.label),
						fillColor: markerColor(spot.label),
						fillOpacity: 0.85,
						weight: selectedId === spot.id ? 3 : 1.5,
					}}
					eventHandlers={{ click: () => onSelect(spot.id) }}
				>
					<Popup>
						<div className="text-sm space-y-0.5">
							<p className="font-semibold">{spot.name}</p>
							{spot.score != null ? (
								<p>
									{spot.label} {spot.score}点
								</p>
							) : (
								<p className="text-gray-400">データなし</p>
							)}
							<p className="text-gray-400">{spot.distanceKm.toFixed(0)}km</p>
						</div>
					</Popup>
				</CircleMarker>
			))}
		</MapContainer>
	);
}
