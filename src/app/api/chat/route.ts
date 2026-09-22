import { NextRequest } from "next/server";
import { convertToModelMessages, type UIMessage } from "ai";
import { runAgent } from "@/agent/agent";

export const maxDuration = 60;

interface ChatRequestBody {
    messages: UIMessage[];
    selectedReceiptId?: string | null;
}

export async function POST(req: NextRequest) {
    let body: ChatRequestBody;

    try {
        body = await req.json();
    } catch {
        return new Response(
            JSON.stringify({ error: "Invalid request body." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }

    if (!Array.isArray(body.messages)) {
        return new Response(
            JSON.stringify({ error: "'messages' must be an array." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }

    const selectedReceiptId = body.selectedReceiptId ?? null;

    try {
        const modelMessages = await convertToModelMessages(body.messages);
        const result = runAgent(modelMessages, selectedReceiptId);

        return result.toUIMessageStreamResponse({
            onError: (error) => {
                // Never leak internal error details (stack traces, provider
                // error bodies) to the client — safe, generic message only.
                console.error("[agent error]", error);
                return "The assistant hit an internal error while processing this receipt. Please try again.";
            },
        });
    } catch (error) {
        console.error("[chat route error]", error);
        return new Response(
            JSON.stringify({
                error: "The assistant is temporarily unavailable. Please try again shortly.",
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
        );
    }
}
