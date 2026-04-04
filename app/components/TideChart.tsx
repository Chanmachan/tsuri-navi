"use client";

import {
	Area,
	AreaChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { HourlyWeatherRow } from "../../src/lib/db/spot-detail";

interface Props {
	weather: HourlyWeatherRow[];
}

export function TideChart({ weather }: Props) {
	const data = weather
		.filter((r) => r.tide_level != null)
		.map((r) => ({ hour: r.hour, tide: r.tide_level as number }));

	if (data.length === 0) {
		return (
			<div className="h-36 flex items-center justify-center text-sm text-gray-400">
				潮位データなし
			</div>
		);
	}

	// Sunrise / sunset from the first row that has them
	const sunriseStr = weather.find((r) => r.sunrise)?.sunrise ?? null;
	const sunsetStr = weather.find((r) => r.sunset)?.sunset ?? null;
	const parseHour = (t: string | null) => {
		if (!t) return null;
		const h = Number.parseInt(t.split(":")[0] ?? "", 10);
		return Number.isNaN(h) ? null : h;
	};
	const sunriseH = parseHour(sunriseStr);
	const sunsetH = parseHour(sunsetStr);

	// Extreme tide hours
	const extremes = weather
		.filter((r) => r.tide_type != null)
		.map((r) => ({ hour: r.hour, type: r.tide_type as "満潮" | "干潮" }));

	const tideValues = data.map((d) => d.tide);
	const minTide = Math.min(...tideValues);
	const maxTide = Math.max(...tideValues);

	return (
		<ResponsiveContainer width="100%" height={140}>
			<AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
				<defs>
					<linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
						<stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
					</linearGradient>
				</defs>
				<XAxis
					dataKey="hour"
					tickFormatter={(h: number) => `${h}`}
					tick={{ fontSize: 10 }}
					interval={2}
				/>
				<YAxis
					domain={[Math.max(0, minTide - 20), maxTide + 20]}
					tick={{ fontSize: 10 }}
					unit="cm"
				/>
				<Tooltip
					formatter={(v: unknown) => [`${v}cm`, "潮位"]}
					labelFormatter={(h: unknown) => `${h}:00`}
				/>
				{/* Sunrise / sunset reference lines */}
				{sunriseH != null && (
					<ReferenceLine
						x={sunriseH}
						stroke="#f59e0b"
						strokeDasharray="4 2"
						label={{ value: "日出", position: "top", fontSize: 9, fill: "#f59e0b" }}
					/>
				)}
				{sunsetH != null && (
					<ReferenceLine
						x={sunsetH}
						stroke="#f97316"
						strokeDasharray="4 2"
						label={{ value: "日没", position: "top", fontSize: 9, fill: "#f97316" }}
					/>
				)}
				{/* Tide extreme reference lines */}
				{extremes.map((e) => (
					<ReferenceLine
						key={e.hour}
						x={e.hour}
						stroke={e.type === "満潮" ? "#2563eb" : "#9ca3af"}
						strokeDasharray="3 3"
						label={{
							value: e.type,
							position: "insideTopLeft",
							fontSize: 9,
							fill: e.type === "満潮" ? "#2563eb" : "#6b7280",
						}}
					/>
				))}
				<Area
					type="monotone"
					dataKey="tide"
					stroke="#38bdf8"
					fill="url(#tideGradient)"
					strokeWidth={2}
					dot={false}
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}
