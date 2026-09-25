import type { ReceiptRecord } from "@/agent/state/receipt-store";
import { StatusBadge } from "./StatusBadge";

interface ReceiptCardProps {
    receipt: ReceiptRecord;
    isSelected: boolean;
    onSelect: () => void;
}

export function ReceiptCard({
    receipt,
    isSelected,
    onSelect,
}: ReceiptCardProps) {
    const c = receipt.classification;
    const merchant = receipt.merchantName.trim() || "Unknown merchant";

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={isSelected}
            className={`group w-full min-w-0 rounded-2xl border bg-surface p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:p-5 ${isSelected
                    ? "border-accent bg-accent/[0.03] ring-1 ring-accent/20"
                    : "border-border hover:border-accent/40 hover:shadow-md"
                }`}
        >
            <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-semibold text-accent"
                    >
                        {merchant.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <h2 className="truncate font-semibold text-foreground" title={merchant}>
                            {merchant}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted">{receipt.date}</p>
                    </div>
                </div>

                <div className="shrink-0 text-right">
                    <p className="text-base font-semibold tabular-nums text-foreground">
                        ${receipt.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted">CAD</p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge stage={receipt.processingStage} />

                {c && (
                    <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {c.category}
                    </span>
                )}

                <span className="text-xs tabular-nums text-muted sm:ml-auto">
                    GST/HST ${receipt.taxAmount.toFixed(2)}
                </span>
            </div>

            {/* Collapsed: one summary line. Full details only for the selected card. */}
            {c && !isSelected && (
                <p className="mt-3 truncate text-xs text-muted">
                    <span className="font-mono">{c.gifiCode}</span> · {c.gifiName} · ITC{" "}
                    <span className="tabular-nums text-foreground">
                        ${c.eligibleITC.toFixed(2)}
                    </span>
                    {c.reviewRequired && (
                        <span className="text-amber-700"> · needs review</span>
                    )}
                </p>
            )}

            {c && isSelected && (
                <div className="mt-4 border-t border-border pt-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="min-w-0">
                            <p className="text-xs text-muted">GIFI classification</p>
                            <p className="mt-1 break-words font-medium text-foreground">
                                <span className="font-mono">{c.gifiCode}</span> · {c.gifiName}
                            </p>
                        </div>

                        <div className="min-w-0">
                            <p className="text-xs text-muted">Eligible ITC</p>
                            <p className="mt-1 font-medium tabular-nums text-foreground">
                                ${c.eligibleITC.toFixed(2)}
                                <span className="ml-1 font-normal text-muted">
                                    ({c.itcStatus})
                                </span>
                            </p>
                        </div>

                        <div className="min-w-0 sm:col-span-2">
                            <p className="text-xs text-muted">Documentation</p>
                            <p className="mt-1 break-words text-foreground">
                                Tier {c.documentationTier} · {c.documentationStatus}
                            </p>
                        </div>
                    </div>

                    {c.reviewRequired && c.reviewReason && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs font-semibold text-amber-800">
                                Needs review
                            </p>
                            <p className="mt-1 break-words text-sm text-amber-900">
                                {c.reviewReason}
                            </p>
                        </div>
                    )}

                    <p className="mt-4 break-words text-sm leading-relaxed text-muted">
                        {c.explanation}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                        CRA rule set: {c.ruleVersion}
                    </p>
                </div>
            )}
        </button>
    );
}