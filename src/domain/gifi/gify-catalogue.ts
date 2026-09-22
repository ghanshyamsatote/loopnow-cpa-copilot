// Controlled GIFI (General Index of Financial Information) code catalogue.
// The LLM may PROPOSE a code, but this file is the only source of truth for
// whether a code actually exists — the backend must verify against this list
// before accepting any classification. Unknown/unlisted codes must be rejected
// and routed to REVIEW_REQUIRED, never silently accepted.

export interface GifiCode {
    code: string;
    name: string;
    description: string;
    category: string;
    parentCategory: string;
    applicableExpenseTypes: string[];
}

export const GIFI_CATALOGUE: GifiCode[] = [
    {
        code: "1001",
        name: "Cash",
        description: "Cash and cash equivalents, including bank deposits.",
        category: "Assets",
        parentCategory: "Current Assets",
        applicableExpenseTypes: ["CASH_DEPOSIT"],
    },
    {
        code: "8523",
        name: "Meals and entertainment",
        description: "Business meals and entertainment expenses (subject to 50% ITC limitation).",
        category: "Expenses",
        parentCategory: "Operating Expenses",
        applicableExpenseTypes: ["MEAL"],
    },
    {
        code: "8810",
        name: "Office expenses",
        description: "Office supplies and consumables used in the ordinary course of business.",
        category: "Expenses",
        parentCategory: "Operating Expenses",
        applicableExpenseTypes: ["OFFICE"],
    },
    {
        code: "8960",
        name: "Repairs and maintenance",
        description: "Repairs and maintenance of business property and equipment.",
        category: "Expenses",
        parentCategory: "Operating Expenses",
        applicableExpenseTypes: ["OTHER"],
    },
    {
        code: "9270",
        name: "Other expenses",
        description: "Business expenses that do not fit a more specific GIFI category.",
        category: "Expenses",
        parentCategory: "Operating Expenses",
        applicableExpenseTypes: ["OTHER", "UNKNOWN"],
    },
];

export function findGifiCode(code: string): GifiCode | undefined {
    return GIFI_CATALOGUE.find((entry) => entry.code === code);
}

export function isKnownGifiCode(code: string): boolean {
    return findGifiCode(code) !== undefined;
}

export function suggestGifiCodesForExpenseType(
    expenseType: string,
): GifiCode[] {
    return GIFI_CATALOGUE.filter((entry) =>
        entry.applicableExpenseTypes.includes(expenseType),
    );
}
