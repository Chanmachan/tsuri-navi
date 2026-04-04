/**
 * tide736.net Tide Prediction API client.
 * Fetches daily tide data for Japanese ports.
 * API endpoint: https://api.tide736.net/get_tide.php (POST)
 *
 * Parameters:
 *   pc  - prefecture code (2 digits)
 *   hc  - harbor code (2 digits)
 *   yr  - year
 *   mn  - month (1-12)
 *   dy  - day (1-31)
 *   rg  - range: 'day'
 */

// NOTE: the api subdomain redirects; use the canonical URL instead
const BASE_URL = "https://tide736.net/api/get_tide.php";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface TidePoint {
	hour: number; // 0-23
	level: number; // tide level in cm
}

export interface TideExtreme {
	type: "high" | "low";
	time: string; // "HH:MM"
	level: number; // cm
}

export interface TideData {
	portId: string;
	date: string; // "YYYY-MM-DD"
	tideType: string; // 潮回り: "大潮"|"中潮"|"小潮"|"長潮"|"若潮"
	moonAge: number; // 月齢 0-29
	hourly: TidePoint[]; // 24 hourly tide levels
	extremes: TideExtreme[]; // high/low tide events
}

// ---------------------------------------------------------------------------
// Typed error
// ---------------------------------------------------------------------------

export class TideApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
	) {
		super(message);
		this.name = "TideApiError";
	}
}

// ---------------------------------------------------------------------------
// Port ID map (preset fishing spots)
//
// Encoded as 4-digit string: first 2 = prefecture code (pc),
// last 2 = harbor code (hc) as returned by api/get_harbor.php.
//
// Fukushima (pc=07): 05=四倉, 06=小名浜
// Miyagi    (pc=04): 06=石巻
// Kochi     (pc=39): 04=高知
//
// Spots without an exact harbor in the API are mapped to the nearest one.
// ---------------------------------------------------------------------------

const PORT_ID_MAP: Record<string, string> = {
	久ノ浜漁港: "0705", // 四倉 (nearest station)
	四倉漁港: "0705",
	小名浜港: "0706",
	中之作漁港: "0706", // 小名浜 (nearest station)
	豊間の磯: "0706", // 小名浜 (nearest station)
	江名港: "0706", // 小名浜 (nearest station)
	桃浦漁港: "0406", // 石巻 (nearest station)
	宇佐漁港: "3904", // 高知 (nearest station)
};

/**
 * Look up a tide736.net port ID by fishing spot name (partial match).
 * Returns undefined if no matching spot is found.
 */
