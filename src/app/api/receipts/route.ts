import { receipts } from "@/db/seed/receipt";
import { NextResponse } from "next/server";


export async function GET() {
    return NextResponse.json({
        receipts,
    });
}