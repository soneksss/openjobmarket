"use client"

import { usePresence } from "@/hooks/use-presence"

export function PresenceTracker({ userId }: { userId?: string | null }) {
  usePresence(userId)
  return null
}
