# Code Walkthrough — Loopnow CPA Copilot

This document is a **reading guide**, not a spec. Its purpose is to let you
(or anyone new to this codebase) understand what has been built and in what
order to read the files so nothing feels like it appears out of nowhere.

For the formal architecture rationale (why these technology/design choices
were made), see `docs/architecture.md`. This file is purely "what exists and
how to read it."

---

## 1. What this project actually is (one paragraph)

A small Next.js app where a user picks a receipt from a dashboard, asks an AI
(Gemini) to "process this receipt," and the AI calls a fixed set of
tools — each backed by plain, tested, deterministic TypeScript functions — to
validate documentation, calculate the eligible GST/HST tax credit, classify
the expense, and assign an accounting code. The AI never performs the tax
math itself; it only decides which tool to call and when.

---

## 2. Current build status

| Layer | Status |
|---|---|
| Data model + seed receipts | ✅ Done |
| Deterministic rules engine (tax math, docs, GST validation, GIFI catalogue) | ✅ Done, 25 unit tests passing |
| Tools layer (AI-callable wrappers around the rules engine) | ✅ Done |
| Agent + Gemini wiring + `/api/chat` | ✅ Done, proven with live test runs |
| Chat UI + dashboard integration | ✅ Done |
| Live dashboard updates (receipt store, not static seed) | ✅ Done |
| Adversarial / prompt-injection tests | ✅ Done, 7 tests passing |
| Docker | 🚧 In progress — Dockerfile/compose written, image build blocked by host disk space, not a code issue |
| README, full architecture docs, Loom video | ⬜ Not started |

Total automated tests passing: **32/32** (`npm test`).

---

## 3. The mental model — 4 layers

```
domain/      → pure math & rules. No AI, no network calls. Same input always
               gives the same output. This is the "source of truth."

agent/tools/ → thin wrappers that let the AI call into domain/. Each tool
               validates its input (Zod), calls a domain function, and
               returns a structured result. Several tools deliberately
               IGNORE certain AI-supplied values and re-derive facts from
               stored data instead — this is the main security mechanism
               in the whole app (see §6 below).

agent/       → agent.ts wires Gemini + the tools + a system prompt together.
               agent/state/ holds the in-memory "database" (receipt records,
               audit log) that tools read from and write to.

app/         → Next.js routes. api/chat is the entry point the browser talks
               to. dashboard/page.tsx + components/ are what you actually see.
```

Nothing skips a layer. The AI never touches `domain/` directly — always
through a tool in `agent/tools/`.

---

## 4. Request flow — what happens when you click "process this receipt"

```
Browser (ChatPanel.tsx)
   │ user selects a receipt (dashboard state) + types a message
   ▼
POST /api/chat  (src/app/api/chat/route.ts)
   │ receives { messages, selectedReceiptId }
   ▼
agent/agent.ts → runAgent()
   │ builds the system prompt + hands Gemini the 9 tools,
   │ with selectedReceiptId "baked in" via createAgentTools(selectedReceiptId)
   ▼
Gemini decides which tool to call, in what order
   │
   ▼
agent/tools/get-current-receipt.ts     → reads agent/state/receipt-store.ts
agent/tools/validate-gst-number.ts     → calls domain/cra/gst-number-rules.ts
agent/tools/validate-documentation.ts  → calls domain/cra/documentation-rules.ts
agent/tools/classify-expense.ts        → fixed lookup table
agent/tools/calculate-itc.ts           → calls domain/cra/itc-rules.ts
agent/tools/assign-gifi-code.ts        → calls domain/gifi/gify-catalogue.ts
agent/tools/update-expense-classification.ts
   → RE-DERIVES everything from scratch (ignores what Gemini claimed),
     writes the final result into receipt-store.ts, logs to audit-log.ts
   ▼
Gemini writes a plain-English summary using the tool results
   │
   ▼
Response streams back to ChatPanel.tsx, token by token + tool-call status
   │
   ▼
GET /api/receipts (src/app/api/receipts/route.ts)
   → reads the SAME receipt-store.ts, so the dashboard card now shows
     the updated category / GIFI / ITC / status
```

The two things worth internalizing:
1. **The AI only ever picks which tool to call.** The tools do the real work.
2. **The dashboard and the agent share one in-memory store**
   (`receipt-store.ts`) — that's *how* the UI "reacts" to what the agent did.

