import { Receipt } from "@/domain/expences/receipt";


export const receipts: Receipt[] = [
    {
        id: "receipt-001",
        merchantName: "Staples Canada",
        date: "2026-09-18",
        subtotal: 82.0,
        taxAmount: 4.1,
        totalAmount: 86.1,
        currency: "CAD",
        type: "UNKNOWN",
        category: null,
        gstHstNumber: "123456789RT0001",
        commercialUsePercentage: 100,
    },

    {
        id: "receipt-002",
        merchantName: "Restaurant ABC",
        date: "2026-09-18",
        subtotal: 240.0,
        taxAmount: 12.0,
        totalAmount: 252.0,
        currency: "CAD",
        type: "MEAL",
        category: null,
        gstHstNumber: "123456789RT0001",
        commercialUsePercentage: 100,
    },

    {
        id: "receipt-003",
        merchantName: "Unknown Vendor",
        date: "2026-09-17",
        subtotal: 1200.0,
        taxAmount: 60.0,
        totalAmount: 1260.0,
        currency: "CAD",
        type: "UNKNOWN",
        category: null,
        gstHstNumber: null,
        commercialUsePercentage: 100,
    },

    {
        id: "receipt-004",
        merchantName: "Bank",
        date: "2026-09-16",
        subtotal: 5000.0,
        taxAmount: 0,
        totalAmount: 5000.0,
        currency: "CAD",
        type: "CASH_DEPOSIT",
        category: null,
        gstHstNumber: null,
        commercialUsePercentage: 100,
        description: "Bank deposit",
    },
];