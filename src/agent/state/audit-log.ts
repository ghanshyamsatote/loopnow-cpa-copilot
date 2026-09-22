// Minimal audit trail. Every tool execution that affects a receipt's
// classification writes one event here, so what happened / when / using which
// rule version can be reconstructed later. In-memory for now (Day 3); swap
// the storage for a real `audit_events` table without changing callers.

import { CRA_RULESET_VERSION } from "./receipt-store";

export interface AuditEvent {
    eventId: string;
    timestamp: string;
    actor: "agent" | "human";
    receiptId: string;
    action: string;
    inputSummary: unknown;
    resultSummary: unknown;
    ruleVersion: string;
    status: "success" | "error";
}

const events: AuditEvent[] = [];

let counter = 0;

export function recordAuditEvent(
    event: Omit<AuditEvent, "eventId" | "timestamp" | "ruleVersion">,
): AuditEvent {
    counter += 1;
    const fullEvent: AuditEvent = {
        eventId: `evt_${counter}`,
        timestamp: new Date().toISOString(),
        ruleVersion: CRA_RULESET_VERSION,
        ...event,
    };
    events.push(fullEvent);
    return fullEvent;
}

export function getAuditEventsForReceipt(receiptId: string): AuditEvent[] {
    return events.filter((e) => e.receiptId === receiptId);
}

export function getAllAuditEvents(): AuditEvent[] {
    return [...events];
}
