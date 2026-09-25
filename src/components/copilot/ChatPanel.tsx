"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { ReceiptRecord } from "@/agent/state/receipt-store";

interface ChatPanelProps {
    selectedReceipt: ReceiptRecord | null;
    onReceiptProcessed?: () => void;
}

const TOOL_LABELS: Record<string, string> = {
    get_current_receipt: "Reading selected receipt",
    validate_gst_hst_number_format: "Validating GST/HST number format",
    validate_cra_documentation: "Validating CRA documentation",
    classify_expense: "Classifying expense",
    calculate_eligible_itc: "Calculating eligible ITC",
    assign_gifi_code: "Mapping GIFI code",
    update_expense_classification: "Saving classification",
    request_human_review: "Flagging for human review",
    get_processing_status: "Checking processing status",
};

const QUICK_ACTIONS = [
    "Process this receipt",
    "Can I claim the GST/HST on this?",
    "Why does this need review?",
];

const GST_STATUS_LABELS: Record<string, string> = {
    VALID_FORMAT: "Format valid",
    MISSING: "No GST/HST number",
    MALFORMED: "Malformed number",
    INVALID_FORMAT: "Invalid format",
};

function toolStateIcon(state: string): string {
    if (state === "output-available") return "✓"; // ✓
    if (state === "output-error") return "✗"; // ✗
    return "●"; // ● (in progress)
}

/**
 * A short, human-readable result for a finished tool call, so the user can see
 * what each step actually found rather than just that it ran. Returns null
 * when there is nothing useful to add beyond the label.
 */
function summarizeToolOutput(toolName: string, output: unknown): string | null {
    if (!output || typeof output !== "object") return null;
    const o = output as Record<string, unknown>;

    if (o.status === "NO_RECEIPT_SELECTED") return "No receipt selected";
    if (o.status === "NOT_FOUND") return "Receipt not found";

    switch (toolName) {
        case "validate_gst_hst_number_format":
            return GST_STATUS_LABELS[String(o.status)] ?? String(o.status);
        case "validate_cra_documentation":
            return `Tier ${o.tier} · ${o.status}`;
        case "classify_expense":
            return o.category ? String(o.category) : "Unclear — needs review";
        case "calculate_eligible_itc":
            return typeof o.eligibleITC === "number"
                ? `$${o.eligibleITC.toFixed(2)} (${o.status})`
                : null;
        case "assign_gifi_code":
            return o.status === "VALID"
                ? `${o.gifiCode} · ${o.gifiName}`
                : "Code not recognized";
        case "update_expense_classification":
            return o.status === "SAVED" ? "Saved" : "Save failed";
        default:
            return null;
    }
}

export function ChatPanel({ selectedReceipt, onReceiptProcessed }: ChatPanelProps) {
    const [input, setInput] = useState("");

    const { messages, sendMessage, setMessages, stop, status, error, clearError } =
        useChat({
            transport: new DefaultChatTransport({ api: "/api/chat" }),
            onFinish: () => {
                onReceiptProcessed?.();
            },
        });

    const isBusy = status === "submitted" || status === "streaming";
    const selectedReceiptId = selectedReceipt?.id ?? null;
    const receiptLabel = selectedReceipt
        ? `${selectedReceipt.merchantName.trim() || "Unknown merchant"} · $${selectedReceipt.totalAmount.toFixed(2)}`
        : null;

    function send(text: string) {
        const trimmed = text.trim();
        if (!trimmed || isBusy) return;
        sendMessage({ text: trimmed }, { body: { selectedReceiptId } });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        send(input);
        setInput("");
    }

    function handleNewChat() {
        stop();
        setMessages([]);
        clearError();
        setInput("");
    }

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
                >
                    AI
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-medium leading-tight">CPA Copilot</h2>
                    <p className="truncate text-xs text-muted" title={receiptLabel ?? undefined}>
                        {receiptLabel ?? "No receipt selected"}
                    </p>
                </div>
                {messages.length > 0 && (
                    <button
                        type="button"
                        onClick={handleNewChat}
                        className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                        New chat
                    </button>
                )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <div className="space-y-3">
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
                            {selectedReceipt
                                ? "Ask me anything about this receipt, or pick a quick action below."
                                : "Select a receipt on the left to get started."}
                        </div>

                        {selectedReceipt && (
                            <div className="flex flex-wrap gap-2">
                                {QUICK_ACTIONS.map((action) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => send(action)}
                                        disabled={isBusy}
                                        className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {messages.map((message) => {
                    const isUser = message.role === "user";
                    return (
                        <div
                            key={message.id}
                            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm ${
                                    isUser
                                        ? "bg-accent text-accent-foreground"
                                        : "border border-border bg-background"
                                }`}
                            >
                                {message.parts.map((part, idx) => {
                                    if (part.type === "text") {
                                        return (
                                            <p
                                                key={idx}
                                                className="whitespace-pre-wrap leading-relaxed"
                                            >
                                                {part.text}
                                            </p>
                                        );
                                    }

                                    if (part.type.startsWith("tool-")) {
                                        const toolName = part.type.slice("tool-".length);
                                        const toolPart = part as unknown as {
                                            state: string;
                                            output?: unknown;
                                        };
                                        const label = TOOL_LABELS[toolName] ?? toolName;
                                        const summary =
                                            toolPart.state === "output-available"
                                                ? summarizeToolOutput(toolName, toolPart.output)
                                                : null;

                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-2 rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700"
                                            >
                                                <span aria-hidden="true">
                                                    {toolStateIcon(toolPart.state)}
                                                </span>
                                                <span className="min-w-0">
                                                    {label}
                                                    {summary && (
                                                        <span className="font-semibold text-gray-900">
                                                            : {summary}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return null;
                                })}
                            </div>
                        </div>
                    );
                })}

                {isBusy && (
                    <div className="flex items-center gap-1.5 px-1 text-xs text-muted">
                        <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted" />
                        <span className="ml-1">Working…</span>
                    </div>
                )}

                {error && (
                    <p
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
                        role="alert"
                    >
                        {error.message || "Something went wrong. Please try again."}
                    </p>
                )}
            </div>

            <form
                onSubmit={handleSubmit}
                className="flex gap-2 border-t border-border p-3"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Process this receipt…"
                    disabled={isBusy}
                    className="flex-1 rounded-full border border-border px-4 py-2 text-sm outline-none transition-colors focus:border-accent disabled:opacity-50"
                    aria-label="Message to the AI Copilot"
                />
                <button
                    type="submit"
                    disabled={isBusy || !input.trim()}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
