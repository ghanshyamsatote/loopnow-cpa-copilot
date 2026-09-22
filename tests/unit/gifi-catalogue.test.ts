import { describe, it, expect } from "vitest";
import { findGifiCode, isKnownGifiCode } from "@/domain/gifi/gify-catalogue";

describe("GIFI catalogue", () => {
    it("finds a known code", () => {
        const entry = findGifiCode("8810");
        expect(entry).toBeDefined();
        expect(entry?.name).toBe("Office expenses");
    });

    it("rejects an unknown/invented code (e.g. LLM hallucination)", () => {
        expect(isKnownGifiCode("999999")).toBe(false);
        expect(findGifiCode("999999")).toBeUndefined();
    });

    it("meals maps to 8523", () => {
        expect(isKnownGifiCode("8523")).toBe(true);
    });
});
