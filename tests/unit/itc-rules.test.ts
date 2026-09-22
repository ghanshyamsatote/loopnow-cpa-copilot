import { describe, it, expect } from "vitest";
import { calculateEligibleITC } from "@/domain/cra/itc-rules";

describe("calculateEligibleITC", () => {
    it("full eligibility: 100% commercial use, non-meal, sufficient docs", () => {
        const result = calculateEligibleITC({
            subtotal: 82.0,
            taxAmount: 4.1,
            taxType: "GST",
            expenseCategory: "OFFICE",
            commercialUsePercentage: 100,
            mealEntertainment: false,
            documentationStatus: "sufficient",
        });

        expect(result.status).toBe("eligible");
        expect(result.eligibleITC).toBe(4.1);
        expect(result.eligibilityPercentage).toBe(1);
        expect(result.reasonCode).toBe("STANDARD_ITC");
    });

    it("meals & entertainment: applies standard 50% limitation", () => {
        const result = calculateEligibleITC({
            subtotal: 240.0,
            taxAmount: 12.0,
            taxType: "GST",
            expenseCategory: "MEAL",
            commercialUsePercentage: 100,
            mealEntertainment: true,
            documentationStatus: "sufficient",
        });

        expect(result.status).toBe("partial");
        expect(result.eligibleITC).toBe(6.0);
        expect(result.eligibilityPercentage).toBe(0.5);
        expect(result.reasonCode).toBe("MEALS_ENTERTAINMENT_LIMITATION");
    });

    it("meals exception: long-haul truck driver gets 80%", () => {
        const result = calculateEligibleITC({
            subtotal: 100.0,
            taxAmount: 5.0,
            taxType: "GST",
            expenseCategory: "MEAL",
            commercialUsePercentage: 100,
            mealEntertainment: true,
            mealException: "LONG_HAUL_TRUCK_DRIVER",
            documentationStatus: "sufficient",
        });

        expect(result.eligibleITC).toBe(4.0);
        expect(result.eligibilityPercentage).toBe(0.8);
    });

    it("insufficient documentation blocks the ITC entirely and routes to review", () => {
        const result = calculateEligibleITC({
            subtotal: 1200.0,
            taxAmount: 60.0,
            taxType: "GST",
            expenseCategory: "UNKNOWN",
            commercialUsePercentage: 100,
            mealEntertainment: false,
            documentationStatus: "insufficient",
        });

        expect(result.status).toBe("review");
        expect(result.eligibleITC).toBe(0);
        expect(result.reasonCode).toBe("DOCUMENTATION_INSUFFICIENT");
    });

    it("cash deposit / 0% commercial use is ineligible, not silently allowed", () => {
        const result = calculateEligibleITC({
            subtotal: 5000.0,
            taxAmount: 0,
            taxType: "GST",
            expenseCategory: "CASH_DEPOSIT",
            commercialUsePercentage: 0,
            mealEntertainment: false,
            documentationStatus: "sufficient",
        });

        expect(result.status).toBe("ineligible");
        expect(result.eligibleITC).toBe(0);
        expect(result.reasonCode).toBe("NO_COMMERCIAL_USE");
    });

    it("commercial use 50% applies proportionally", () => {
        const result = calculateEligibleITC({
            subtotal: 200.0,
            taxAmount: 10.0,
            taxType: "GST",
            expenseCategory: "OFFICE",
            commercialUsePercentage: 50,
            mealEntertainment: false,
            documentationStatus: "sufficient",
        });

        expect(result.eligibleITC).toBe(5.0);
        expect(result.status).toBe("partial");
    });

    it("invariant: eligibleITC never exceeds grossTax", () => {
        const result = calculateEligibleITC({
            subtotal: 100,
            taxAmount: 5,
            taxType: "GST",
            expenseCategory: "MEAL",
            commercialUsePercentage: 100,
            mealEntertainment: true,
            mealException: "CHARITY_OR_PUBLIC_INSTITUTION",
            documentationStatus: "sufficient",
        });

        expect(result.eligibleITC).toBeLessThanOrEqual(result.grossTax);
        expect(result.eligibleITC).toBeGreaterThanOrEqual(0);
    });
});
