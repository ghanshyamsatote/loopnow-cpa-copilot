"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ChatPanel } from "@/components/copilot/ChatPanel";
import { ReceiptCard } from "@/components/dashboard/ReceiptCard";
import type { ReceiptRecord } from "@/agent/state/receipt-store";

export default function DashboardPage() {
    const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(true);

    const loadReceipts = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch("/api/receipts", { signal });
            const data = await response.json();
            if (!signal?.aborted) {
                setReceipts(data.receipts);
                setIsLoading(false);
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }
            throw error;
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

    const stats = useMemo(() => {
        const total = receipts.length;
        const complete = receipts.filter(
            (r) => r.processingStage === "complete",
        ).length;
        const review = receipts.filter(
            (r) => r.processingStage === "review",
        ).length;
        const pending = total - complete - review;
        return { total, complete, review, pending };
    }, [receipts]);

    return (
        <main className="min-h-screen">
            <header className="border-b border-border bg-surface">
                <div className="mx-auto max-w-7xl px-6 py-5 sm:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                Bookkeeper Dashboard
                            </h1>
                            <p className="mt-0.5 text-sm text-muted">
                                Review receipts and let the CPA Copilot classify them for CRA filing.
                            </p>
                        </div>

                        <dl className="flex gap-5 text-sm">
                            <div>
                                <dt className="text-xs text-muted">Total</dt>
                                <dd className="font-semibold tabular-nums">{stats.total}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted">Pending</dt>
                                <dd className="font-semibold tabular-nums text-gray-500">
                                    {stats.pending}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted">Needs review</dt>
                                <dd className="font-semibold tabular-nums text-amber-600">
                                    {stats.review}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted">Complete</dt>
                                <dd className="font-semibold tabular-nums text-emerald-600">
                                    {stats.complete}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
                    <div className="min-w-0 space-y-3">
                        {isLoading && (
                            <div className="space-y-3">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="h-28 animate-pulse rounded-xl border border-border bg-surface"
                                    />
                                ))}
                            </div>
                        )}

                        {!isLoading && receipts.length === 0 && (
                            <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
                                No receipts to review yet.
                            </div>
                        )}

                        {receipts.map((receipt) => (
                            <ReceiptCard
                                key={receipt.id}
                                receipt={receipt}
                                isSelected={receipt.id === selectedReceiptId}
                                onSelect={() => setSelectedReceiptId(receipt.id)}
                            />
                        ))}
                    </div>

                    <div className="min-w-0 xl:sticky xl:top-6 xl:h-[calc(100vh-7.5rem)]">
                        <ChatPanel
                            selectedReceiptId={selectedReceiptId}
                            onReceiptProcessed={loadReceipts}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
