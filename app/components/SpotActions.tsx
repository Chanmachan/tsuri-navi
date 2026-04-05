"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
	spotId: number;
	isFavorite: boolean;
	isPreset: boolean;
}

export function SpotActions({ spotId, isFavorite: initialFavorite, isPreset }: Props) {
	const router = useRouter();
	const [isFavorite, setIsFavorite] = useState(initialFavorite);
	const [deleting, setDeleting] = useState(false);

	async function handleToggleFavorite() {
		const res = await fetch(`/api/spots/${spotId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action: "toggle_favorite" }),
		});
		if (res.ok) {
			const { is_favorite } = (await res.json()) as { is_favorite: 0 | 1 };
			setIsFavorite(is_favorite === 1);
			router.refresh();
		}
	}

	async function handleDelete() {
		if (!confirm("この釣り場を削除しますか？")) return;
		setDeleting(true);
		const res = await fetch(`/api/spots/${spotId}`, { method: "DELETE" });
		if (res.ok) {
			router.push("/");
		} else {
			setDeleting(false);
		}
	}

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={handleToggleFavorite}
				className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
					isFavorite
						? "bg-yellow-50 border-yellow-300 text-yellow-700"
						: "bg-white border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600"
				}`}
			>
				{isFavorite ? "★" : "☆"}
				<span>{isFavorite ? "お気に入り済" : "お気に入り"}</span>
			</button>

			{!isPreset && (
				<button
					type="button"
					onClick={handleDelete}
					disabled={deleting}
					className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
				>
					{deleting ? "削除中…" : "削除"}
				</button>
			)}
		</div>
	);
}
