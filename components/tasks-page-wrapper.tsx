"use client"

import { useRouter } from "next/navigation"
import JobMapView from "@/components/job-map-view"
import { BrowseCategoriesSection } from "@/components/browse-categories-section"

interface TasksPageWrapperProps {
  jobs: any[]
  user: any
  searchParams: any
  center: [number, number]
}

export function TasksPageWrapper({ jobs, user, searchParams, center }: TasksPageWrapperProps) {
  const router = useRouter()

  const handleCategoryClick = (category: string) => {
    // Navigate to tasks page with category as search term only
    // Don't preserve location - let user add location after selecting category
    const params = new URLSearchParams()
    params.set("search", category)

    router.push(`/tasks?${params.toString()}`)
  }

  return (
    <JobMapView
      jobs={jobs}
      user={user}
      searchParams={searchParams}
      center={center}
      categoriesSection={<BrowseCategoriesSection onCategoryClick={handleCategoryClick} />}
      basePath="/tasks"
    />
  )
}
