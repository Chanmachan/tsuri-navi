import { getSettings } from "../../src/lib/db/settings";
import { SettingsForm } from "../components/SettingsForm";
import { PushNotificationToggle } from "../components/PushNotificationToggle";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
	const settings = getSettings();
	return (
		<main className="max-w-2xl mx-auto px-4 py-6">
			<header className="mb-6">
				<h1 className="text-xl font-bold text-sky-700">設定</h1>
			</header>
			<SettingsForm initial={settings} />

			<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-4 mt-5">
				<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">通知</p>
				<PushNotificationToggle />
			</section>
		</main>
	);
}
