import type { ProcessingStage } from "@/agent/state/receipt-store";

// Every badge pairs a color with a distinct label/icon, never color alone,
// so status is still readable without relying on color perception (spec §30).
const STATUS_CONFIG: Record<
    ProcessingStage,
    { label: string; icon: string; className: string }
> = {
    idle: {
        label: "Pending",
        icon: "○", // ○
        className: "bg-gray-100 text-gray-600",
    },
    reading: {
        label: "Reading…",
        icon: "●", // ●
        className: "bg-indigo-100 text-indigo-700 animate-pulse",
    },
    validating: {
        label: "Validating…",
        icon: "●",
        className: "bg-indigo-100 text-indigo-700 animate-pulse",
    },
    categorizing: {
        label: "Categorizing…",
        icon: "●",
        className: "bg-indigo-100 text-indigo-700 animate-pulse",
    },
    calculating: {
        label: "Calculating…",
        icon: "●",
        className: "bg-indigo-100 text-indigo-700 animate-pulse",
    },
    mapping: {
        label: "Mapping GIFI…",
        icon: "●",
        className: "bg-indigo-100 text-indigo-700 animate-pulse",
    },
    review: {
        label: "Review Required",
        icon: "⚠", // ⚠
        className: "bg-amber-100 text-amber-800",
    },
    complete: {
        label: "Complete",
        icon: "✓", // ✓
        className: "bg-green-100 text-green-800",
    },
    error: {
        label: "Error",
        icon: "✗", // ✗
        className: "bg-red-100 text-red-800",
    },
};

export function StatusBadge({ stage }: { stage: ProcessingStage }) {
    const config = STATUS_CONFIG[stage];

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
        >
            <span aria-hidden="true">{config.icon}</span>
            {config.label}
        </span>
    );
}