---

## 5. Suggested reading order

Read in this order. Each step only depends on what came before it.

### Step 1 — the data shape
- `src/domain/expences/receipt.ts` — the `Receipt` type (just a TS interface)
- `src/db/seed/receipt.ts` — the 5 mock receipts we test with, including the
  deliberately malicious one (`receipt-005`) used for prompt-injection testing

### Step 2 — the pure math (read like a calculator, no AI involved)
- `src/domain/cra/gst-number-rules.ts` — GST/HST number format validation
- `src/domain/cra/documentation-rules.ts` — the 3 CRA documentation tiers
- `src/domain/cra/meals-rules.ts` — the 50% meals/entertainment ITC rule
- `src/domain/cra/itc-rules.ts` — **the most important file** — the actual
  tax-credit calculation, using `Decimal.js` for money-safe math
- `src/domain/gifi/gify-catalogue.ts` — the fixed list of valid GIFI codes

Optional but genuinely useful: open the matching test file for each
(`tests/unit/*.test.ts`) — seeing real input → expected output pairs is often
the fastest way to understand what a function does.

### Step 3 — state (what the agent reads from / writes to)
- `src/agent/state/receipt-store.ts` — the in-memory "database": all
  receipts + their current processing stage + final classification
- `src/agent/state/audit-log.ts` — a simple append-only history of every
  tool action taken

### Step 4 — the tools (turning math into AI-callable actions)
Read these in roughly this order, easiest to most important:
- `src/agent/tools/get-current-receipt.ts` — simplest tool; also shows the
  "untrusted vendor text" wrapper that defends against prompt injection
- `src/agent/tools/calculate-itc.ts` — shows a tool calling into `domain/`,
  and shows how `mealEntertainment` is deliberately NOT an AI-supplied input
- `src/agent/tools/update-expense-classification.ts` — **read this
  carefully** — it's the final safety net: it recomputes the entire result
  itself rather than trusting anything the AI said, before saving
- `src/agent/tools/index.ts` — lists all 9 tools together; this is where
  `selectedReceiptId` gets "baked into" every tool for one request

### Step 5 — the agent itself
- `src/agent/agent.ts` — read the `SYSTEM_PROMPT` string first (it's just
  plain English — literally Gemini's instructions), then the small
  `runAgent()` function below it
- `src/app/api/chat/route.ts` — the HTTP entry point; converts the browser's
  message format, calls `runAgent`, streams the result back

### Step 6 — what you can see in the browser
- `src/app/dashboard/page.tsx` — the page: receipt list + chat panel,
  fetches from `/api/receipts` on load and after the agent finishes
- `src/components/dashboard/ReceiptCard.tsx` — one receipt's card, including
  the classification details once processed
- `src/components/dashboard/StatusBadge.tsx` — the small colored status pill
- `src/components/copilot/ChatPanel.tsx` — the chat box itself, using AI
  SDK's `useChat`; renders both text and live tool-call status lines

### Step 7 — the safety tests (read after the above makes sense)
- `tests/security/adversarial.test.ts` — the 5 required adversarial cases,
  each calling a tool directly (not through the live AI) to prove the
  guarantee holds regardless of what any model decides to do

---

## 6. The one idea that explains most of the design decisions

**Never trust the AI for a fact the code can determine itself.**

Examples of this rule in the actual code:
- `calculate-itc.ts` derives `mealEntertainment` from `receipt.type`, not
  from anything the AI says — so the AI cannot talk its way past the 50%
  meals limitation by simply asserting "this isn't a meal."
- `validate-documentation.ts` derives `hasDescription` from the real receipt
  data (this was a real bug we caught and fixed on Day 4 — it originally
  let the AI default this to `true`).
- `assign-gifi-code.ts` and `update-expense-classification.ts` never accept
  a GIFI code at face value — they check it against a fixed catalogue.
- `update-expense-classification.ts` recomputes the ENTIRE result from
  scratch before saving, regardless of what numbers appeared earlier in the
  conversation.

If you're trying to understand *why* a tool is written a certain way, this
is almost always the reason.

---

## 7. Tips for reading with outside help (e.g. ChatGPT)

Paste **one file at a time**, including its `import` lines at the top, so
the assistant knows what other pieces that file depends on. A prompt like
*"explain this function line by line, I'm new to TypeScript"* works much
better than pasting the whole project at once.
