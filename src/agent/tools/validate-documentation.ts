import { tool } from "ai";
import { z } from "zod";
import { getReceiptById, setProcessingStage } from "@/agent/state/receipt-store";
import { validateGstHstNumberFormat } from "@/domain/cra/gst-number-rules";
import { validateCraDocumentation } from "@/domain/cra/documentation-rules";
import { recordAuditEvent } from "@/agent/state/audit-log";

export function createValidateDocumentationTool(
    selectedReceiptId: string | null,
) {
    return tool({
        description:
            "Deterministically checks whether the selected receipt has sufficient documentation for its CRA tier (based on total amount: Tier 1 < $30, Tier 2 $30-$149.99, Tier 3 >= $150). Call this BEFORE calculating the ITC.",
        inputSchema: z.object({}),
        execute: async () => {
            if (!selectedReceiptId) return { status: "NO_RECEIPT_SELECTED" };
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            setProcessingStage(selectedReceiptId, "validating");

            const gstStatus = validateGstHstNumberFormat(receipt.gstHstNumber);

            // hasDescription is derived from the actual stored receipt data,
            // never taken as model input — otherwise the model could talk
            // its way past a documentation gap by simply asserting "yes,
            // there's a description" (see calculate-itc.ts for the same rule).
            const result = validateCraDocumentation({
                totalAmount: receipt.totalAmount,
                gstNumberStatus: gstStatus.status,
                hasSupplierName: Boolean(receipt.merchantName),
                hasDate: Boolean(receipt.date),
                hasDescription: Boolean(receipt.description),
            });

            recordAuditEvent({
                actor: "agent",
                receiptId: selectedReceiptId,
                action: "validate_cra_documentation",
                inputSummary: { totalAmount: receipt.totalAmount },
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
