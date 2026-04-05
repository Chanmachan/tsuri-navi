import { NextRequest, NextResponse } from "next/server";
import { deleteSubscription, saveSubscription } from "../../../../src/lib/push/subscriptions";

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
	if (
		typeof endpoint !== "string" ||
		typeof (keys as Record<string, unknown> | null)?.p256dh !== "string" ||
		typeof (keys as Record<string, unknown> | null)?.auth !== "string"
	) {
		return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
	}
	saveSubscription({ endpoint, keys: keys as { p256dh: string; auth: string } });
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
