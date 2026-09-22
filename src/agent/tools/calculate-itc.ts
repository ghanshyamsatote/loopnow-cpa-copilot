import { tool } from "ai";
import { z } from "zod";
import { getReceiptById, setProcessingStage } from "@/agent/state/receipt-store";
import { validateGstHstNumberFormat } from "@/domain/cra/gst-number-rules";
import { validateCraDocumentation } from "@/domain/cra/documentation-rules";
import { calculateEligibleITC } from "@/domain/cra/itc-rules";
import { recordAuditEvent } from "@/agent/state/audit-log";

/**
 * Deterministically calculates the eligible GST/HST Input Tax Credit.
 *
 * Security note: `mealEntertainment` is NEVER taken from the model's input —
 * it is always derived from the receipt's own `type` field. This prevents a
 * user or injected receipt text from talking the agent into skipping the 50%
 * meals limitation by simply asserting "this isn't a meal." Documentation
 * sufficiency is likewise recomputed here rather than trusted from a prior
 * tool call, so this tool is safe to call on its own and always produces the
 * same result for the same receipt (pure function of stored data).
 */
export function createCalculateItcTool(selectedReceiptId: string | null) {
    return tool({
        description:
            "Deterministically calculates the eligible Canadian GST/HST Input Tax Credit (ITC) for the selected receipt, applying documentation sufficiency, commercial-use percentage, and the meals/entertainment 50% limitation where applicable. This is the ONLY source of truth for the ITC amount — never compute or state a dollar figure yourself.",
        inputSchema: z.object({
            commercialUsePercentageOverride: z
                .number()
                .min(0)
                .max(100)
                .optional()
                .describe(
                    "Only provide this if the user explicitly stated a business-use percentage different from what is on file.",
                ),
        }),
        execute: async ({ commercialUsePercentageOverride }) => {
            if (!selectedReceiptId) return { status: "NO_RECEIPT_SELECTED" };
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            setProcessingStage(selectedReceiptId, "calculating");

            const gstStatus = validateGstHstNumberFormat(receipt.gstHstNumber);
            const docResult = validateCraDocumentation({
                totalAmount: receipt.totalAmount,
                gstNumberStatus: gstStatus.status,
                hasSupplierName: Boolean(receipt.merchantName),
                hasDate: Boolean(receipt.date),
                hasDescription: Boolean(receipt.description),
            });

            const mealEntertainment = receipt.type === "MEAL";
            const commercialUsePercentage =
                commercialUsePercentageOverride ?? receipt.commercialUsePercentage;

            const result = calculateEligibleITC({
                subtotal: receipt.subtotal,
                taxAmount: receipt.taxAmount,
                taxType: "GST",
                expenseCategory: receipt.type,
                commercialUsePercentage,
                mealEntertainment,
                documentationStatus: docResult.status,
            });

            recordAuditEvent({
                actor: "agent",
                receiptId: selectedReceiptId,
                action: "calculate_eligible_itc",
                inputSummary: {
                    taxAmount: receipt.taxAmount,
                    commercialUsePercentage,
                    mealEntertainment,
                    documentationStatus: docResult.status,
                },
                resultSummary: result,
                status: "success",
            });

            return {
                receiptId: selectedReceiptId,
                ...result,
                documentation: {
                    tier: docResult.tier,
                    status: docResult.status,
                },
                source: "CRA_RULE_ENGINE",
            };
        },
    });
}
