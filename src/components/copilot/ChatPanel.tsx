"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

interface ChatPanelProps {
    selectedReceiptId: string | null;
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

function toolStateIcon(state: string): string {
    if (state === "output-available") return "✓"; // ✓
    if (state === "output-error") return "✗"; // ✗
    return "●"; // ● (in progress)
}

export function ChatPanel({ selectedReceiptId, onReceiptProcessed }: ChatPanelProps) {
    const [input, setInput] = useState("");

    const { messages, sendMessage, status, error } = useChat({
        transport: new DefaultChatTransport({ api: "/api/chat" }),
        onFinish: () => {
            onReceiptProcessed?.();
        },
    });

    const isBusy = status === "submitted" || status === "streaming";

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text || isBusy) return;

        sendMessage(
            { text },
            { body: { selectedReceiptId } },
        );
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
                <div className="min-w-0">
                    <h2 className="text-sm font-medium leading-tight">CPA Copilot</h2>
                    <p className="truncate text-xs text-muted">
                        {selectedReceiptId
                            ? `Selected: ${selectedReceiptId}`
                            : "No receipt selected"}
                    </p>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
                        Select a receipt, then ask me to process it — e.g. &quot;Process this one and tell me if we can claim the GST.&quot;
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

                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-2 rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700"
                                            >
                                                <span aria-hidden="true">
                                                    {toolStateIcon(toolPart.state)}
                                                </span>
                                                <span>{label}</span>
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
