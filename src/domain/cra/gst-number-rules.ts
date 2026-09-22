// CRA GST/HST registration number format validation.
//
// Format (per CRA): 9 digits + "RT" + 4-digit program account number
// e.g. 123456789RT0001
//
// IMPORTANT: this only checks the STRING FORMAT. It cannot and does not confirm
// the number is genuinely registered with CRA — that would require calling
// CRA's external GST/HST registry lookup service, which is out of scope here.
// Format validity and registration validity are deliberately kept separate.

export type GstNumberStatus =
    | "VALID_FORMAT"
    | "MISSING"
    | "MALFORMED"
    | "INVALID_FORMAT";

const GST_NUMBER_PATTERN = /^\d{9}RT\d{4}$/;

export interface GstNumberValidationResult {
    status: GstNumberStatus;
    formatValid: boolean;
    /** Always false here: format validity is not proof of real CRA registration. */
    registrationVerified: false;
    reason: string;
}

export function validateGstHstNumberFormat(
    value: string | null | undefined,
): GstNumberValidationResult {
    if (value === null || value === undefined || value.trim() === "") {
        return {
            status: "MISSING",
            formatValid: false,
            registrationVerified: false,
            reason: "No GST/HST registration number was provided on the receipt.",
        };
    }

    const trimmed = value.trim();

    if (GST_NUMBER_PATTERN.test(trimmed)) {
        return {
            status: "VALID_FORMAT",
            formatValid: true,
            registrationVerified: false,
            reason:
                "The number matches the CRA format (9 digits + RT + 4 digits). This confirms format only, not genuine CRA registration.",
        };
    }

    // Malformed: right general shape (digits/RT present) but wrong length/pattern,
    // vs. invalid: doesn't resemble a GST number at all (e.g. random text).
    const looksLikeAttempt = /\d/.test(trimmed) && /RT/i.test(trimmed);

    if (looksLikeAttempt) {
        return {
            status: "MALFORMED",
            formatValid: false,
            registrationVerified: false,
            reason:
                "The value resembles a GST/HST number but does not match the required 9-digit + RT + 4-digit pattern.",
        };
    }

    return {
        status: "INVALID_FORMAT",
        formatValid: false,
        registrationVerified: false,
        reason: "The value does not resemble a valid GST/HST registration number.",
    };
}
