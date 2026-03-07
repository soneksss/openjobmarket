"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, MapPin, Search } from "lucide-react"
import { industries } from "@/lib/data/industries"

interface UnifiedIndustrySectionProps {
  onCategorySelect?: (category: string) => void
}

export function UnifiedIndustrySection({ onCategorySelect }: UnifiedIndustrySectionProps) {
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null)
  const [dropdownHeights, setDropdownHeights] = useState<Record<string, number>>({})
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Measure dropdown heights for smooth animation
  useEffect(() => {
    const heights: Record<string, number> = {}
    Object.keys(dropdownRefs.current).forEach((id) => {
      const el = dropdownRefs.current[id]
      if (el) {
        heights[id] = el.scrollHeight
      }
    })
    setDropdownHeights(heights)
  }, [])

  const handleIndustryClick = (industryId: string) => {
    setExpandedIndustry(expandedIndustry === industryId ? null : industryId)
  }

  const handleSubcategoryClick = (subcategory: string) => {
    // This will be called when user clicks a subcategory
    // It should trigger the map picker and pre-fill the search
    if (onCategorySelect) {
      onCategorySelect(subcategory)
    }
  }

  // Handle clicking on the industry title (search all in this industry)
  const handleIndustrySearch = (industryTitle: string) => {
    if (onCategorySelect) {
      onCategorySelect(industryTitle)
    }
  }

  return (
    <section className="py-2 md:py-3 bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-2 md:mb-3">
          <h2 className="text-base md:text-lg lg:text-xl font-bold mb-0.5 md:mb-1 text-balance text-slate-800">
            Find Trusted Tradespeople by Industry
          </h2>
          <p className="text-[10px] md:text-xs text-gray-600 max-w-3xl mx-auto text-pretty px-2">
            Click an industry to explore specialist trades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 max-w-7xl mx-auto">
          {industries.map((industry) => {
            const isExpanded = expandedIndustry === industry.id

            return (
              <div key={industry.id} className="flex flex-col">
                {/* Industry Header - With selected frame */}
                <button
                  onClick={() => handleIndustryClick(industry.id)}
                  className={`
                    flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 cursor-pointer group
                    ${isExpanded
                      ? `${industry.borderColor} border-2 bg-gradient-to-r ${industry.color} text-white shadow-md`
                      : 'border-2 border-transparent hover:bg-gray-100'}
                  `}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-2xl md:text-3xl flex-shrink-0">{industry.icon}</span>
                    <span className={`text-sm md:text-base font-medium leading-tight transition-colors duration-300 ${
                      isExpanded ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'
                    }`}>
                      {industry.title}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 ml-1 transition-all duration-300 ${
                    isExpanded
                      ? 'text-white rotate-180'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                </button>

                {/* Subcategories - Smooth expandable dropdown */}
                <div
                  className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${isExpanded ? 'opacity-100 mt-2' : 'opacity-0 max-h-0'}
                  `}
                  style={{
                    maxHeight: isExpanded ? '320px' : '0px',
                  }}
                >
                  <div
                    ref={(el) => { dropdownRefs.current[industry.id] = el }}
                    className={`bg-white border-2 ${industry.borderColor} rounded-lg shadow-lg overflow-hidden`}
                  >
                    <div className="p-2 space-y-0.5 max-h-72 overflow-y-auto">
                      {/* Industry Title as first option - Search all in this industry */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleIndustrySearch(industry.title)
                        }}
                        className={`
                          w-full text-left px-3 py-2 rounded-md text-sm md:text-base font-semibold
                          bg-gradient-to-r ${industry.color} text-white
                          hover:opacity-90 transition-all duration-200
                          flex items-center justify-between group mb-1
                        `}
                      >
                        <span className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          <span>All {industry.title}</span>
                        </span>
                        <MapPin className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-1.5" />

                      {/* Specific job titles */}
                      {industry.subcategories.map((subcategory) => (
                        <button
                          key={subcategory}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubcategoryClick(subcategory)
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-md text-sm md:text-base font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 flex items-center justify-between group"
                        >
                          <span className="pr-1">{subcategory}</span>
                          <MapPin className="h-3 w-3 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-2 md:mt-3">
          <p className="text-[10px] md:text-xs text-gray-500">
            Can't find what you're looking for? Try our search above
          </p>
        </div>
      </div>
    </section>
  )
}
