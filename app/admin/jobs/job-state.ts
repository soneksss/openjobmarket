// What a job looks like from the site: open, in progress with a
// tradesperson (left alone), or closed (can be reopened).
export function jobState(j: { status: string; is_active: boolean; expires_at: string | null }, now: number) {
  if (j.status === "CONFIRMED" || j.status === "ACTIVE") return { label: "In progress", kind: "busy" as const }
  if (j.status === "POSTED") {
    if (!j.is_active) return { label: "Taken down", kind: "closed" as const }
    if (j.expires_at && new Date(j.expires_at).getTime() < now) return { label: "Expired", kind: "closed" as const }
    return { label: "Open", kind: "open" as const }
  }
  return { label: j.status.charAt(0) + j.status.slice(1).toLowerCase(), kind: "closed" as const }
}

// One conversation = one person replying to the poster. Older messages may have
// no conversation_id, so fall back to the pair of people.
export function conversationKey(m: { conversation_id: string | null; sender_id: string; recipient_id: string }) {
  return m.conversation_id ?? [m.sender_id, m.recipient_id].sort().join(":")
}
