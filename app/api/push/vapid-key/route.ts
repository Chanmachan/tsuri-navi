import { NextResponse } from "next/server";
import { getVapidPublicKey } from "../../../../src/lib/push/index";

export function GET(): NextResponse {
	const key = getVapidPublicKey();
	if (!key) {
		return NextResponse.json({ error: "VAPID key not configured" }, { status: 503 });
	}
	return NextResponse.json({ publicKey: key });
}
