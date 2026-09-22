import { tool } from "ai";
import { z } from "zod";
import { getReceiptById, setProcessingStage } from "@/agent/state/receipt-store";
import { recordAuditEvent } from "@/agent/state/audit-log";

// Deterministic mapping from the receipt's structural type to a bookkeeping
// category. This is intentionally NOT left to the LLM to invent — a fixed
// lookup table, same as the GIFI catalogue, so the same input always
// produces the same category.
const CATEGORY_BY_TYPE: Record<string, { category: string; confidence: "high" | "medium" | "low" }> = {
    OFFICE: { category: "Office Expenses", confidence: "high" },
    MEAL: { category: "Meals & Entertainment", confidence: "high" },
    OTHER: { category: "Other Business Expense", confidence: "medium" },
    CASH_DEPOSIT: { category: "Not an Expense (Cash Deposit)", confidence: "high" },
};

export function createClassifyExpenseTool(selectedReceiptId: string | null) {
    return tool({
        description:
            "Classifies the selected receipt into a bookkeeping expense category based on its structural type. Returns REVIEW_REQUIRED confidence when the type is unknown or ambiguous — never guess.",
        inputSchema: z.object({}),
        execute: async () => {
            if (!selectedReceiptId) return { status: "NO_RECEIPT_SELECTED" };
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            setProcessingStage(selectedReceiptId, "categorizing");

            const mapping = CATEGORY_BY_TYPE[receipt.type];

            const result = mapping
                ? {
                      status: "CLASSIFIED" as const,
                      category: mapping.category,
                      confidence: mapping.confidence,
                      isExpense: receipt.type !== "CASH_DEPOSIT",
                  }
                : {
                      status: "REVIEW_REQUIRED" as const,
                      category: null,
                      confidence: "low" as const,
                      isExpense: null,
                      reason:
                          "Receipt type is unknown/unclassified. Unable to determine business purpose with confidence.",
                  };

            recordAuditEvent({
                actor: "agent",
                receiptId: selectedReceiptId,
                action: "classify_expense",
                inputSummary: { type: receipt.type },
                resultSummary: result,
                status: "success",
            });

            return { receiptId: selectedReceiptId, ...result };
        },
    });
}
