import { getFishRecommendations } from "../../src/data/fish-seasons";

interface Props {
	prefecture: string;
	month: number;
}

export function FishRecommendation({ prefecture, month }: Props) {
	const fish = getFishRecommendations(prefecture, month);

	if (fish.length === 0) {
		return <p className="text-sm text-gray-400 py-2">この地域の魚種データはまだありません</p>;
	}

	return (
		<ul className="space-y-2">
			{fish.map((entry) => (
				<li key={entry.fish} className="bg-sky-50 rounded-lg px-4 py-3 flex flex-col gap-0.5">
					<span className="font-semibold text-gray-800">{entry.fish}</span>
					<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
						<span>釣り方: {entry.method}</span>
						<span>餌: {entry.bait}</span>
					</div>
					{entry.note && <span className="text-xs text-sky-600">{entry.note}</span>}
				</li>
			))}
		</ul>
	);
}
