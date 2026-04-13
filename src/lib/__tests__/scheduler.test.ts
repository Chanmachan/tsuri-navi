import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSchedule = vi.fn();

vi.mock("node-cron", () => ({
	default: { schedule: mockSchedule },
}));

// Heavy dependencies are not needed for scheduler registration tests
vi.mock("../batch/run-all", () => ({ runFullBatch: vi.fn() }));
vi.mock("../push/notify-batch", () => ({ runNotifyBatch: vi.fn() }));

describe("setupScheduler", () => {
	beforeEach(() => {
		vi.resetModules();
		mockSchedule.mockClear();
	});

	it("registers a cron job at 05:00 JST", async () => {
		const { setupScheduler } = await import("../scheduler");
		setupScheduler();

		expect(mockSchedule).toHaveBeenCalledOnce();
		expect(mockSchedule).toHaveBeenCalledWith("0 5 * * *", expect.any(Function), {
			timezone: "Asia/Tokyo",
		});
	});

	it("is idempotent — calling twice only registers once", async () => {
		const { setupScheduler } = await import("../scheduler");
		setupScheduler();
		setupScheduler();

		expect(mockSchedule).toHaveBeenCalledOnce();
	});
});
