import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription, saveSubscription } from "../../../../src/lib/push/subscriptions";

// Web Push endpoint URLs are typically ~200 chars; keys are base64 ~88 chars each.
// Reject oversized payloads to prevent DB flooding.
const MAX_ENDPOINT_LEN = 500;
const MAX_KEY_LEN = 200;

// Simple in-memory sliding-window rate limiter.
// Allows at most RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS per IP.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
	return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const windowStart = now - RATE_LIMIT_WINDOW_MS;
	const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => t > windowStart);
	if (timestamps.length >= RATE_LIMIT_MAX) {
		rateLimitStore.set(ip, timestamps);
		return false;
	}
	timestamps.push(now);
	rateLimitStore.set(ip, timestamps);
	return true;
}

function isPrivateHostname(hostname: string): boolean {
	const h = hostname.toLowerCase();
	return (
		h === "localhost" ||
		h === "::1" ||
		h.endsWith(".local") ||
		h.startsWith("127.") ||
		h.startsWith("10.") ||
		h.startsWith("192.168.") ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(h)
	);
}

function isValidPushEndpoint(value: string): boolean {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:") return false;
		if (isPrivateHostname(url.hostname)) return false;
		return true;
	} catch {
		return false;
	}
}

async function parseBody(req: NextRequest): Promise<unknown> {
	try {
		return await req.json();
	} catch {
		return null;
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	if (!checkRateLimit(getClientIp(req))) {
		return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
	}

	const body = await parseBody(req);
	const { endpoint, keys } = (body as Record<string, unknown>) ?? {};
	const p256dh = (keys as Record<string, unknown> | null)?.p256dh;
	const auth = (keys as Record<string, unknown> | null)?.auth;

	if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
		return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
	}

	if (!isValidPushEndpoint(endpoint)) {
		return NextResponse.json({ error: "invalid endpoint URL" }, { status: 400 });
	}

	if (
		endpoint.length > MAX_ENDPOINT_LEN ||
		p256dh.length > MAX_KEY_LEN ||
		auth.length > MAX_KEY_LEN
	) {
		return NextResponse.json({ error: "payload too large" }, { status: 413 });
	}

	try {
		saveSubscription({ endpoint, keys: { p256dh, auth } });
	} catch {
		return NextResponse.json({ error: "failed to save subscription" }, { status: 500 });
	}
	return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
	if (!checkRateLimit(getClientIp(req))) {
		return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
	}

	const body = await parseBody(req);
	const { endpoint: bodyEndpoint } = (body as Record<string, unknown>) ?? {};
	const endpoint =
		typeof bodyEndpoint === "string" ? bodyEndpoint : req.nextUrl.searchParams.get("endpoint");
	if (typeof endpoint !== "string") {
		return NextResponse.json({ error: "invalid endpoint" }, { status: 400 });
	}
	try {
		deleteSubscription(endpoint);
	} catch {
		return NextResponse.json({ error: "failed to delete subscription" }, { status: 500 });
	}
	return new NextResponse(null, { status: 204 });
}
