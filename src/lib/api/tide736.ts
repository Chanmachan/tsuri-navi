/**
 * tide736.net Tide Prediction API client.
 * Fetches daily tide data for Japanese ports.
 * API endpoint: https://tide736.net/get_tide/
 */

const BASE_URL = "https://tide736.net/get_tide/";
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
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "TideApiError";
  }
}

// ---------------------------------------------------------------------------
// Port ID map (preset fishing spots)
// Note: These port IDs are approximate and should be verified against
// the official tide736.net port list.
// ---------------------------------------------------------------------------

const PORT_ID_MAP: Record<string, string> = {
  久ノ浜漁港: "6723",
  四倉漁港: "6712",
  小名浜港: "6701",
  中之作漁港: "6718",
  豊間の磯: "6706",
  江名港: "6704",
  桃浦漁港: "3501",
  宇佐漁港: "7401",
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
// URL builder
// ---------------------------------------------------------------------------

function buildUrl(portId: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const yyyymm = `${year}${month}`;
  const params = new URLSearchParams({ port_id: portId, yyyymm });
  return `${BASE_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

/**
 * Parse the raw text/HTML response from tide736.net.
 *
 * The API returns an HTML page containing tide data. We attempt to extract:
 * - Hourly tide levels embedded in the page (typically in a table or script)
 * - High/low tide extremes
 * - Tide type (潮回り) and moon age (月齢)
 *
 * If the format cannot be recognised a TideApiError is thrown.
 */
function parseResponse(
  raw: string,
  portId: string,
  date: Date
): TideData {
  // Try JSON first (in case the API evolves to return JSON)
  try {
    const json = JSON.parse(raw) as unknown;
    if (json && typeof json === "object") {
      return parseJsonResponse(json as Record<string, unknown>, portId, date);
    }
  } catch {
    // Not JSON — fall through to HTML parsing
  }

  return parseHtmlResponse(raw, portId, date);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseJsonResponse(
  json: Record<string, unknown>,
  portId: string,
  date: Date
): TideData {
  const hourly: TidePoint[] = [];
  const extremes: TideExtreme[] = [];

  // Attempt to read hourly array
  if (Array.isArray(json.hourly)) {
    for (let i = 0; i < Math.min(24, (json.hourly as unknown[]).length); i++) {
      const entry = (json.hourly as unknown[])[i];
      if (entry !== null && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        hourly.push({
          hour: typeof e.hour === "number" ? e.hour : i,
          level: typeof e.level === "number" ? e.level : 0,
        });
      }
    }
  }

  // Attempt to read extremes array
  if (Array.isArray(json.extremes)) {
    for (const entry of json.extremes as unknown[]) {
      if (entry !== null && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (
          (e.type === "high" || e.type === "low") &&
          typeof e.time === "string" &&
          typeof e.level === "number"
        ) {
          extremes.push({ type: e.type, time: e.time, level: e.level });
        }
      }
    }
  }

  return {
    portId,
    date: formatDate(date),
    tideType: typeof json.tideType === "string" ? json.tideType : "中潮",
    moonAge: typeof json.moonAge === "number" ? json.moonAge : 0,
    hourly,
    extremes,
  };
}

// Tide type keywords used in HTML parsing
const TIDE_TYPES = ["大潮", "中潮", "小潮", "長潮", "若潮"] as const;
type TideTypeLiteral = (typeof TIDE_TYPES)[number];

function extractTideType(html: string): string {
  for (const t of TIDE_TYPES) {
    if (html.includes(t)) return t;
  }
  return "中潮";
}

function extractMoonAge(html: string): number {
  // Common patterns: 月齢：14.2  /  月齢: 14  /  月齢14
  const match = html.match(/月齢[：:\s]*([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    const value = parseFloat(match[1]);
    if (!isNaN(value)) return Math.round(value);
  }
  return 0;
}

function extractHourlyLevels(html: string): TidePoint[] {
  const points: TidePoint[] = [];

  // Look for patterns like arrays of numbers that could be hourly levels
  // Many tide sites embed data as: var tide_data = [100, 105, 110, ...];
  const arrayMatch = html.match(
    /(?:tide|choi|潮位)[^=]*=\s*\[([0-9,\s]+)\]/i
  );
  if (arrayMatch) {
    const values = arrayMatch[1].split(",").map((v) => parseInt(v.trim(), 10));
    for (let i = 0; i < Math.min(24, values.length); i++) {
      if (!isNaN(values[i])) {
        points.push({ hour: i, level: values[i] });
      }
    }
    if (points.length > 0) return points;
  }

  // Fallback: look for a sequence of 24 numbers in table cells
  const cellPattern = /<td[^>]*>\s*([0-9]+)\s*<\/td>/gi;
  const cellValues: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = cellPattern.exec(html)) !== null) {
    const v = parseInt(m[1], 10);
    if (!isNaN(v) && v >= 0 && v <= 500) {
      cellValues.push(v);
    }
  }
  if (cellValues.length >= 24) {
    for (let i = 0; i < 24; i++) {
      points.push({ hour: i, level: cellValues[i] });
    }
    return points;
  }

  return points;
}

function extractExtremes(html: string): TideExtreme[] {
  const extremes: TideExtreme[] = [];

  // Pattern: 満潮 hh:mm (Ncm) or 干潮 hh:mm (Ncm)
  const pattern =
    /(満潮|干潮)\s*(?:時刻[：:\s]*)?\s*([0-9]{1,2}:[0-9]{2})\s*(?:潮位[：:\s]*)?([0-9]+)\s*cm/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    extremes.push({
      type: m[1] === "満潮" ? "high" : "low",
      time: m[2].padStart(5, "0"),
      level: parseInt(m[3], 10),
    });
  }

  return extremes;
}

function parseHtmlResponse(
  html: string,
  portId: string,
  date: Date
): TideData {
  const tideType: TideTypeLiteral | string = extractTideType(html);
  const moonAge = extractMoonAge(html);
  const hourly = extractHourlyLevels(html);
  const extremes = extractExtremes(html);

  // If we could not extract meaningful data at all, throw
  if (hourly.length === 0 && extremes.length === 0) {
    throw new TideApiError(
      `tide736.net: could not parse tide data for port ${portId} on ${formatDate(date)}. ` +
        "The API response format may have changed."
    );
  }

  return {
    portId,
    date: formatDate(date),
    tideType,
    moonAge,
    hourly,
    extremes,
  };
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
export async function fetchTideData(
  portId: string,
  date: Date
): Promise<TideData> {
  const url = buildUrl(portId, date);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }

    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error("Network request failed");
      continue;
    }

    if (response.ok) {
      const raw = await response.text();
      return parseResponse(raw, portId, date);
    }

    if (response.status >= 400 && response.status < 500) {
      throw new TideApiError(
        `tide736.net API client error: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    // 5xx: retry
    lastError = new TideApiError(
      `tide736.net API server error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  throw (
    lastError ??
    new TideApiError("tide736.net API request failed after retries")
  );
}
