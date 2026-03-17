"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

export function NotificationBell({ iconClassName }: { iconClassName?: string } = {}) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchCount = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false)

      setUnreadCount(count ?? 0)
    }

    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      fetchCount()
      intervalId = setInterval(fetchCount, 30_000)
    }

    init()
    return () => { if (intervalId) clearInterval(intervalId) }
  }, [])

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`relative ${iconClassName ? "h-auto w-auto p-1" : ""}`}
      onClick={() => router.push("/notifications")}
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
