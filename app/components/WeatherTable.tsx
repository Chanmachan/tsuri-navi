import type { HourlyWeatherRow } from "../../src/lib/db/spot-detail";

const WEATHER_LABEL: Record<number, string> = {
	0: "快晴",
	1: "晴れ",
	2: "薄曇り",
	3: "曇り",
	45: "霧",
	48: "着氷霧",
	51: "霧雨弱",
	53: "霧雨",
	55: "霧雨強",
	61: "小雨",
	63: "雨",
	65: "大雨",
	71: "小雪",
	73: "雪",
	75: "大雪",
	80: "にわか雨弱",
	81: "にわか雨",
	82: "にわか雨強",
	95: "雷雨",
	96: "雷雨+ひょう",
	99: "雷雨+大ひょう",
};

function weatherLabel(code: number | null): string {
	if (code === null) return "–";
	return WEATHER_LABEL[code] ?? `コード${code}`;
}

function windDir(deg: number | null): string {
	if (deg === null) return "–";
	const dirs = [
		"北",
		"北北東",
		"北東",
		"東北東",
		"東",
		"東南東",
		"南東",
		"南南東",
		"南",
		"南南西",
		"南西",
		"西南西",
		"西",
		"西北西",
		"北西",
		"北北西",
	];
	return dirs[Math.round(deg / 22.5) % 16] ?? "–";
}

interface Props {
	weather: HourlyWeatherRow[];
}

export function WeatherTable({ weather }: Props) {
	if (weather.length === 0) {
		return <p className="text-sm text-gray-400 py-4">気象データなし</p>;
	}

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full text-xs text-gray-700">
				<thead>
					<tr className="text-gray-400 border-b">
						<th className="py-1 pr-3 text-left font-medium">時刻</th>
						<th className="py-1 pr-3 text-left font-medium">天気</th>
						<th className="py-1 pr-3 text-right font-medium">気温</th>
						<th className="py-1 pr-3 text-right font-medium">風</th>
						<th className="py-1 pr-3 text-right font-medium">波</th>
						<th className="py-1 pr-3 text-right font-medium">気圧</th>
						<th className="py-1 text-right font-medium">潮位</th>
					</tr>
				</thead>
				<tbody>
					{weather.map((r) => (
						<tr key={r.hour} className="border-b border-gray-50">
							<td className="py-1 pr-3 tabular-nums font-medium">
								{r.hour}:00
								{r.tide_type && (
									<span className="ml-1 text-sky-600 font-semibold">
										{r.tide_type === "満潮" ? "▲" : "▼"}
									</span>
								)}
							</td>
							<td className="py-1 pr-3">{weatherLabel(r.weather_code)}</td>
							<td className="py-1 pr-3 text-right tabular-nums">
								{r.temperature != null ? `${r.temperature.toFixed(1)}°` : "–"}
							</td>
							<td className="py-1 pr-3 text-right tabular-nums">
								{r.wind_speed != null
									? `${r.wind_speed.toFixed(1)}m ${windDir(r.wind_direction)}`
									: "–"}
							</td>
							<td className="py-1 pr-3 text-right tabular-nums">
								{r.wave_height != null ? `${r.wave_height.toFixed(1)}m` : "–"}
							</td>
							<td className="py-1 pr-3 text-right tabular-nums">
								{r.pressure != null ? `${Math.round(r.pressure)}hPa` : "–"}
							</td>
							<td className="py-1 text-right tabular-nums">
								{r.tide_level != null ? `${Math.round(r.tide_level)}cm` : "–"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
