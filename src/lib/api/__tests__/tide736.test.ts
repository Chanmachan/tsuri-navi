import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TideApiError,
  fetchTideData,
  findPortId,
} from "../tide736";

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

// Minimal HTML that the parser can extract data from
const MINIMAL_HTML = `
<html>
<body>
大潮
月齢：14
満潮 06:30 潮位：120cm
干潮 12:45 潮位：10cm
<td>100</td><td>105</td><td>110</td><td>115</td><td>120</td><td>118</td>
<td>115</td><td>110</td><td>105</td><td>100</td><td>90</td><td>80</td>
<td>70</td><td>60</td><td>55</td><td>50</td><td>55</td><td>60</td>
<td>70</td><td>80</td><td>90</td><td>100</td><td>110</td><td>115</td>
</body>
</html>
`;

// ---------------------------------------------------------------------------
// findPortId
// ---------------------------------------------------------------------------

describe("findPortId", () => {
  it("returns the correct port ID for 久ノ浜漁港", () => {
    expect(findPortId("久ノ浜漁港")).toBe("6723");
  });

  it("returns the correct port ID for 四倉漁港", () => {
    expect(findPortId("四倉漁港")).toBe("6712");
  });

  it("returns the correct port ID for 小名浜港", () => {
    expect(findPortId("小名浜港")).toBe("6701");
  });

  it("returns the correct port ID for 中之作漁港", () => {
    expect(findPortId("中之作漁港")).toBe("6718");
  });

  it("returns the correct port ID for 豊間の磯", () => {
    expect(findPortId("豊間の磯")).toBe("6706");
  });

  it("returns the correct port ID for 江名港", () => {
    expect(findPortId("江名港")).toBe("6704");
  });

  it("returns the correct port ID for 桃浦漁港", () => {
    expect(findPortId("桃浦漁港")).toBe("3501");
  });

  it("returns the correct port ID for 宇佐漁港", () => {
    expect(findPortId("宇佐漁港")).toBe("7401");
  });

  it("returns undefined for an unknown spot", () => {
    expect(findPortId("存在しない釣り場")).toBeUndefined();
  });

  it("returns a match on partial name", () => {
    // "久ノ浜" is contained within "久ノ浜漁港"
    expect(findPortId("久ノ浜")).toBe("6723");
  });
});

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe("fetchTideData — URL construction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("constructs the correct URL with port_id and yyyymm", async () => {
    const mockFetch = makeFetchOk(MINIMAL_HTML);
    vi.stubGlobal("fetch", mockFetch);

    await fetchTideData("6723", new Date("2026-04-15"));

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain("port_id=6723");
    expect(calledUrl).toContain("yyyymm=202604");
    expect(calledUrl).toMatch(/^https:\/\/tide736\.net\/get_tide\//);
  });

  it("uses the correct yyyymm for January", async () => {
    const mockFetch = makeFetchOk(MINIMAL_HTML);
    vi.stubGlobal("fetch", mockFetch);

    await fetchTideData("6701", new Date("2026-01-05"));

    const calledUrl = (mockFetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain("yyyymm=202601");
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
    vi.stubGlobal("fetch", makeFetchOk(MINIMAL_HTML));

    const result = await fetchTideData("6723", new Date("2026-04-15"));

    expect(result.portId).toBe("6723");
    expect(result.date).toBe("2026-04-15");
  });

  it("extracts tide type from HTML", async () => {
    vi.stubGlobal("fetch", makeFetchOk(MINIMAL_HTML));

    const result = await fetchTideData("6723", new Date("2026-04-15"));

    expect(result.tideType).toBe("大潮");
  });

  it("extracts moon age from HTML", async () => {
    vi.stubGlobal("fetch", makeFetchOk(MINIMAL_HTML));

    const result = await fetchTideData("6723", new Date("2026-04-15"));

    expect(result.moonAge).toBe(14);
  });

  it("extracts 24 hourly tide levels", async () => {
    vi.stubGlobal("fetch", makeFetchOk(MINIMAL_HTML));

    const result = await fetchTideData("6723", new Date("2026-04-15"));

    expect(result.hourly).toHaveLength(24);
    expect(result.hourly[0].hour).toBe(0);
    expect(result.hourly[0].level).toBe(100);
  });

  it("extracts high/low tide extremes", async () => {
    vi.stubGlobal("fetch", makeFetchOk(MINIMAL_HTML));

    const result = await fetchTideData("6723", new Date("2026-04-15"));

    expect(result.extremes.length).toBeGreaterThanOrEqual(1);
    const highTide = result.extremes.find((e) => e.type === "high");
    expect(highTide).toBeDefined();
    expect(highTide?.time).toBe("06:30");
    expect(highTide?.level).toBe(120);
  });

  it("parses JSON response when API returns JSON", async () => {
    const jsonBody = JSON.stringify({
      tideType: "中潮",
      moonAge: 7,
      hourly: Array.from({ length: 24 }, (_, i) => ({ hour: i, level: 80 + i })),
      extremes: [{ type: "high", time: "09:00", level: 150 }],
    });
    vi.stubGlobal("fetch", makeFetchOk(jsonBody));

    const result = await fetchTideData("6723", new Date("2026-04-15"));

    expect(result.tideType).toBe("中潮");
    expect(result.moonAge).toBe(7);
    expect(result.hourly).toHaveLength(24);
    expect(result.extremes[0].type).toBe("high");
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

    await expect(
      fetchTideData("9999", new Date("2026-04-15"))
    ).rejects.toThrow(TideApiError);
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

    await expect(
      fetchTideData("9999", new Date("2026-04-15"))
    ).rejects.toThrow(TideApiError);

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
    const mockFetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchTideData("6723", new Date("2026-04-15"));
    promise.catch(() => {}); // suppress unhandled rejection during timer advancement

    // Advance timers through all retry delays (1000 + 2000 ms)
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
        text: () => Promise.resolve(MINIMAL_HTML),
      } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchTideData("6723", new Date("2026-04-15"));
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.portId).toBe("6723");
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
        text: () => Promise.resolve(MINIMAL_HTML),
      } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const promise = fetchTideData("6723", new Date("2026-04-15"));
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.portId).toBe("6723");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Unparseable response
// ---------------------------------------------------------------------------

describe("fetchTideData — unparseable response", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws TideApiError when HTML contains no recognisable tide data", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk("<html><body>Error: port not found</body></html>")
    );

    await expect(
      fetchTideData("0000", new Date("2026-04-15"))
    ).rejects.toThrow(TideApiError);
  });
});
