export type ReceiptType =
    | "OFFICE"
    | "MEAL"
    | "OTHER"
    | "CASH_DEPOSIT";

export interface Receipt {
    id: string;
    merchantName: string;
    date: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: "CAD";
    type: ReceiptType | "UNKNOWN";
    category: string | null;
    gstHstNumber: string | null;
    commercialUsePercentage: number;
    description?: string;
}