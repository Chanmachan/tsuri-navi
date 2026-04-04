import { PushNotificationToggle } from "../components/PushNotificationToggle";

export default function SettingsPage() {
	return (
		<main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
			<h1 className="text-xl font-bold">設定</h1>

			<section className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 space-y-4">
				<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">通知</p>
				<PushNotificationToggle />
			</section>
		</main>
	);
}
