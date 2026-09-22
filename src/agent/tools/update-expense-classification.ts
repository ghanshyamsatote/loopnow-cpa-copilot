import { tool } from "ai";
import { z } from "zod";
import {
    getReceiptById,
    upsertClassification,
    CRA_RULESET_VERSION,
} from "@/agent/state/receipt-store";
import { validateGstHstNumberFormat } from "@/domain/cra/gst-number-rules";
import { validateCraDocumentation } from "@/domain/cra/documentation-rules";
import { calculateEligibleITC } from "@/domain/cra/itc-rules";
import { findGifiCode } from "@/domain/gifi/gify-catalogue";
import { recordAuditEvent } from "@/agent/state/audit-log";

const CATEGORY_BY_TYPE: Record<string, string> = {
    OFFICE: "Office Expenses",
    MEAL: "Meals & Entertainment",
    OTHER: "Other Business Expense",
    CASH_DEPOSIT: "Not an Expense (Cash Deposit)",
};

/**
 * Final step of the agent loop. This is a deterministic SELF-VERIFICATION
 * pass (spec §19): rather than trusting whatever category/ITC/GIFI numbers
 * the model has stated in conversation, it re-derives every fact from the
 * stored receipt and the rule engine from scratch, and ONLY persists that
 * re-derived result. The model's only real influence here is the GIFI code
 * it proposes (validated against the catalogue) and the free-text
 * explanation it writes.
 *
 * This call is idempotent: calling it twice for the same receipt overwrites
 * the same record rather than creating a duplicate (the store is keyed by
 * receiptId).
 */
export function createUpdateExpenseClassificationTool(
    selectedReceiptId: string | null,
) {
    return tool({
        description:
            "Persists the final classification for the selected receipt: category, GIFI code, and eligible ITC. Call this LAST, after validating documentation, calculating the ITC, and confirming the GIFI code. The system independently re-verifies every number before saving — it does not simply store whatever you say.",
        inputSchema: z.object({
            proposedGifiCode: z.string(),
            explanation: z
                .string()
                .describe(
                    "A short, plain-English explanation of the classification decision, for display to the user.",
                ),
        }),
        execute: async ({ proposedGifiCode, explanation }) => {
            if (!selectedReceiptId) return { status: "NO_RECEIPT_SELECTED" };
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            // --- Independent re-derivation, ignoring any numbers the model stated ---
            const gstStatus = validateGstHstNumberFormat(receipt.gstHstNumber);
            const docResult = validateCraDocumentation({
                totalAmount: receipt.totalAmount,
                gstNumberStatus: gstStatus.status,
                hasSupplierName: Boolean(receipt.merchantName),
                hasDate: Boolean(receipt.date),
                hasDescription: Boolean(receipt.description),
            });
            const mealEntertainment = receipt.type === "MEAL";
            const itcResult = calculateEligibleITC({
                subtotal: receipt.subtotal,
                taxAmount: receipt.taxAmount,
                taxType: "GST",
                expenseCategory: receipt.type,
                commercialUsePercentage: receipt.commercialUsePercentage,
                mealEntertainment,
                documentationStatus: docResult.status,
            });
            const gifiEntry = findGifiCode(proposedGifiCode);
            const category = CATEGORY_BY_TYPE[receipt.type] ?? null;

            // --- Self-verification checklist (spec §19) ---
            const checks = {
                receiptExists: true,
                categoryExists: category !== null,
                gifiCodeExists: gifiEntry !== undefined,
                itcMathValid:
                    itcResult.eligibleITC >= 0 &&
                    itcResult.eligibleITC <= itcResult.grossTax,
                documentationSufficient: docResult.status === "sufficient",
            };

            const allChecksPassed = Object.values(checks).every(Boolean);

            const reviewRequired = !allChecksPassed;
            const reviewReasons: string[] = [];
            if (!checks.categoryExists) reviewReasons.push("Unable to classify expense type.");
            if (!checks.gifiCodeExists)
                reviewReasons.push(`Proposed GIFI code '${proposedGifiCode}' not found in catalogue.`);
            if (!checks.documentationSufficient)
                reviewReasons.push("CRA documentation requirements not met.");
            if (receipt.type === "CASH_DEPOSIT")
                reviewReasons.push("This is a deposit, not an expense — no ITC applies.");

            const classification = {
                category: category ?? "Uncategorized",
                gifiCode: gifiEntry?.code ?? "UNASSIGNED",
                gifiName: gifiEntry?.name ?? "Unassigned — pending review",
                eligibleITC: receipt.type === "CASH_DEPOSIT" ? 0 : itcResult.eligibleITC,
                itcStatus: receipt.type === "CASH_DEPOSIT" ? "ineligible" : itcResult.status,
                itcReasonCode:
                    receipt.type === "CASH_DEPOSIT" ? "NOT_AN_EXPENSE" : itcResult.reasonCode,
                documentationStatus: docResult.status,
                documentationTier: docResult.tier,
                reviewRequired: reviewRequired || receipt.type === "CASH_DEPOSIT",
                reviewReason: reviewReasons.length > 0 ? reviewReasons.join(" ") : undefined,
                explanation,
                ruleVersion: CRA_RULESET_VERSION,
                processedAt: new Date().toISOString(),
            };

            const updated = upsertClassification(selectedReceiptId, classification);

            recordAuditEvent({
                actor: "agent",
                receiptId: selectedReceiptId,
                action: "update_expense_classification",
                inputSummary: { proposedGifiCode },
                resultSummary: { checks, classification },
                status: updated ? "success" : "error",
            });

            return {
                receiptId: selectedReceiptId,
                status: updated ? "SAVED" : "ERROR",
                selfVerification: checks,
                classification,
            };
        },
    });
}
