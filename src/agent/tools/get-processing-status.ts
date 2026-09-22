import { tool } from "ai";
import { z } from "zod";
import { getReceiptById } from "@/agent/state/receipt-store";

export function createGetProcessingStatusTool(selectedReceiptId: string | null) {
    return tool({
        description:
            "Returns the current processing stage and (if already processed) the saved classification for the selected receipt.",
        inputSchema: z.object({}),
        execute: async () => {
            if (!selectedReceiptId) return { status: "NO_RECEIPT_SELECTED" };
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            return {
                receiptId: selectedReceiptId,
                processingStage: receipt.processingStage,
                classification: receipt.classification,
            };
        },
    });
}
