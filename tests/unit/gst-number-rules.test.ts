import { describe, it, expect } from "vitest";
import { validateGstHstNumberFormat } from "@/domain/cra/gst-number-rules";

describe("validateGstHstNumberFormat", () => {
    it("valid-format number", () => {
        const result = validateGstHstNumberFormat("123456789RT0001");
        expect(result.status).toBe("VALID_FORMAT");
        expect(result.formatValid).toBe(true);
        expect(result.registrationVerified).toBe(false);
    });

    it("missing number (null)", () => {
        const result = validateGstHstNumberFormat(null);
        expect(result.status).toBe("MISSING");
    });

    it("missing number (empty string)", () => {
        const result = validateGstHstNumberFormat("   ");
        expect(result.status).toBe("MISSING");
    });

    it("malformed number (right shape, wrong digit count)", () => {
        const result = validateGstHstNumberFormat("123RT0001");
        expect(result.status).toBe("MALFORMED");
    });

    it("invalid format (random text)", () => {
        const result = validateGstHstNumberFormat("not-a-gst-number");
        expect(result.status).toBe("INVALID_FORMAT");
    });

    it("never claims registration is verified, regardless of format validity", () => {
        const result = validateGstHstNumberFormat("123456789RT0001");
        expect(result.registrationVerified).toBe(false);
    });
});
