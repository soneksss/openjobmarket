"use client"

import { useState } from "react"
import { MainPageSearch } from "@/components/main-page-search"
import { BrowseCategoriesSection } from "@/components/browse-categories-section"

interface UnifiedSearchPageProps {
  isSignedIn: boolean
}

export function UnifiedSearchPage({ isSignedIn }: UnifiedSearchPageProps) {
  const [categorySearch, setCategorySearch] = useState<string>("")

  const handleCategoryClick = (category: string) => {
    // Set the category as the search query
    setCategorySearch(category)
    // Scroll to the search section
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Search Section */}
      <div className="max-w-4xl mx-auto">
        <MainPageSearch externalSearchQuery={categorySearch} />
      </div>

      {/* Browse Popular Categories section - for all users */}
      <BrowseCategoriesSection onCategoryClick={handleCategoryClick} />
    </>
  )
}
