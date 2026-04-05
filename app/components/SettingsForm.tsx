"use client";

import { useState } from "react";
import { DEFAULT_WEIGHTS } from "../../src/types/score";
import type { ScoreWeights } from "../../src/types/score";
import type { UserSettings } from "../../src/lib/db/settings";

// ---------------------------------------------------------------------------
// Weight slider labels
// ---------------------------------------------------------------------------

const WEIGHT_LABELS: { key: keyof ScoreWeights; label: string }[] = [
	{ key: "tideCycle", label: "潮回り" },
	{ key: "tideMovement", label: "潮の動き" },
	{ key: "weather", label: "天気" },
	{ key: "wind", label: "風速" },
	{ key: "wave", label: "波高" },
	{ key: "mazume", label: "マズメ時間帯" },
	{ key: "pressure", label: "気圧変化" },
	{ key: "moon", label: "月齢" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
	initial: UserSettings;
}

export function SettingsForm({ initial }: Props) {
	const [homeLat, setHomeLat] = useState(
		initial.home_latitude != null ? String(initial.home_latitude) : "",
	);
	const [homeLng, setHomeLng] = useState(
		initial.home_longitude != null ? String(initial.home_longitude) : "",
	);
	const [notifEnabled, setNotifEnabled] = useState(initial.notification_enabled);
	const [weights, setWeights] = useState<ScoreWeights>({ ...initial.score_weights });
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	function setWeight(key: keyof ScoreWeights, value: number) {
		setWeights((prev) => ({ ...prev, [key]: value }));
	}

	function resetWeights() {
		setWeights({ ...DEFAULT_WEIGHTS });
	}

	const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setSaved(false);
		setSaveError(null);

		const latNum = homeLat.trim() === "" ? null : Number(homeLat);
		const lngNum = homeLng.trim() === "" ? null : Number(homeLng);

		if (latNum !== null && (!isFinite(latNum) || latNum < -90 || latNum > 90)) {
			setSaveError("緯度は -90〜90 の数値で入力してください");
			setSaving(false);
			return;
		}
		if (lngNum !== null && (!isFinite(lngNum) || lngNum < -180 || lngNum > 180)) {
			setSaveError("経度は -180〜180 の数値で入力してください");
			setSaving(false);
			return;
		}

		try {
			const res = await fetch("/api/settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					home_latitude: latNum,
					home_longitude: lngNum,
					notification_enabled: notifEnabled,
					score_weights: weights,
				}),
			});
			if (!res.ok) {
				setSaveError("保存に失敗しました");
				return;
			}
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} catch {
			setSaveError("ネットワークエラーが発生しました");
		} finally {
			setSaving(false);
		}
	}

	return (
		<form onSubmit={handleSave} className="space-y-6">
			{/* Home location */}
			<section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3">
				<h2 className="font-semibold text-sm text-gray-700">自宅位置</h2>
				<p className="text-xs text-gray-400">距離ベース検索に使用します（緯度・経度）</p>
				<div className="flex gap-2">
					<div className="flex-1">
						<label className="text-xs text-gray-500 block mb-1">緯度</label>
						<input
							type="number"
							step="any"
							placeholder="例: 37.0"
							value={homeLat}
							onChange={(e) => setHomeLat(e.target.value)}
							className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
						/>
					</div>
					<div className="flex-1">
						<label className="text-xs text-gray-500 block mb-1">経度</label>
						<input
							type="number"
							step="any"
							placeholder="例: 141.0"
							value={homeLng}
							onChange={(e) => setHomeLng(e.target.value)}
							className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
						/>
					</div>
				</div>
			</section>

			{/* Notifications */}
			<section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3">
				<h2 className="font-semibold text-sm text-gray-700">プッシュ通知</h2>
				<div className="flex items-center justify-between">
					<span className="text-sm text-gray-600">好条件の通知を受け取る</span>
					<button
						type="button"
						onClick={() => setNotifEnabled((v) => !v)}
						className={`relative w-12 h-6 rounded-full transition-colors ${
							notifEnabled ? "bg-sky-500" : "bg-gray-300"
						}`}
					>
						<span
							className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
								notifEnabled ? "translate-x-6" : "translate-x-0"
							}`}
						/>
					</button>
				</div>
				<p className="text-xs text-gray-400">スコア ◎（80点以上）の釣り場を2日前に通知します</p>
			</section>

			{/* Score weights */}
			<section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-sm text-gray-700">スコア重み設定</h2>
					<div className="flex items-center gap-3">
						<span className={`text-xs ${totalWeight === 100 ? "text-green-600" : "text-red-500"}`}>
							合計: {totalWeight}点
						</span>
						<button
							type="button"
							onClick={resetWeights}
							className="text-xs text-gray-400 hover:text-gray-600 underline"
						>
							デフォルトに戻す
						</button>
					</div>
				</div>

				<ul className="space-y-3">
					{WEIGHT_LABELS.map(({ key, label }) => (
						<li key={key} className="space-y-1">
							<div className="flex justify-between text-xs text-gray-600">
								<span>{label}</span>
								<span className="tabular-nums font-medium">{weights[key]}点</span>
							</div>
							<input
								type="range"
								min={0}
								max={30}
								step={1}
								value={weights[key]}
								onChange={(e) => setWeight(key, Number(e.target.value))}
								className="w-full accent-sky-500"
							/>
						</li>
					))}
				</ul>

				{totalWeight !== 100 && (
					<p className="text-xs text-red-500">
						合計が100点になるように調整してください（現在: {totalWeight}点）
					</p>
				)}
			</section>

			{saveError && <p className="text-xs text-red-500 text-center">{saveError}</p>}

			{/* Save button */}
			<button
				type="submit"
				disabled={saving}
				className="w-full bg-sky-600 text-white rounded-2xl py-3 font-medium text-sm disabled:opacity-50 transition-colors"
			>
				{saving ? "保存中…" : saved ? "保存しました ✓" : "保存する"}
			</button>
		</form>
	);
}
