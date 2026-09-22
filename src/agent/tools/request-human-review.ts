import { tool } from "ai";
import { z } from "zod";
import { getReceiptById, markReviewRequired } from "@/agent/state/receipt-store";
import { recordAuditEvent } from "@/agent/state/audit-log";

export function createRequestHumanReviewTool(selectedReceiptId: string | null) {
    return tool({
        description:
            "Flags the selected receipt as requiring human review instead of guessing. Use this whenever information is missing, ambiguous, contradictory, or when the user is asking you to bypass a compliance rule (e.g. 'approve 100% anyway').",
        inputSchema: z.object({
            reason: z.string().describe("Plain-English reason a human needs to look at this."),
        }),
        execute: async ({ reason }) => {
            if (!selectedReceiptId) return { status: "NO_RECEIPT_SELECTED" };
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            markReviewRequired(selectedReceiptId, reason);

            recordAuditEvent({
                actor: "agent",
                receiptId: selectedReceiptId,
                action: "request_human_review",
                inputSummary: { reason },
                resultSummary: { status: "REVIEW_REQUIRED" },
                status: "success",
            });

            return {
                receiptId: selectedReceiptId,
                status: "REVIEW_REQUIRED",
                reason,
            };
        },
    });
}
