"use client";

import { useEffect, useState } from "react";

type Receipt = {
    id: string;
    merchantName: string;
    date: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: "CAD";
    type: string;
    category: string | null;
    gstHstNumber: string | null;
    commercialUsePercentage: number;
    description?: string;
};

export default function DashboardPage() {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(
        null,
    );
    useEffect(() => {
        async function loadReceipts() {
            const response = await fetch("/api/receipts");
            const data = await response.json();

            setReceipts(data.receipts);
        }

        loadReceipts();
    }, []);

    return (
        <main className="p-8">
            <h1 className="text-2xl font-semibold">Bookkeeper Dashboard</h1>

            <div className="mt-6 space-y-4">
                {receipts.map((receipt) => (
                    <button
                        key={receipt.id}
                        type="button"
                        onClick={() => setSelectedReceiptId(receipt.id)}
                        className="w-full rounded-lg border p-4 text-left"
                    >
                        <div className="flex justify-between">
                            <div>
                                <h2 className="font-medium">{receipt.merchantName}</h2>

                                <p className="text-sm text-gray-500">
                                    {receipt.date}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-medium">
                                    ${receipt.totalAmount.toFixed(2)} CAD
                                </p>

                                <p className="text-sm text-gray-500">
                                    GST/HST: ${receipt.taxAmount.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </main>
    );
}