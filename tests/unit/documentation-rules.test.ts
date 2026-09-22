import { describe, it, expect } from "vitest";
import {
    getDocumentationTier,
    validateCraDocumentation,
} from "@/domain/cra/documentation-rules";

describe("getDocumentationTier — boundary amounts", () => {
    it("$29.99 is Tier 1", () => {
        expect(getDocumentationTier(29.99)).toBe(1);
    });
    it("$30.00 is Tier 2", () => {
        expect(getDocumentationTier(30.0)).toBe(2);
    });
    it("$30.01 is Tier 2", () => {
        expect(getDocumentationTier(30.01)).toBe(2);
    });
    it("$149.99 is Tier 2", () => {
        expect(getDocumentationTier(149.99)).toBe(2);
    });
    it("$150.00 is Tier 3", () => {
        expect(getDocumentationTier(150.0)).toBe(3);
    });
    it("$150.01 is Tier 3", () => {
        expect(getDocumentationTier(150.01)).toBe(3);
    });
});

describe("validateCraDocumentation", () => {
    it("Tier 2 with valid GST number and basic fields is sufficient", () => {
        const result = validateCraDocumentation({
            totalAmount: 86.1,
            gstNumberStatus: "VALID_FORMAT",
            hasSupplierName: true,
            hasDate: true,
            hasDescription: true,
        });

        expect(result.tier).toBe(2);
        expect(result.status).toBe("sufficient");
        expect(result.missingRequirements).toHaveLength(0);
    });

    it("Tier 3 (>= $150) with missing GST number is insufficient", () => {
        const result = validateCraDocumentation({
            totalAmount: 1260.0,
            gstNumberStatus: "MISSING",
            hasSupplierName: false,
            hasDate: true,
            hasDescription: false,
        });

        expect(result.tier).toBe(3);
        expect(result.status).toBe("insufficient");
        expect(result.missingRequirements).toContain(
            "valid GST/HST registration number",
        );
    });

    it("Tier 1 (< $30) does not require a GST number", () => {
        const result = validateCraDocumentation({
            totalAmount: 15.0,
            gstNumberStatus: "MISSING",
            hasSupplierName: true,
            hasDate: true,
            hasDescription: false,
        });

        expect(result.tier).toBe(1);
        expect(result.status).toBe("sufficient");
    });
});
