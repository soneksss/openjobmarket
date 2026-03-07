"use client"

import { useSearchType } from "@/lib/contexts/search-type-context"
import { ReactNode } from "react"

const backgroundColors: Record<string, string> = {
  traders: "bg-gradient-to-b from-orange-50 via-orange-50/50 to-white",
  jobs_tasks: "bg-gradient-to-b from-purple-50 via-purple-50/50 to-white",
  vacancies: "bg-gradient-to-b from-blue-50 via-blue-50/50 to-white",
  talents: "bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white",
}

export function HomePageWrapper({ children }: { children: ReactNode }) {
  const { searchType } = useSearchType()

  return (
    <div
      className={`
        min-h-screen
        transition-all duration-700 ease-in-out
        ${backgroundColors[searchType]}
      `}
    >
      {children}
    </div>
  )
}
