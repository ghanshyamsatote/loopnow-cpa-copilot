import { tool } from "ai";
import { z } from "zod";
import { setProcessingStage } from "@/agent/state/receipt-store";
import { findGifiCode, suggestGifiCodesForExpenseType } from "@/domain/gifi/gify-catalogue";
import { recordAuditEvent } from "@/agent/state/audit-log";
import { getReceiptById } from "@/agent/state/receipt-store";

export function createAssignGifiCodeTool(selectedReceiptId: string | null) {
    return tool({
        description:
            "Validates a proposed GIFI code against the controlled GIFI catalogue. You may propose a code based on the expense classification, but this tool is the only authority on whether that code actually exists — an unknown code is always rejected, never accepted.",
        inputSchema: z.object({
            proposedGifiCode: z
                .string()
                .describe("The GIFI code you believe fits this expense, e.g. '8810'."),
        }),
        execute: async ({ proposedGifiCode }) => {
            if (!selectedReceiptId) return { status: "NO_RECEIPT_SELECTED" };
            const receipt = getReceiptById(selectedReceiptId);
            if (!receipt) return { status: "NOT_FOUND" };

            setProcessingStage(selectedReceiptId, "mapping");

            const entry = findGifiCode(proposedGifiCode);

            const result = entry
                ? {
                      status: "VALID" as const,
                      gifiCode: entry.code,
                      gifiName: entry.name,
                      gifiDescription: entry.description,
                  }
                : {
                      status: "REVIEW_REQUIRED" as const,
                      gifiCode: null,
                      reason: `'${proposedGifiCode}' is not a recognized code in the GIFI catalogue.`,
                      suggestions: suggestGifiCodesForExpenseType(receipt.type).map(
                          (s) => ({ code: s.code, name: s.name }),
                      ),
                  };

            recordAuditEvent({
                actor: "agent",
                receiptId: selectedReceiptId,
                action: "assign_gifi_code",
                inputSummary: { proposedGifiCode },
                resultSummary: result,
                status: result.status === "VALID" ? "success" : "error",
            });

            return { receiptId: selectedReceiptId, ...result, source: "GIFI_CATALOGUE" };
        },
    });
}
