"use client"

import { CategoryCarousel } from "@/components/category-carousel"
import { useTranslation } from "@/lib/i18n/context"

interface BrowseCategoriesSectionProps {
  onCategoryClick: (category: string) => void
}

export function BrowseCategoriesSection({ onCategoryClick }: BrowseCategoriesSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="mt-6">
      <div className="container mx-auto px-1 sm:px-2">
        <h3 className="text-base font-semibold text-gray-700 mb-4 text-center">
          {t('search.mostPopularCategories')}
        </h3>

        <CategoryCarousel onCategoryClick={onCategoryClick} />
      </div>
    </div>
  )
}
