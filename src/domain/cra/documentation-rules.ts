// CRA documentation requirements for claiming an ITC, tiered by total transaction
// amount (GST/HST Memorandum 8-4 "Documentary Requirements for Claiming Input Tax
// Credits"). Higher-value purchases require more prescribed information to be
// present on the supporting documentation before an ITC can be claimed.
//
// Tier 1: total < $30      — minimal info, but must still let the registrant
//                             determine the ITC amount (e.g. supplier name, date, total).
// Tier 2: $30 <= total < $150 — adds: GST/HST registration number, invoice/receipt
//                             date, total amount, and an indication of GST/HST paid.
// Tier 3: total >= $150       — highest tier: adds purchaser's name/business name,
//                             terms of payment, and a description of the goods/services
//                             sufficient to identify them.
//
// This is expressed as a set of required-field checks per tier, not a single
// amount-threshold boolean, so each tier's actual information requirements are
// independently visible and testable.

import { GstNumberStatus } from "./gst-number-rules";

export type DocumentationTier = 1 | 2 | 3;

export type DocumentationStatus = "sufficient" | "insufficient" | "review";

export interface DocumentationCheckInput {
    totalAmount: number;
    gstNumberStatus: GstNumberStatus;
    hasSupplierName: boolean;
    hasDate: boolean;
    hasDescription: boolean;
}

export interface DocumentationCheckResult {
    tier: DocumentationTier;
    status: DocumentationStatus;
    missingRequirements: string[];
    reason: string;
}

export function getDocumentationTier(totalAmount: number): DocumentationTier {
    if (totalAmount < 30) return 1;
    if (totalAmount < 150) return 2;
    return 3;
}

export function validateCraDocumentation(
    input: DocumentationCheckInput,
): DocumentationCheckResult {
    const tier = getDocumentationTier(input.totalAmount);
    const missing: string[] = [];

    // Tier 1 — must still be able to determine the ITC amount.
    if (!input.hasSupplierName) missing.push("supplier name");
    if (!input.hasDate) missing.push("transaction date");

    // Tier 2 and above — GST/HST registration number becomes required.
    if (tier >= 2) {
        if (
            input.gstNumberStatus === "MISSING" ||
            input.gstNumberStatus === "INVALID_FORMAT" ||
            input.gstNumberStatus === "MALFORMED"
        ) {
            missing.push("valid GST/HST registration number");
        }
    }

    // Tier 3 — highest bar: description of goods/services required.
    if (tier === 3) {
        if (!input.hasDescription) missing.push("description of goods/services");
    }

    if (missing.length === 0) {
        return {
            tier,
            status: "sufficient",
            missingRequirements: [],
            reason: `Documentation meets CRA Tier ${tier} requirements for a transaction of this amount.`,
        };
    }

    return {
        tier,
        status: "insufficient",
        missingRequirements: missing,
        reason: `Documentation does not meet CRA Tier ${tier} requirements. Missing: ${missing.join(", ")}.`,
    };
}
