"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Briefcase } from "lucide-react"
import { createClient } from "@/lib/client"

interface Props {
  userId: string
  userType: string | undefined
}

export function TradespersonMyJobsButton({ userId, userType }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [badge, setBadge] = useState(0)

  const applicationsPath = "/dashboard/company/my-jobs"

  useEffect(() => {
    const fetchBadge = async () => {
      const { data, error } = await supabase.rpc("get_my_jobs_badge_count")
      if (!error && typeof data === "number") setBadge(data)
    }

    fetchBadge()

    // Re-fetch when tab gains focus
    const onFocus = () => fetchBadge()
    window.addEventListener("focus", onFocus)

    // Real-time: watch job_applications changes for this user's applications
    const channel = supabase
      .channel(`tradesperson-jobs-btn-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_applications" },
        fetchBadge
      )
      .subscribe()

    return () => {
      window.removeEventListener("focus", onFocus)
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleClick = () => {
    setBadge(0)
    router.push(applicationsPath)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={handleClick}
      aria-label="My Jobs"
    >
      <Briefcase className="h-5 w-5" />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Button>
  )
}
