import { tool } from "ai";
import { z } from "zod";
import { getReceiptById } from "@/agent/state/receipt-store";
import { validateGstHstNumberFormat } from "@/domain/cra/gst-number-rules";
import { recordAuditEvent } from "@/agent/state/audit-log";

export function createValidateGstNumberTool(selectedReceiptId: string | null) {
    return tool({
        description:
            "Deterministically checks whether the selected receipt's GST/HST registration number is present and correctly formatted. This only checks FORMAT — it cannot confirm the number is genuinely registered with CRA.",
        inputSchema: z.object({}),
        execute: async () => {
            if (!selectedReceiptId) {
                return { status: "NO_RECEIPT_SELECTED" };
            }
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            const result = validateGstHstNumberFormat(receipt.gstHstNumber);

            recordAuditEvent({
                actor: "agent",
                receiptId: selectedReceiptId,
                action: "validate_gst_hst_number_format",
                inputSummary: { gstHstNumber: receipt.gstHstNumber },
                resultSummary: result,
                status: "success",
            });

            return {
                receiptId: selectedReceiptId,
                ...result,
                source: "CRA_RULE_ENGINE",
            };
        },
    });
}
