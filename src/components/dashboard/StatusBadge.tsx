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
        className: "bg-gray-100 text-gray-700",
    },
    reading: {
        label: "Reading…",
        icon: "●", // ●
        className: "bg-blue-100 text-blue-700",
    },
    validating: {
        label: "Validating…",
        icon: "●",
        className: "bg-blue-100 text-blue-700",
    },
    categorizing: {
        label: "Categorizing…",
        icon: "●",
        className: "bg-blue-100 text-blue-700",
    },
    calculating: {
        label: "Calculating…",
        icon: "●",
        className: "bg-blue-100 text-blue-700",
    },
    mapping: {
        label: "Mapping GIFI…",
        icon: "●",
        className: "bg-blue-100 text-blue-700",
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
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
        >
            <span aria-hidden="true">{config.icon}</span>
            {config.label}
        </span>
    );
}
