type Label = "◎" | "○" | "△" | "×";

const COLOR: Record<Label, string> = {
	"◎": "bg-green-100 text-green-700 border-green-300",
	"○": "bg-blue-100 text-blue-700 border-blue-300",
	"△": "bg-yellow-100 text-yellow-700 border-yellow-300",
	"×": "bg-red-100 text-red-700 border-red-300",
};

interface Props {
	label: Label | null | undefined;
	size?: "sm" | "md" | "lg";
}

const SIZE = {
	sm: "text-sm w-7 h-7",
	md: "text-base w-9 h-9",
	lg: "text-2xl w-14 h-14",
};

export function ScoreLabel({ label, size = "md" }: Props) {
	if (!label) {
		return (
			<span
				className={`inline-flex items-center justify-center rounded-full border font-bold bg-gray-100 text-gray-400 border-gray-200 ${SIZE[size]}`}
			>
				–
			</span>
		);
	}
	return (
		<span
			className={`inline-flex items-center justify-center rounded-full border font-bold ${COLOR[label]} ${SIZE[size]}`}
		>
			{label}
		</span>
	);
}
