import type { ReceiptRecord } from "@/agent/state/receipt-store";
import { StatusBadge } from "./StatusBadge";

interface ReceiptCardProps {
    receipt: ReceiptRecord;
    isSelected: boolean;
    onSelect: () => void;
}

export function ReceiptCard({ receipt, isSelected, onSelect }: ReceiptCardProps) {
    const c = receipt.classification;

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={isSelected}
            className={`w-full rounded-lg border p-4 text-left transition-colors ${
                isSelected ? "border-black ring-1 ring-black" : "border-gray-200"
            }`}
        >
            <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                    <h2 className="font-medium truncate">{receipt.merchantName}</h2>
                    <p className="text-sm text-gray-500">{receipt.date}</p>
                </div>

                <div className="text-right shrink-0">
                    <p className="font-medium">
                        ${receipt.totalAmount.toFixed(2)} CAD
                    </p>
                    <p className="text-sm text-gray-500">
                        GST/HST: ${receipt.taxAmount.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <StatusBadge stage={receipt.processingStage} />
                {c && (
                    <span className="text-xs text-gray-500">{c.category}</span>
                )}
            </div>

            {c && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded bg-gray-50 p-3 text-xs">
                    <div className="text-gray-500">GIFI</div>
                    <div className="font-mono">
                        {c.gifiCode} — {c.gifiName}
                    </div>

                    <div className="text-gray-500">Eligible ITC</div>
                    <div className="font-mono">
                        ${c.eligibleITC.toFixed(2)} ({c.itcStatus})
                    </div>

                    <div className="text-gray-500">Documentation</div>
                    <div>
                        Tier {c.documentationTier} — {c.documentationStatus}
                    </div>

                    {c.reviewRequired && c.reviewReason && (
                        <>
                            <div className="text-amber-700">Why review</div>
                            <div className="text-amber-700">{c.reviewReason}</div>
                        </>
                    )}

                    <div className="col-span-2 mt-1 text-gray-600 leading-relaxed">
                        {c.explanation}
                    </div>

                    <div className="col-span-2 text-gray-400">
                        CRA rule set: {c.ruleVersion}
                    </div>
                </div>
            )}
        </button>
    );
}
