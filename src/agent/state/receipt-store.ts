// In-memory receipt store used by the agent's tools.
//
// This stands in for a real database for now (Day 3 of the build). It is the
// single source of truth the tools read from and write to — the UI's
// `selectedReceiptId` only tells the agent WHICH record to operate on; the
// actual receipt data and its processing state always come from here, never
// from anything the LLM asserts.

import { receipts as seedReceipts } from "@/db/seed/receipt";
import { Receipt } from "@/domain/expences/receipt";

export type ProcessingStage =
    | "idle"
    | "reading"
    | "validating"
    | "categorizing"
    | "calculating"
    | "mapping"
    | "review"
    | "complete"
    | "error";

export interface ClassificationResult {
    category: string;
    gifiCode: string;
    gifiName: string;
    eligibleITC: number;
    itcStatus: string;
    itcReasonCode: string;
    documentationStatus: string;
    documentationTier: number;
    reviewRequired: boolean;
    reviewReason?: string;
    explanation: string;
    ruleVersion: string;
    processedAt: string;
}

export interface ReceiptRecord extends Receipt {
    processingStage: ProcessingStage;
    classification: ClassificationResult | null;
}

// Module-level store — persists for the lifetime of the server process.
// Seeded once from the mock receipts.
const store: Map<string, ReceiptRecord> = new Map(
    seedReceipts.map((r) => [
        r.id,
        { ...r, processingStage: "idle", classification: null },
    ]),
);

export const CRA_RULESET_VERSION = "2026.09.1";

export function getAllReceipts(): ReceiptRecord[] {
    return Array.from(store.values());
}

export function getReceiptById(id: string): ReceiptRecord | undefined {
    return store.get(id);
}

export function setProcessingStage(id: string, stage: ProcessingStage): void {
    const record = store.get(id);
    if (record) record.processingStage = stage;
}

/**
 * Idempotent write: calling this twice for the same receipt with the same
 * result simply overwrites the same record rather than creating a duplicate.
 * There is exactly one classification per receiptId by construction — the Map
 * key IS the idempotency key.
 */
export function upsertClassification(
    id: string,
    classification: ClassificationResult,
): ReceiptRecord | undefined {
    const record = store.get(id);
    if (!record) return undefined;

    record.classification = classification;
    record.category = classification.category;
    record.processingStage = classification.reviewRequired
        ? "review"
        : "complete";

    return record;
}

export function markReviewRequired(id: string, reason: string): void {
    const record = store.get(id);
    if (!record) return;
    record.processingStage = "review";
}
