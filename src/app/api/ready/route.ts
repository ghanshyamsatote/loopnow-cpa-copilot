import { NextResponse } from "next/server";

// "Ready" check — the process is up AND its required configuration is
// present, so it's actually able to serve real requests (not just alive).
// Deliberately does not call the Gemini API itself on every check (that would
// add latency and burn API quota on a simple health probe) — it only
// confirms the credential it needs is configured.
export async function GET() {
    const hasModelKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    if (!hasModelKey) {
        return NextResponse.json(
            { status: "not_ready", reason: "GOOGLE_GENERATIVE_AI_API_KEY is not configured" },
            { status: 503 },
        );
    }

    return NextResponse.json({ status: "ready" });
}
