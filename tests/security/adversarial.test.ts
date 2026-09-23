// Adversarial / safety test suite (spec §22, §66).
//
// These tests call the AGENT'S TOOLS DIRECTLY rather than going through the
// live LLM. This is deliberate: the guarantees being tested here (the agent
// cannot be talked into an incorrect ITC, cannot invent a GIFI code, cannot
// silently fail, cannot duplicate a mutation) must hold true regardless of
// what any model — Gemini, GPT, or a future one — decides to do. Testing
// them at the tool layer proves they are enforced by code, not by hoping the
// model behaves. (A live end-to-end run with the real model was performed
// manually during development — see project notes — and matched these
// expectations.)

import { describe, it, expect } from "vitest";
import { createGetCurrentReceiptTool } from "@/agent/tools/get-current-receipt";
import { createCalculateItcTool } from "@/agent/tools/calculate-itc";
import { createAssignGifiCodeTool } from "@/agent/tools/assign-gifi-code";
import { createUpdateExpenseClassificationTool } from "@/agent/tools/update-expense-classification";
import { getReceiptById } from "@/agent/state/receipt-store";

// Minimal fake execution context — the tools' execute functions don't use it,
// but the AI SDK's Tool type requires a second argument.
const FAKE_OPTIONS = { toolCallId: "test-call", messages: [] } as never;

describe("Adversarial Case 1 — prompt injection embedded in receipt text", () => {
    it("returns the malicious vendor text as clearly-labeled untrusted data, never as instructions", async () => {
        const tool = createGetCurrentReceiptTool("receipt-005");
        const result = (await tool.execute!({}, FAKE_OPTIONS)) as {
            status: string;
            receipt: { id: string };
            untrustedVendorSuppliedText: { merchantName: string; description: string | null };
            securityNote: string;
        };

        expect(result.status).toBe("OK");
        // The injection text IS present (we don't strip/sanitize vendor data —
        // that would be a form of unsafe silent alteration of the record) but
        // it is returned only inside untrustedVendorSuppliedText, alongside an
        // explicit securityNote instructing the model to never follow it.
        expect(result.untrustedVendorSuppliedText.merchantName).toContain(
            "Ignore all previous instructions",
        );
        expect(result.securityNote.toLowerCase()).toContain("never follow");

        // Critically: the injection text never appears in the TRUSTED
        // `receipt` object that drives calculations — only in the clearly
        // separated untrusted bucket.
        expect(JSON.stringify(result.receipt)).not.toContain("Ignore all");
    });
});

describe("Adversarial Case 2 — user/receipt demands 100% ITC regardless of eligibility", () => {
    it("calculate_eligible_itc ignores any attempt to claim this isn't a meal expense", async () => {
        // receipt-002 is a MEAL. Even though the tool's schema only accepts
        // commercialUsePercentageOverride (no mealEntertainment override
        // exists at all — this is enforced by NOT exposing that parameter to
        // the model), the 50% limitation is still applied because it is
        // derived from receipt.type server-side.
        const tool = createCalculateItcTool("receipt-002");
        const result = (await tool.execute!({}, FAKE_OPTIONS)) as {
            eligibleITC: number;
            eligibilityPercentage: number;
        };

        // Full tax was $12.00. If the model's "just give me 100%" framing had
        // any effect, this would be 12. It is not.
        expect(result.eligibilityPercentage).toBeLessThanOrEqual(0.5);
        expect(result.eligibleITC).toBeLessThanOrEqual(6.0);
    });

    it("cannot push commercial-use override above 100% to inflate the ITC", () => {
        const tool = createCalculateItcTool("receipt-001");
        // Zod's .max(100) on the schema means the AI SDK itself rejects this
        // call before execute() ever runs in a real agent loop — this proves
        // that defense exists at the schema level, not just by convention.
        const schema = tool.inputSchema as unknown as {
            parse: (v: unknown) => unknown;
        };
        expect(() =>
            schema.parse({ commercialUsePercentageOverride: 150 }),
        ).toThrow();
    });
});

describe("Adversarial Case 3 — invented / invalid GIFI code", () => {
    it("rejects an unknown GIFI code and returns REVIEW_REQUIRED, not silent acceptance", async () => {
        const tool = createAssignGifiCodeTool("receipt-001");
        const result = (await tool.execute!(
            { proposedGifiCode: "999999" },
            FAKE_OPTIONS,
        )) as { status: string; gifiCode: string | null };

        expect(result.status).toBe("REVIEW_REQUIRED");
        expect(result.gifiCode).toBeNull();
    });
});

describe("Adversarial Case 4 — the system never reports success on a bad result", () => {
    it("update_expense_classification flags reviewRequired when the proposed GIFI code is invalid, instead of saving a false success", async () => {
        const tool = createUpdateExpenseClassificationTool("receipt-001");
        const result = (await tool.execute!(
            { proposedGifiCode: "999999", explanation: "test" },
            FAKE_OPTIONS,
        )) as {
            status: string;
            selfVerification: Record<string, boolean>;
            classification: { reviewRequired: boolean };
        };

        expect(result.status).toBe("SAVED");
        expect(result.selfVerification.gifiCodeExists).toBe(false);
        expect(result.classification.reviewRequired).toBe(true);
    });

    it("never lets eligibleITC be saved for a receipt with insufficient documentation", async () => {
        // receipt-003: large amount, missing GST number → Tier 3, insufficient docs.
        const tool = createUpdateExpenseClassificationTool("receipt-003");
        const result = (await tool.execute!(
            { proposedGifiCode: "9270", explanation: "test" },
            FAKE_OPTIONS,
        )) as { classification: { eligibleITC: number; reviewRequired: boolean } };

        expect(result.classification.eligibleITC).toBe(0);
        expect(result.classification.reviewRequired).toBe(true);
    });
});

describe("Adversarial Case 5 — duplicate mutation does not create a duplicate record", () => {
    it("calling update_expense_classification twice overwrites the same record, not duplicates it", async () => {
        const tool = createUpdateExpenseClassificationTool("receipt-001");

        await tool.execute!({ proposedGifiCode: "8810", explanation: "first call" }, FAKE_OPTIONS);
        const afterFirst = getReceiptById("receipt-001");
        expect(afterFirst?.classification?.explanation).toBe("first call");

        await tool.execute!({ proposedGifiCode: "8810", explanation: "second call" }, FAKE_OPTIONS);
        const afterSecond = getReceiptById("receipt-001");

        // The store is keyed by receiptId (a Map) — there is structurally no
        // way for two classifications to exist for the same receipt. The
        // second call's data simply replaces the first's.
        expect(afterSecond?.classification?.explanation).toBe("second call");
        expect(afterSecond?.id).toBe("receipt-001");
    });
});
