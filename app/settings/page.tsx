import { getSettings } from "../../src/lib/db/settings";
import { SettingsForm } from "../components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
	const settings = getSettings();
	return (
		<main className="max-w-2xl mx-auto px-4 py-6">
			<header className="mb-6">
				<h1 className="text-xl font-bold text-sky-700">設定</h1>
			</header>
			<SettingsForm initial={settings} />
		</main>
	);
}
