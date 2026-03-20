"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/client"

// Notification types that homeowners receive about their jobs
const HOMEOWNER_JOB_NOTIF_TYPES = ["job_application", "job_expiring"]

/**
 * Silently marks homeowner job-related notifications as read when mounted.
 * Renders nothing — include this component in the My Jobs page.
 */
export function MarkJobNotifsRead() {
  const supabase = createClient()

  useEffect(() => {
    const mark = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .in("type", HOMEOWNER_JOB_NOTIF_TYPES)
    }
    mark()
  }, [])

  return null
}
