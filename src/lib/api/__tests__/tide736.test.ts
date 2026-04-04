import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TideApiError, fetchTideData, findPortId } from "../tide736";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchOk(body: string): typeof fetch {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		statusText: "OK",
		text: () => Promise.resolve(body),
	} as unknown as Response);
}

function makeFetchStatus(status: number, statusText: string): typeof fetch {
	return vi.fn().mockResolvedValue({
		ok: false,
		status,
		statusText,
		text: () => Promise.resolve(""),
	} as unknown as Response);
}

/** Build a minimal valid tide736 JSON response for the given date. */
function makeTideJson(
	dateStr: string,
	opts?: {
		tideType?: string;
		moonAge?: string;
		hourlyLevel?: number;
	},
) {
	const tideType = opts?.tideType ?? "大潮";
	const moonAge = opts?.moonAge ?? "14.0";
	const level = opts?.hourlyLevel ?? 100;
	const hourlyTide = Array.from({ length: 24 }, (_, h) => ({
		time: `${String(h).padStart(2, "0")}:00`,
		unix: 0,
		cm: level + h,
	}));
	return JSON.stringify({
		status: 1,
		message: "正常終了",
		tide: {
			chart: {
				[dateStr]: {
					moon: { title: tideType, age: moonAge, brightness: "90.0" },
					flood: [{ time: "06:30", unix: 0, cm: 120 }],
					edd: [{ time: "12:45", unix: 0, cm: 10 }],
					tide: hourlyTide,
				},
			},
		},
	});
}

// ---------------------------------------------------------------------------
// findPortId
// ---------------------------------------------------------------------------

describe("findPortId", () => {
	it("returns the correct port ID for 久ノ浜漁港", () => {
		expect(findPortId("久ノ浜漁港")).toBe("0705");
	});

	it("returns the correct port ID for 四倉漁港", () => {
		expect(findPortId("四倉漁港")).toBe("0705");
	});

	it("returns the correct port ID for 小名浜港", () => {
		expect(findPortId("小名浜港")).toBe("0706");
	});

	it("returns the correct port ID for 中之作漁港", () => {
		expect(findPortId("中之作漁港")).toBe("0706");
	});

	it("returns the correct port ID for 豊間の磯", () => {
		expect(findPortId("豊間の磯")).toBe("0706");
	});

	it("returns the correct port ID for 江名港", () => {
		expect(findPortId("江名港")).toBe("0706");
	});

	it("returns the correct port ID for 桃浦漁港", () => {
		expect(findPortId("桃浦漁港")).toBe("0406");
	});

	it("returns the correct port ID for 宇佐漁港", () => {
		expect(findPortId("宇佐漁港")).toBe("3904");
	});

	it("returns undefined for an unknown spot", () => {
		expect(findPortId("存在しない釣り場")).toBeUndefined();
	});

	it("returns a match on partial name", () => {
		expect(findPortId("久ノ浜")).toBe("0705");
	});
});

// ---------------------------------------------------------------------------
// Request construction (POST to new endpoint)
// ---------------------------------------------------------------------------

describe("fetchTideData — request construction", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("POSTs to the correct endpoint", async () => {
		const mockFetch = makeFetchOk(makeTideJson("2026-04-15"));
		vi.stubGlobal("fetch", mockFetch);

		await fetchTideData("0706", new Date("2026-04-15"));

		expect(mockFetch).toHaveBeenCalledOnce();
		const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(calledUrl).toBe("https://tide736.net/api/get_tide.php");
		const init = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
		expect(init.method).toBe("POST");
	});

	it("sends pc, hc, yr, mn, dy, rg in POST body", async () => {
		const mockFetch = makeFetchOk(makeTideJson("2026-04-15"));
		vi.stubGlobal("fetch", mockFetch);

		await fetchTideData("0706", new Date("2026-04-15"));

		const init = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
		const body = init.body as string;
		expect(body).toContain("pc=07");
		expect(body).toContain("hc=06");
		expect(body).toContain("yr=2026");
		expect(body).toContain("mn=4");
		expect(body).toContain("dy=15");
		expect(body).toContain("rg=day");
	});

	it("correctly splits port ID for 桃浦漁港 (pc=04, hc=06)", async () => {
		const mockFetch = makeFetchOk(makeTideJson("2026-01-05"));
		vi.stubGlobal("fetch", mockFetch);

		await fetchTideData("0406", new Date("2026-01-05"));

		const init = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
		const body = init.body as string;
		expect(body).toContain("pc=04");
		expect(body).toContain("hc=06");
		expect(body).toContain("mn=1");
		expect(body).toContain("dy=5");
	});
});

// ---------------------------------------------------------------------------
// Successful response parsing
// ---------------------------------------------------------------------------

