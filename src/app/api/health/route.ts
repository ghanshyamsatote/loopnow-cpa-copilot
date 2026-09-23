import { NextResponse } from "next/server";

// "Alive" check — the process is up and can respond at all. Deliberately does
// NOT check external dependencies (e.g. the Gemini API) — that distinction
// belongs to /api/ready. Used by Docker's HEALTHCHECK.
export async function GET() {
    return NextResponse.json({ status: "alive" });
}
