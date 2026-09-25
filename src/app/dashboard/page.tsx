"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ChatPanel } from "@/components/copilot/ChatPanel";
import { ReceiptCard } from "@/components/dashboard/ReceiptCard";
import type { ReceiptRecord } from "@/agent/state/receipt-store";

type Filter = "all" | "pending" | "review" | "complete";

function matchesFilter(receipt: ReceiptRecord, filter: Filter): boolean {
    const stage = receipt.processingStage;
    if (filter === "all") return true;
    if (filter === "review") return stage === "review";
    if (filter === "complete") return stage === "complete";
    // "pending" = anything not yet finished (idle, in progress, or errored).
    return stage !== "review" && stage !== "complete";
}

export default function DashboardPage() {
    const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>("all");

    const loadReceipts = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch("/api/receipts", { signal });
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            const data = await response.json();
            if (!signal?.aborted) {
                setReceipts(data.receipts);
                setLoadError(null);
                setIsLoading(false);
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }
            if (!signal?.aborted) {
                setLoadError(
                    error instanceof Error ? error.message : "Unknown error",
                );
                setIsLoading(false);
            }
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

    function retryLoad() {
        setIsLoading(true);
        setLoadError(null);
        void loadReceipts();
    }

    const counts = useMemo(
        () => ({
            all: receipts.length,
            pending: receipts.filter((r) => matchesFilter(r, "pending")).length,
            review: receipts.filter((r) => matchesFilter(r, "review")).length,
            complete: receipts.filter((r) => matchesFilter(r, "complete")).length,
        }),
        [receipts],
    );

    const visibleReceipts = useMemo(
        () => receipts.filter((r) => matchesFilter(r, filter)),
        [receipts, filter],
    );

    const selectedReceipt =
        receipts.find((r) => r.id === selectedReceiptId) ?? null;

    const tabs: { id: Filter; label: string; countClass: string }[] = [
        { id: "all", label: "All", countClass: "text-foreground" },
        { id: "pending", label: "Pending", countClass: "text-gray-500" },
        { id: "review", label: "Needs review", countClass: "text-amber-600" },
        { id: "complete", label: "Complete", countClass: "text-emerald-600" },
    ];

    return (
        <main className="min-h-screen">
            <header className="border-b border-border bg-surface">
                <div className="mx-auto max-w-7xl px-6 py-5 sm:px-8">
                    <h1 className="text-xl font-semibold tracking-tight">
                        Bookkeeper Dashboard
                    </h1>
                    <p className="mt-0.5 text-sm text-muted">
                        Review receipts and let the CPA Copilot classify them for CRA filing.
                    </p>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8">
                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
                    <div className="min-w-0 space-y-3">
                        <div
                            role="tablist"
                            aria-label="Filter receipts by status"
                            className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1"
                        >
                            {tabs.map((tab) => {
                                const active = filter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setFilter(tab.id)}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                            active
                                                ? "bg-accent/10 text-accent"
                                                : "text-muted hover:bg-background hover:text-foreground"
                                        }`}
                                    >
                                        {tab.label}
                                        <span
                                            className={`tabular-nums ${active ? "text-accent" : tab.countClass}`}
                                        >
                                            {counts[tab.id]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

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

                        {!isLoading && loadError && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700"
                            >
                                <p className="font-medium">Couldn&apos;t load receipts.</p>
                                <p className="mt-1 text-xs text-red-600">{loadError}</p>
                                <button
                                    type="button"
                                    onClick={retryLoad}
                                    className="mt-3 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {!isLoading && !loadError && visibleReceipts.length === 0 && (
                            <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
                                {receipts.length === 0
                                    ? "No receipts to review yet."
                                    : "No receipts match this filter."}
                            </div>
                        )}

                        {visibleReceipts.map((receipt) => (
                            <ReceiptCard
                                key={receipt.id}
                                receipt={receipt}
                                isSelected={receipt.id === selectedReceiptId}
                                onSelect={() => setSelectedReceiptId(receipt.id)}
                            />
                        ))}
                    </div>

                    <div className="min-w-0 xl:sticky xl:top-6 xl:h-[calc(100vh-7.5rem)]">
                        {/* Keyed by receipt so switching receipts starts a fresh conversation. */}
                        <ChatPanel
                            key={selectedReceiptId ?? "none"}
                            selectedReceipt={selectedReceipt}
                            onReceiptProcessed={loadReceipts}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
