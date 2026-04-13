export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		try {
			const { setupScheduler } = await import("./src/lib/scheduler");
			setupScheduler();
		} catch (err) {
			console.error("[instrumentation] scheduler setup failed:", err);
		}
	}
}
