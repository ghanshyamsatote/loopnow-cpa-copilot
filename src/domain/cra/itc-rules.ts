// Deterministic Input Tax Credit (ITC) calculation engine.
//
// This is the single most important file in the whole system: the LLM is NEVER
// allowed to perform this arithmetic itself. It may call this function as a tool,
// but the number that comes back is always computed here, in plain TypeScript,
// using Decimal.js to avoid floating-point rounding errors on money.

import Decimal from "decimal.js";
import { DocumentationStatus } from "./documentation-rules";
import { getMealItcPercentage, MealItcException } from "./meals-rules";

export type ItcEligibilityStatus = "eligible" | "partial" | "ineligible" | "review";

export interface CalculateEligibleItcInput {
    subtotal: number;
    taxAmount: number;
    taxType: "GST" | "HST";
    expenseCategory: string;
    commercialUsePercentage: number; // 0-100
    mealEntertainment: boolean;
    mealException?: MealItcException;
    documentationStatus: DocumentationStatus;
}

export interface CalculateEligibleItcResult {
    grossTax: number;
    eligibilityPercentage: number; // 0-1
    eligibleITC: number;
    reasonCode: string;
    status: ItcEligibilityStatus;
}

export function calculateEligibleITC(
    input: CalculateEligibleItcInput,
): CalculateEligibleItcResult {
    const grossTax = new Decimal(input.taxAmount);

    // Documentation gates everything: insufficient documentation means the ITC
    // cannot be claimed at all, regardless of how "eligible" the expense looks.
    if (input.documentationStatus === "insufficient") {
        return {
            grossTax: grossTax.toDecimalPlaces(2).toNumber(),
            eligibilityPercentage: 0,
            eligibleITC: 0,
            reasonCode: "DOCUMENTATION_INSUFFICIENT",
            status: "review",
        };
    }

    if (input.documentationStatus === "review") {
        return {
            grossTax: grossTax.toDecimalPlaces(2).toNumber(),
            eligibilityPercentage: 0,
            eligibleITC: 0,
            reasonCode: "DOCUMENTATION_UNDER_REVIEW",
            status: "review",
        };
    }

    if (input.commercialUsePercentage <= 0) {
        return {
            grossTax: grossTax.toDecimalPlaces(2).toNumber(),
            eligibilityPercentage: 0,
            eligibleITC: 0,
            reasonCode: "NO_COMMERCIAL_USE",
            status: "ineligible",
        };
    }

    const commercialUseFraction = new Decimal(input.commercialUsePercentage).div(100);

    // Meals/entertainment: apply the statutory limitation (50% standard, or the
    // applicable exception percentage) on top of the commercial-use fraction.
    const mealFraction = input.mealEntertainment
        ? new Decimal(getMealItcPercentage(input.mealException))
        : new Decimal(1);

    const eligibilityFraction = commercialUseFraction.mul(mealFraction);

    const eligibleITC = grossTax.mul(eligibilityFraction);

    const eligibilityPercentage = eligibilityFraction
        .toDecimalPlaces(4)
        .toNumber();

    let status: ItcEligibilityStatus;
    let reasonCode: string;

    if (eligibilityFraction.equals(1)) {
        status = "eligible";
        reasonCode = "STANDARD_ITC";
    } else if (eligibilityFraction.equals(0)) {
        status = "ineligible";
        reasonCode = "NO_ELIGIBLE_PORTION";
    } else {
        status = "partial";
        reasonCode = input.mealEntertainment
            ? "MEALS_ENTERTAINMENT_LIMITATION"
            : "PARTIAL_COMMERCIAL_USE";
    }

    return {
        grossTax: grossTax.toDecimalPlaces(2).toNumber(),
        eligibilityPercentage,
        eligibleITC: eligibleITC.toDecimalPlaces(2).toNumber(),
        reasonCode,
        status,
    };
}