describe("fetchTideData — response parsing", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns TideData with correct portId and date", async () => {
		vi.stubGlobal("fetch", makeFetchOk(makeTideJson("2026-04-15")));

		const result = await fetchTideData("0706", new Date("2026-04-15"));

		expect(result.portId).toBe("0706");
		expect(result.date).toBe("2026-04-15");
	});

	it("extracts tide type from moon.title", async () => {
		vi.stubGlobal("fetch", makeFetchOk(makeTideJson("2026-04-15", { tideType: "大潮" })));

		const result = await fetchTideData("0706", new Date("2026-04-15"));

		expect(result.tideType).toBe("大潮");
	});

	it("extracts moon age from moon.age", async () => {
		vi.stubGlobal("fetch", makeFetchOk(makeTideJson("2026-04-15", { moonAge: "17.4" })));

		const result = await fetchTideData("0706", new Date("2026-04-15"));

		expect(result.moonAge).toBe(17);
	});

	it("extracts 24 hourly tide levels at HH:00 entries", async () => {
		vi.stubGlobal("fetch", makeFetchOk(makeTideJson("2026-04-15", { hourlyLevel: 100 })));

		const result = await fetchTideData("0706", new Date("2026-04-15"));

		expect(result.hourly).toHaveLength(24);
		expect(result.hourly[0].hour).toBe(0);
		expect(result.hourly[0].level).toBe(100);
		expect(result.hourly[12].hour).toBe(12);
	});

	it("extracts high/low tide extremes from flood/edd", async () => {
		vi.stubGlobal("fetch", makeFetchOk(makeTideJson("2026-04-15")));

		const result = await fetchTideData("0706", new Date("2026-04-15"));

		expect(result.extremes.length).toBeGreaterThanOrEqual(1);
		const highTide = result.extremes.find((e) => e.type === "high");
		expect(highTide).toBeDefined();
		expect(highTide?.time).toBe("06:30");
		expect(highTide?.level).toBe(120);
		const lowTide = result.extremes.find((e) => e.type === "low");
		expect(lowTide?.time).toBe("12:45");
		expect(lowTide?.level).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// API-level error (status=0)
// ---------------------------------------------------------------------------

describe("fetchTideData — API error response", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("throws TideApiError when status=0", async () => {
		const errorJson = JSON.stringify({ status: 0, message: "パラメーター異常" });
		vi.stubGlobal("fetch", makeFetchOk(errorJson));

		await expect(fetchTideData("0706", new Date("2026-04-15"))).rejects.toThrow(TideApiError);
	});

	it("includes the API message in the error", async () => {
		const errorJson = JSON.stringify({ status: 0, message: "パラメーター異常" });
		vi.stubGlobal("fetch", makeFetchOk(errorJson));

		await expect(fetchTideData("0706", new Date("2026-04-15"))).rejects.toThrow("パラメーター異常");
	});
});

// ---------------------------------------------------------------------------
// Error handling — 4xx
// ---------------------------------------------------------------------------

describe("fetchTideData — 4xx error handling", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("throws TideApiError immediately on 404", async () => {
		vi.stubGlobal("fetch", makeFetchStatus(404, "Not Found"));

		await expect(fetchTideData("9999", new Date("2026-04-15"))).rejects.toThrow(TideApiError);
	});

	it("includes the status code in the TideApiError", async () => {
		vi.stubGlobal("fetch", makeFetchStatus(403, "Forbidden"));

		let caught: unknown;
		try {
			await fetchTideData("9999", new Date("2026-04-15"));
		} catch (err) {
			caught = err;
		}
		expect(caught).toBeInstanceOf(TideApiError);
		expect((caught as TideApiError).statusCode).toBe(403);
	});

	it("does not retry on 4xx", async () => {
		const mockFetch = makeFetchStatus(400, "Bad Request");
		vi.stubGlobal("fetch", mockFetch);

		await expect(fetchTideData("9999", new Date("2026-04-15"))).rejects.toThrow(TideApiError);

		expect(mockFetch).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// Error handling — network errors with retry
// ---------------------------------------------------------------------------

describe("fetchTideData — retry on network error", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("retries up to 3 times on network failure then throws", async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
		vi.stubGlobal("fetch", mockFetch);

		const promise = fetchTideData("0706", new Date("2026-04-15"));
		promise.catch(() => {}); // suppress unhandled rejection during timer advancement

		await vi.runAllTimersAsync();

		await expect(promise).rejects.toThrow("Network error");
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("succeeds on the third attempt after two network failures", async () => {
		const mockFetch = vi
			.fn()
			.mockRejectedValueOnce(new Error("Network error"))
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: "OK",
				text: () => Promise.resolve(makeTideJson("2026-04-15")),
			} as unknown as Response);
		vi.stubGlobal("fetch", mockFetch);

		const promise = fetchTideData("0706", new Date("2026-04-15"));
		await vi.runAllTimersAsync();

		const result = await promise;
		expect(result.portId).toBe("0706");
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});

	it("retries on 5xx server errors", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
				text: () => Promise.resolve(""),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
				text: () => Promise.resolve(""),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: "OK",
				text: () => Promise.resolve(makeTideJson("2026-04-15")),
			} as unknown as Response);
		vi.stubGlobal("fetch", mockFetch);

		const promise = fetchTideData("0706", new Date("2026-04-15"));
		await vi.runAllTimersAsync();

		const result = await promise;
		expect(result.portId).toBe("0706");
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});
});

// ---------------------------------------------------------------------------
// Unparseable / missing date response
// ---------------------------------------------------------------------------

describe("fetchTideData — unparseable response", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("throws TideApiError when response is not JSON", async () => {
		vi.stubGlobal("fetch", makeFetchOk("<html><body>Error: port not found</body></html>"));

		await expect(fetchTideData("0000", new Date("2026-04-15"))).rejects.toThrow(TideApiError);
	});

	it("throws TideApiError when chart data for date is missing", async () => {
		const json = JSON.stringify({
			status: 1,
			tide: { chart: {} }, // no entry for 2026-04-15
		});
		vi.stubGlobal("fetch", makeFetchOk(json));

		await expect(fetchTideData("0706", new Date("2026-04-15"))).rejects.toThrow(TideApiError);
	});
});
