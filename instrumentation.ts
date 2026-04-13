export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { setupScheduler } = await import("./src/lib/scheduler");
		setupScheduler();
	}
}
