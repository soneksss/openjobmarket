"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

interface Category {
  key: string
  icon: string
  color: string
}

interface CategoryCarouselProps {
  onCategoryClick: (name: string) => void
}

export function CategoryCarousel({ onCategoryClick }: CategoryCarouselProps) {
  const { t } = useTranslation()
  const categoriesScrollRef = useRef<HTMLDivElement>(null)
  const industriesScrollRef = useRef<HTMLDivElement>(null)

  // Popular Professions - Specific job roles (top row)
  const popularCategories: Category[] = [
    { key: "plumber", icon: "🔧", color: "from-slate-600 to-slate-700" },
    { key: "electrician", icon: "⚡", color: "from-slate-600 to-slate-700" },
    { key: "gasEngineer", icon: "🔥", color: "from-slate-600 to-slate-700" },
    { key: "builder", icon: "🏗️", color: "from-slate-600 to-slate-700" },
    { key: "programmer", icon: "💻", color: "from-slate-600 to-slate-700" },
    { key: "nurse", icon: "👩‍⚕️", color: "from-slate-600 to-slate-700" },
    { key: "delivery", icon: "📦", color: "from-slate-600 to-slate-700" },
    { key: "driver", icon: "🚗", color: "from-slate-600 to-slate-700" },
    { key: "cleaner", icon: "✨", color: "from-slate-600 to-slate-700" },
    { key: "gardener", icon: "🌿", color: "from-slate-600 to-slate-700" },
    { key: "carpenter", icon: "🪵", color: "from-slate-600 to-slate-700" },
    { key: "painter", icon: "🖌️", color: "from-slate-600 to-slate-700" },
    { key: "chef", icon: "👨‍🍳", color: "from-slate-600 to-slate-700" },
    { key: "barber", icon: "✂️", color: "from-slate-600 to-slate-700" },
    { key: "mechanic", icon: "🔩", color: "from-slate-600 to-slate-700" },
    { key: "administrator", icon: "📋", color: "from-slate-600 to-slate-700" },
    { key: "teacher", icon: "👨‍🏫", color: "from-slate-600 to-slate-700" },
    { key: "doctor", icon: "👨‍⚕️", color: "from-slate-600 to-slate-700" },
    { key: "accountant", icon: "🧮", color: "from-slate-600 to-slate-700" },
    { key: "receptionist", icon: "📞", color: "from-slate-600 to-slate-700" },
    { key: "security", icon: "🔒", color: "from-slate-600 to-slate-700" },
    { key: "pharmacist", icon: "💊", color: "from-slate-600 to-slate-700" },
    { key: "photographer", icon: "📸", color: "from-slate-600 to-slate-700" },
    { key: "writer", icon: "✍️", color: "from-slate-600 to-slate-700" },
    { key: "translator", icon: "🌐", color: "from-slate-600 to-slate-700" },
    { key: "salesperson", icon: "💰", color: "from-slate-600 to-slate-700" },
    { key: "architect", icon: "📐", color: "from-slate-600 to-slate-700" },
    { key: "florist", icon: "💐", color: "from-slate-600 to-slate-700" },
    { key: "tailor", icon: "🧵", color: "from-slate-600 to-slate-700" },
    { key: "hairdresser", icon: "💇", color: "from-slate-600 to-slate-700" },
    { key: "dentist", icon: "🦷", color: "from-slate-600 to-slate-700" },
    { key: "scientist", icon: "🔬", color: "from-slate-600 to-slate-700" },
  ]

  // Popular Industries - Broader categories (bottom row)
  const popularIndustries: Category[] = [
    { key: "plumbingHeating", icon: "🔥", color: "from-slate-600 to-slate-700" },
    { key: "construction", icon: "🏗️", color: "from-slate-600 to-slate-700" },
    { key: "healthcareMedical", icon: "🏥", color: "from-slate-600 to-slate-700" },
    { key: "technologyIT", icon: "💻", color: "from-slate-600 to-slate-700" },
    { key: "transportationLogistics", icon: "🚐", color: "from-slate-600 to-slate-700" },
    { key: "cleaningMaintenance", icon: "✨", color: "from-slate-600 to-slate-700" },
    { key: "landscapingGardening", icon: "🌿", color: "from-slate-600 to-slate-700" },
    { key: "hospitalityCatering", icon: "🍽️", color: "from-slate-600 to-slate-700" },
    { key: "professionalServices", icon: "💼", color: "from-slate-600 to-slate-700" },
    { key: "creativeDesign", icon: "🎨", color: "from-slate-600 to-slate-700" },
    { key: "educationTraining", icon: "📚", color: "from-slate-600 to-slate-700" },
    { key: "securitySafety", icon: "🛡️", color: "from-slate-600 to-slate-700" },
    { key: "automotiveMechanical", icon: "🔩", color: "from-slate-600 to-slate-700" },
    { key: "legalFinance", icon: "⚖️", color: "from-slate-600 to-slate-700" },
    { key: "salesMarketing", icon: "📢", color: "from-slate-600 to-slate-700" },
    { key: "realEstateProperty", icon: "🏘️", color: "from-slate-600 to-slate-700" },
  ]

  // Scroll amount for arrow buttons (in pixels)
  const scrollAmount = 600

  const handleCategoriesPrev = () => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const handleCategoriesNext = () => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const handleIndustriesPrev = () => {
    if (industriesScrollRef.current) {
      industriesScrollRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const handleIndustriesNext = () => {
    if (industriesScrollRef.current) {
      industriesScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Popular Categories Section */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2 px-1 text-center">{t('search.popularCategories')}</h4>
        <div className="relative mx-auto flex items-center gap-1 sm:gap-2">
          {/* Left Arrow */}
          <Button
            onClick={handleCategoriesPrev}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 p-0 z-10"
            variant="outline"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          {/* Categories Container - Horizontal Scroll with 2 Rows (Desktop) / 2 Rows (Mobile) */}
          <div
            ref={categoriesScrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
              .category-grid-professions {
                grid-template-rows: repeat(2, minmax(0, 1fr));
                height: 180px;
              }
              @media (min-width: 768px) {
                .category-grid-professions {
                  grid-template-rows: repeat(1, minmax(0, 1fr));
                  height: 90px;
                }
              }
            `}</style>

            {/* Grid with 2 rows on mobile, 1 row on desktop */}
            <div
              className="category-grid-professions grid gap-0.5"
              style={{
                gridAutoFlow: 'column',
                gridAutoColumns: '100px',
              }}
            >
              {popularCategories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => onCategoryClick(t(`categories.${category.key}`))}
                  className={`group relative overflow-hidden rounded-lg p-1 bg-gradient-to-br ${category.color} text-white shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
                  aria-label={t(`categories.${category.key}`)}
                >
                  <div className="flex flex-col items-center justify-center text-center h-full gap-1">
                    <div className="flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl sm:text-4xl drop-shadow-lg leading-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{category.icon}</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold drop-shadow-md leading-tight line-clamp-2 px-1 break-words whitespace-normal w-full">{t(`categories.${category.key}`)}</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Arrow */}
          <Button
            onClick={handleCategoriesNext}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 p-0 z-10"
            variant="outline"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Popular Industries Section */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2 px-1 text-center">{t('search.popularIndustries')}</h4>
        <div className="relative mx-auto flex items-center gap-1 sm:gap-2">
          {/* Left Arrow */}
          <Button
            onClick={handleIndustriesPrev}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 p-0 z-10"
            variant="outline"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          {/* Industries Container - Horizontal Scroll with 2 Rows (Desktop) / 2 Rows (Mobile) */}
          <div
            ref={industriesScrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
              .category-grid-industries {
                grid-template-rows: repeat(2, minmax(0, 1fr));
                height: 180px;
              }
              @media (min-width: 768px) {
                .category-grid-industries {
                  grid-template-rows: repeat(1, minmax(0, 1fr));
                  height: 90px;
                }
              }
            `}</style>

            {/* Grid with 2 rows on mobile, 1 row on desktop */}
            <div
              className="category-grid-industries grid gap-0.5"
              style={{
                gridAutoFlow: 'column',
                gridAutoColumns: '100px',
              }}
            >
              {popularIndustries.map((category) => (
                <button
                  key={category.key}
                  onClick={() => onCategoryClick(t(`categories.${category.key}`))}
                  className={`group relative overflow-hidden rounded-lg p-1 bg-gradient-to-br ${category.color} text-white shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
                  aria-label={t(`categories.${category.key}`)}
                >
                  <div className="flex flex-col items-center justify-center text-center h-full gap-1">
                    <div className="flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl sm:text-4xl drop-shadow-lg leading-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{category.icon}</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold drop-shadow-md leading-tight line-clamp-2 px-1 break-words whitespace-normal w-full">{t(`categories.${category.key}`)}</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Arrow */}
          <Button
            onClick={handleIndustriesNext}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 p-0 z-10"
            variant="outline"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
