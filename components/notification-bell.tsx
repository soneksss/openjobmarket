"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

export function NotificationBell({ iconClassName }: { iconClassName?: string } = {}) {
  const router = useRouter()
  const supabase = createClient()
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchCount = useCallback(async (uid: string) => {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("is_read", false)
    setUnreadCount(count ?? 0)
  }, [])

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const uid = session.user.id
      setUserId(uid)

      fetchCount(uid)
      intervalId = setInterval(() => fetchCount(uid), 30_000)

      // Realtime: INSERT (new), UPDATE (mark-as-read), DELETE (removed)
      channel = supabase
        .channel(`notif-bell-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => fetchCount(uid))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => fetchCount(uid))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => fetchCount(uid))
        .subscribe()

      // Re-fetch when tab regains focus (user returns from notifications page)
      const onFocus = () => fetchCount(uid)
      const onVisible = () => { if (document.visibilityState === "visible") fetchCount(uid) }
      window.addEventListener("focus", onFocus)
      document.addEventListener("visibilitychange", onVisible)

      return () => {
        window.removeEventListener("focus", onFocus)
        document.removeEventListener("visibilitychange", onVisible)
      }
    }

    const cleanup = init()
    return () => {
      if (intervalId) clearInterval(intervalId)
      if (channel) supabase.removeChannel(channel)
      cleanup.then(fn => fn?.())
    }
  }, [])

  const handleClick = () => {
    // Optimistically clear badge before navigating
    setUnreadCount(0)
    router.push("/notifications")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`relative ${iconClassName ? "h-auto w-auto p-1" : ""}`}
      onClick={handleClick}
      aria-label="Notifications"
    >
      <Bell className={iconClassName ?? "h-5 w-5"} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  )
}
