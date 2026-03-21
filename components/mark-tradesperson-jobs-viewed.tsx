"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/client"

/** Drop this anywhere inside the My-Jobs / Applications pages.
 *  On mount it calls mark_my_jobs_viewed() so the header badge resets. */
export function MarkTradespersonJobsViewed() {
  useEffect(() => {
    const supabase = createClient()
    void supabase.rpc("mark_my_jobs_viewed")
  }, [])

  return null
}
