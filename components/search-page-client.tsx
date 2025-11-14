"use client"

import AdvancedSearch from "@/components/advanced-search"

export function SearchPageClient() {
  const handleSearch = (filters: any) => {
    console.log("Search filters:", filters)
    // TODO: Implement search functionality
  }

  return <AdvancedSearch onSearch={handleSearch} />
}
