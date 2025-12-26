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
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const categories: Category[] = [
    // Most Popular - Priority Order
    { key: "plumber", icon: "🔧", color: "from-blue-500 to-blue-600" },
    { key: "gasEngineer", icon: "🔥", color: "from-orange-600 to-orange-700" },
    { key: "electrician", icon: "⚡", color: "from-yellow-500 to-orange-500" },
    { key: "plasterer", icon: "🧱", color: "from-stone-500 to-stone-600" },
    { key: "careWorker", icon: "🤝", color: "from-green-400 to-emerald-500" },
    { key: "manWithVan", icon: "🚐", color: "from-blue-600 to-cyan-600" },
    { key: "programmer", icon: "💻", color: "from-blue-600 to-indigo-600" },
    { key: "delivery", icon: "📦", color: "from-orange-500 to-red-500" },
    { key: "roofer", icon: "🏘️", color: "from-gray-600 to-gray-700" },
    { key: "builder", icon: "🏗️", color: "from-orange-500 to-red-500" },
    { key: "cleaner", icon: "✨", color: "from-cyan-500 to-blue-500" },
    { key: "bathrooms", icon: "🛁", color: "from-teal-500 to-teal-600" },
    { key: "windowsDoors", icon: "🪟", color: "from-sky-500 to-sky-600" },
    { key: "driveways", icon: "🛤️", color: "from-zinc-500 to-zinc-600" },
    { key: "labour", icon: "👷", color: "from-amber-600 to-orange-600" },
    { key: "nurse", icon: "👩‍⚕️", color: "from-red-400 to-pink-400" },
    { key: "driver", icon: "🚗", color: "from-blue-400 to-cyan-400" },
    { key: "warehouse", icon: "📦", color: "from-orange-600 to-red-600" },
    { key: "gardener", icon: "🌿", color: "from-green-500 to-emerald-600" },
    { key: "administrator", icon: "📋", color: "from-slate-600 to-gray-600" },
    { key: "tiler", icon: "◼️", color: "from-slate-500 to-slate-600" },

    // Other Popular Trades
    { key: "carpenter", icon: "🪵", color: "from-amber-600 to-amber-700" },
    { key: "painter", icon: "🖌️", color: "from-purple-500 to-pink-500" },
    { key: "handyman", icon: "🔨", color: "from-indigo-500 to-indigo-600" },
    { key: "locksmith", icon: "🔑", color: "from-red-500 to-red-600" },
    { key: "heating", icon: "♨️", color: "from-rose-500 to-rose-600" },
    { key: "fencing", icon: "⬛", color: "from-lime-600 to-lime-700" },
    { key: "treeSurgeon", icon: "🌲", color: "from-emerald-600 to-emerald-700" },
    { key: "mechanic", icon: "🔩", color: "from-gray-500 to-gray-600" },
    { key: "flooring", icon: "📐", color: "from-brown-500 to-amber-600" },
    { key: "kitchenFitter", icon: "🍽️", color: "from-orange-400 to-red-500" },
    { key: "hvac", icon: "🌡️", color: "from-blue-400 to-cyan-500" },
    { key: "glazier", icon: "🪞", color: "from-sky-400 to-blue-500" },
    { key: "decorator", icon: "🎨", color: "from-pink-400 to-purple-500" },
    { key: "bricklayer", icon: "🧱", color: "from-red-600 to-orange-600" },
    { key: "scaffolder", icon: "🏗️", color: "from-gray-500 to-slate-600" },
    { key: "welder", icon: "⚡", color: "from-yellow-600 to-orange-600" },

    // Tech & IT
    { key: "softwareEngineer", icon: "⚙️", color: "from-indigo-600 to-purple-600" },
    { key: "webDesigner", icon: "🎨", color: "from-pink-500 to-rose-500" },
    { key: "designer", icon: "✏️", color: "from-violet-500 to-purple-500" },
    { key: "aiSpecialist", icon: "🤖", color: "from-cyan-600 to-blue-600" },
    { key: "itSupport", icon: "🖥️", color: "from-blue-500 to-cyan-500" },
    { key: "dataAnalyst", icon: "📊", color: "from-green-600 to-teal-600" },
    { key: "cybersecurity", icon: "🔒", color: "from-red-600 to-pink-600" },
    { key: "devOps", icon: "🔄", color: "from-purple-600 to-indigo-600" },

    // Healthcare
    { key: "doctor", icon: "🩺", color: "from-blue-400 to-cyan-400" },
    { key: "pharmacist", icon: "💊", color: "from-green-500 to-emerald-600" },
    { key: "dentist", icon: "🦷", color: "from-sky-400 to-blue-500" },

    // Professional Services
    { key: "accountant", icon: "💰", color: "from-green-600 to-teal-600" },
    { key: "marketing", icon: "📢", color: "from-orange-500 to-amber-500" },
    { key: "sales", icon: "💼", color: "from-blue-500 to-sky-500" },
    { key: "hrManager", icon: "👥", color: "from-purple-500 to-violet-500" },
    { key: "lawyer", icon: "⚖️", color: "from-gray-700 to-slate-700" },
    { key: "teacher", icon: "📚", color: "from-amber-500 to-yellow-500" },
    { key: "recruiter", icon: "🎯", color: "from-indigo-500 to-purple-500" },
    { key: "consultant", icon: "💡", color: "from-yellow-500 to-orange-500" },
    { key: "architect", icon: "📐", color: "from-slate-600 to-gray-700" },

    // Other Services
    { key: "chef", icon: "👨‍🍳", color: "from-red-500 to-orange-500" },
    { key: "security", icon: "🛡️", color: "from-slate-700 to-zinc-700" },
    { key: "photographer", icon: "📷", color: "from-purple-400 to-pink-500" },
    { key: "barber", icon: "✂️", color: "from-red-500 to-pink-500" },
    { key: "personalTrainer", icon: "💪", color: "from-orange-500 to-red-500" },
    { key: "eventPlanner", icon: "🎉", color: "from-pink-500 to-purple-500" },
  ]

  // Scroll amount for arrow buttons (in pixels)
  const scrollAmount = 600

  const handlePrev = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const handleNext = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative mx-auto flex items-center gap-1 sm:gap-2">
      {/* Left Arrow */}
      <Button
        onClick={handlePrev}
        className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 p-0 z-10"
        variant="outline"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* Categories Container - Horizontal Scroll with 2 Rows (Desktop) / 4 Rows (Mobile) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
          WebkitOverflowScrolling: 'touch', /* iOS momentum scrolling */
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
          .category-grid {
            grid-template-rows: repeat(4, minmax(0, 1fr));
            height: 360px;
          }
          @media (min-width: 768px) {
            .category-grid {
              grid-template-rows: repeat(2, minmax(0, 1fr));
              height: 180px;
            }
          }
        `}</style>

        {/* Grid with 4 rows on mobile, 2 rows on desktop, auto columns, scrolls horizontally */}
        <div
          className="category-grid grid gap-0.5"
          style={{
            gridAutoFlow: 'column',
            gridAutoColumns: '75px',
          }}
        >
          {categories.map((category) => (
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
        onClick={handleNext}
        className="flex-shrink-0 h-10 w-10 rounded-full bg-white shadow-lg hover:bg-gray-100 p-0 z-10"
        variant="outline"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  )
}
