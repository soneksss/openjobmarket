"use client"

import { useState } from "react"
import { MainPageSearch } from "@/components/main-page-search"
import { BrowseCategoriesSection } from "@/components/browse-categories-section"
import { QuickCheckModal } from "@/components/quick-check-modal"
import { useTranslation } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

interface UnifiedSearchPageProps {
  isSignedIn: boolean
}

export function UnifiedSearchPage({ isSignedIn }: UnifiedSearchPageProps) {
  const { t } = useTranslation()
  const [categorySearch, setCategorySearch] = useState<string>("")
  const [isQuickCheckOpen, setIsQuickCheckOpen] = useState(false)

  const handleCategoryClick = (category: string) => {
    // Set the category as the search query
    setCategorySearch(category)
    // Scroll to the search section
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Quick Check Button - only for unregistered users */}
      {!isSignedIn && (
        <div className="max-w-4xl mx-auto mb-4 flex justify-center">
          <Button
            onClick={() => setIsQuickCheckOpen(true)}
            className="w-full md:w-auto py-5 md:px-8 text-base md:text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <HelpCircle className="w-6 h-6 mr-2" />
            {t('quickCheck.ctaButton')}
          </Button>
        </div>
      )}

      {/* Search Section */}
      <div className="max-w-4xl mx-auto mt-4 sm:-mt-32 md:mt-0">
        <MainPageSearch externalSearchQuery={categorySearch} />
      </div>

      {/* Browse Popular Categories section - for all users */}
      <BrowseCategoriesSection onCategoryClick={handleCategoryClick} />

      {/* Quick Check Modal */}
      <QuickCheckModal
        isOpen={isQuickCheckOpen}
        onClose={() => setIsQuickCheckOpen(false)}
      />
    </>
  )
}
