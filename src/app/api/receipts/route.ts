import { getAllReceipts } from "@/agent/state/receipt-store";
import { NextResponse } from "next/server";

// Reads from the agent's live receipt store, not the static seed file — so
// this reflects whatever the agent has actually processed (category, GIFI
// code, ITC, review status), not just the original untouched receipts.
export async function GET() {
    return NextResponse.json({
        receipts: getAllReceipts(),
    });
}