export function findPortId(spotName: string): string | undefined {
	// Exact match first
	if (PORT_ID_MAP[spotName] !== undefined) {
		return PORT_ID_MAP[spotName];
	}
	// Partial match
	for (const [name, id] of Object.entries(PORT_ID_MAP)) {
		if (name.includes(spotName) || spotName.includes(name)) {
			return id;
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Request builder
// ---------------------------------------------------------------------------

/**
 * Split a 4-digit legacy port ID into prefecture code (first 2 digits)
 * and harbor code (last 2 digits).
 * e.g. "6723" → { pc: "67", hc: "23" }
 */
function splitPortId(portId: string): { pc: string; hc: string } {
	const padded = portId.padStart(4, "0");
	return { pc: padded.slice(0, 2), hc: padded.slice(2, 4) };
}

function buildPostBody(portId: string, date: Date): URLSearchParams {
	const { pc, hc } = splitPortId(portId);
	const params = new URLSearchParams({
		pc,
		hc,
		yr: String(date.getFullYear()),
		mn: String(date.getMonth() + 1),
		dy: String(date.getDate()),
		rg: "day",
	});
	return params;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

/**
 * Parse the JSON response from the new tide736.net API.
 *
 * Response shape:
 *   { status: 1, tide: { chart: { "YYYY-MM-DD": {
 *     moon:  { title: "中潮", age: "17.1", ... },
 *     flood: [{ time: "HH:MM", cm: N }, ...],  // 満潮
 *     edd:   [{ time: "HH:MM", cm: N }, ...],  // 干潮
 *     tide:  [{ time: "HH:MM", cm: N }, ...]   // every 20 min
 *   }}}}
 */
function parseResponse(raw: string, portId: string, date: Date): TideData {
	let json: Record<string, unknown>;
	try {
		json = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		throw new TideApiError(`tide736.net: non-JSON response for port ${portId}`);
	}

	// status=0 means API-level error
	if (json.status === 0) {
		const msg = typeof json.message === "string" ? json.message : "unknown error";
		throw new TideApiError(`tide736.net API error: ${msg}`);
	}

	const dateStr = formatDate(date);
	const tideObj = json.tide as Record<string, unknown> | undefined;
	const chartObj = tideObj?.chart as Record<string, unknown> | undefined;
	const dayData = chartObj?.[dateStr] as Record<string, unknown> | undefined;

	if (!dayData) {
		throw new TideApiError(`tide736.net: no data for ${dateStr} (port ${portId})`);
	}

	// --- tide type & moon age ---
	const moon = dayData.moon as Record<string, unknown> | undefined;
	const tideType = typeof moon?.title === "string" ? moon.title : "中潮";
	const moonAge = moon?.age !== undefined ? Math.round(parseFloat(String(moon.age))) : 0;

	// --- hourly tide levels (filter for HH:00 entries) ---
	const hourly: TidePoint[] = [];
	if (Array.isArray(dayData.tide)) {
		for (const entry of dayData.tide as unknown[]) {
			const e = entry as Record<string, unknown>;
			if (typeof e.time === "string" && e.time.endsWith(":00")) {
				const hour = Number.parseInt(e.time.split(":")[0] ?? "0", 10);
				if (hour >= 0 && hour <= 23) {
					hourly.push({ hour, level: typeof e.cm === "number" ? e.cm : 0 });
				}
			}
		}
	}

	// --- extremes (flood=満潮, edd=干潮) ---
	const extremes: TideExtreme[] = [];
	function extractExtremeEntries(arr: unknown[], type: "high" | "low"): void {
		for (const entry of arr) {
			const e = entry as Record<string, unknown>;
			if (typeof e.time === "string" && typeof e.cm === "number") {
				extremes.push({ type, time: e.time, level: e.cm });
			}
		}
	}
	if (Array.isArray(dayData.flood)) extractExtremeEntries(dayData.flood as unknown[], "high");
	if (Array.isArray(dayData.edd)) extractExtremeEntries(dayData.edd as unknown[], "low");

	return { portId, date: dateStr, tideType, moonAge, hourly, extremes };
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetch tide data for a given port and date from tide736.net.
 *
 * Retries up to 3 times with exponential backoff on network errors or 5xx
 * responses. Throws a TideApiError on 4xx errors or unparseable responses.
 */
export async function fetchTideData(portId: string, date: Date): Promise<TideData> {
	const body = buildPostBody(portId, date);
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		if (attempt > 0) {
			await sleep(RETRY_DELAYS_MS[attempt - 1]);
		}

		let response: Response;
		try {
			response = await fetch(BASE_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: body.toString(),
			});
		} catch (err) {
			lastError = err instanceof Error ? err : new Error("Network request failed");
			continue;
		}

		if (response.ok) {
			const raw = await response.text();
			return parseResponse(raw, portId, date);
		}

		if (response.status >= 400 && response.status < 500) {
			throw new TideApiError(
				`tide736.net API client error: ${response.status} ${response.statusText}`,
				response.status,
			);
		}

		// 5xx: retry
		lastError = new TideApiError(
			`tide736.net API server error: ${response.status} ${response.statusText}`,
			response.status,
		);
	}

	throw lastError ?? new TideApiError("tide736.net API request failed after retries");
}
