import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription, saveSubscription } from "../../../../src/lib/push/subscriptions";

// Web Push endpoint URLs are typically ~200 chars; keys are base64 ~88 chars each.
// Reject oversized payloads to prevent DB flooding.
const MAX_ENDPOINT_LEN = 500;
const MAX_KEY_LEN = 200;

async function parseBody(req: NextRequest): Promise<unknown> {
	try {
		return await req.json();
	} catch {
		return null;
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	const body = await parseBody(req);
	const { endpoint, keys } = (body as Record<string, unknown>) ?? {};
	const p256dh = (keys as Record<string, unknown> | null)?.p256dh;
	const auth = (keys as Record<string, unknown> | null)?.auth;

	if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
		return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
	}

	if (
		endpoint.length > MAX_ENDPOINT_LEN ||
		p256dh.length > MAX_KEY_LEN ||
		auth.length > MAX_KEY_LEN
	) {
		return NextResponse.json({ error: "payload too large" }, { status: 413 });
	}

	saveSubscription({ endpoint, keys: { p256dh, auth } });
	return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
	const body = await parseBody(req);
	const { endpoint } = (body as Record<string, unknown>) ?? {};
	if (typeof endpoint !== "string") {
		return NextResponse.json({ error: "invalid endpoint" }, { status: 400 });
	}
	deleteSubscription(endpoint);
	return new NextResponse(null, { status: 204 });
}
