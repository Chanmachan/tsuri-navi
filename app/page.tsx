export default function HomePage() {
	const presetSpots = [
		{ name: "久ノ浜漁港", prefecture: "福島", type: "漁港" },
		{ name: "四倉漁港", prefecture: "福島", type: "漁港" },
		{ name: "小名浜港", prefecture: "福島", type: "漁港" },
		{ name: "中之作漁港", prefecture: "福島", type: "漁港" },
		{ name: "豊間の磯", prefecture: "福島", type: "磯" },
		{ name: "江名港", prefecture: "福島", type: "漁港" },
		{ name: "桃浦漁港", prefecture: "宮城", type: "漁港" },
		{ name: "宇佐漁港", prefecture: "高知", type: "漁港" },
		{ name: "室戸岬", prefecture: "高知", type: "磯" },
		{ name: "鳴門周辺", prefecture: "徳島", type: "漁港" },
		{ name: "佐田岬", prefecture: "愛媛", type: "磯" },
		{ name: "庵治漁港", prefecture: "香川", type: "漁港" },
	];

	return (
		<main className="max-w-2xl mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold text-sky-700 mb-2">釣りナビ</h1>
			<p className="text-gray-500 text-sm mb-8">海釣り条件ナビゲーター</p>

			<section>
				<h2 className="text-lg font-semibold mb-4">釣り場一覧</h2>
				<ul className="space-y-2">
					{presetSpots.map((spot) => (
						<li
							key={spot.name}
							className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center justify-between"
						>
							<div>
								<span className="font-medium">{spot.name}</span>
								<span className="text-gray-400 text-sm ml-2">
									{spot.prefecture}
								</span>
							</div>
							<span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
								{spot.type}
							</span>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
