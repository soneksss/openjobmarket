import { createClient } from "@/lib/client"

/** User is online if last_seen_at is within the last 2 minutes. */
export function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false
  return new Date(lastSeenAt).getTime() > Date.now() - 2 * 60 * 1000
}

/** Best-effort: update the current user's last_seen_at to now. */
export async function updatePresence(): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from("users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id)
  } catch {
    // presence is best-effort — never throw
  }
}
