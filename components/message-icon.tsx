"use client"

import { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

// Debounced sound — shares the same window flag as mobile-bottom-nav to avoid double-play
function playGlobalMsgSound() {
  try {
    const w = window as any
    if (w.__lastMsgSound && Date.now() - w.__lastMsgSound < 800) return
    w.__lastMsgSound = Date.now()
    const Ctx = window.AudioContext || w.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const tone = (freq: number, start: number, dur: number, vol = 0.25) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime + start)
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + dur)
    }
    tone(880, 0, 0.1, 0.28)
    tone(1100, 0.09, 0.14, 0.22)
  } catch { /* browser audio policy */ }
}

interface MessageIconProps {
  user: any
  iconClassName?: string
}

export function MessageIcon({ user, iconClassName }: MessageIconProps) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!user?.id) return

    let intervalId: ReturnType<typeof setInterval> | null = null
    const uid = user.id

    const fetchCount = async () => {
      try {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", uid)
          .eq("is_read", false)
        setUnreadCount(count ?? 0)
      } catch {
        // silently ignore
      }
    }

    fetchCount()
    intervalId = setInterval(fetchCount, 10_000)

    // Re-fetch when user returns to tab (after reading messages in another tab or from /messages page)
    const onFocus = () => fetchCount()
    const onVisible = () => { if (document.visibilityState === "visible") fetchCount() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)

    // Also refresh when a message is sent (dispatched from the chat component)
    const onSent = () => fetchCount()
    window.addEventListener("message-sent", onSent)

    // Realtime: increment immediately on INSERT (no async lag), re-query on UPDATE
    const channel = supabase
      .channel(`msg-badge-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${uid}` }, (payload) => {
        if ((payload.new as any)?.recipient_id !== uid) return
        setUnreadCount(prev => prev + 1)
        const isOnConversation = /\/messages\/[^/]+/.test(window.location.pathname)
        if (!isOnConversation) playGlobalMsgSound()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `recipient_id=eq.${uid}` }, fetchCount)
      .subscribe()

    return () => {
      if (intervalId) clearInterval(intervalId)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("message-sent", onSent)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  if (!user) return null

  const handleClick = () => {
    setUnreadCount(0) // optimistic clear
    router.push("/messages")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`relative ${iconClassName ? "h-auto w-auto p-1" : ""}`}
      onClick={handleClick}
      aria-label="Messages"
    >
      <MessageCircle className={`h-5 w-5 ${iconClassName ?? ""}`} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 min-w-[16px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  )
}
