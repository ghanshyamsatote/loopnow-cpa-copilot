"use client";

import { useEffect, useState, useCallback } from "react";
import { ChatPanel } from "@/components/copilot/ChatPanel";
import { ReceiptCard } from "@/components/dashboard/ReceiptCard";
import type { ReceiptRecord } from "@/agent/state/receipt-store";

export default function DashboardPage() {
    const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(
        null,
    );
    const loadReceipts = useCallback(async (signal?: AbortSignal) => {
        const response = await fetch("/api/receipts", { signal });
        const data = await response.json();
        if (!signal?.aborted) {
            setReceipts(data.receipts);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        // Standard mount-time data fetch, aborted on unmount. The
        // react-hooks/set-state-in-effect rule flags this pattern generally
        // (it prefers external data-fetching libraries), but a plain fetch
        // is appropriate for this small dashboard and the abort signal
        // already prevents the set-state-after-unmount issue the rule warns about.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadReceipts(controller.signal);
        return () => controller.abort();
    }, [loadReceipts]);

    return (
        <main className="p-8">
            <h1 className="text-2xl font-semibold">Bookkeeper Dashboard</h1>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
                <div className="space-y-4">
                    {receipts.map((receipt) => (
                        <ReceiptCard
                            key={receipt.id}
                            receipt={receipt}
                            isSelected={receipt.id === selectedReceiptId}
                            onSelect={() => setSelectedReceiptId(receipt.id)}
                        />
                    ))}
                </div>

                <div className="h-150">
                    <ChatPanel
                        selectedReceiptId={selectedReceiptId}
                        onReceiptProcessed={loadReceipts}
                    />
                </div>
            </div>
        </main>
    );
}