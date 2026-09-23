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
        <div className="flex h-full flex-col border rounded-lg">
            <div className="border-b p-3">
                <h2 className="font-medium text-sm">AI Copilot</h2>
                <p className="text-xs text-gray-500">
                    {selectedReceiptId
                        ? `Selected: ${selectedReceiptId}`
                        : "No receipt selected"}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.length === 0 && (
                    <p className="text-sm text-gray-400">
                        Select a receipt, then ask me to process it — e.g. &quot;Process this one and tell me if we can claim the GST.&quot;
                    </p>
                )}

                {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                        <p className="text-xs font-medium text-gray-500">
                            {message.role === "user" ? "You" : "Agent"}
                        </p>

                        {message.parts.map((part, idx) => {
                            if (part.type === "text") {
                                return (
                                    <p
                                        key={idx}
                                        className="text-sm whitespace-pre-wrap leading-relaxed"
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
                                        className="text-xs font-mono flex items-start gap-2 rounded bg-gray-50 px-2 py-1"
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
                ))}

                {isBusy && (
                    <p className="text-xs text-gray-400 animate-pulse">
                        Working…
                    </p>
                )}

                {error && (
                    <p className="text-xs text-red-600" role="alert">
                        {error.message || "Something went wrong. Please try again."}
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Process this receipt…"
                    disabled={isBusy}
                    className="flex-1 rounded border px-3 py-2 text-sm disabled:opacity-50"
                    aria-label="Message to the AI Copilot"
                />
                <button
                    type="submit"
                    disabled={isBusy || !input.trim()}
                    className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
