"use client";

import dynImport from "next/dynamic";

interface Spot {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
	type: string;
	prefecture: string;
	is_favorite: 0 | 1;
}

const SpotMap = dynImport(() => import("./SpotMap").then((m) => m.SpotMap), {
	ssr: false,
	loading: () => (
		<div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
			地図を読み込み中…
		</div>
	),
});

export default function MapPageClient({ spots }: { spots: Spot[] }) {
	return <SpotMap spots={spots} />;
}
