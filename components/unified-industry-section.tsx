"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, MapPin } from "lucide-react"

// Industry structure with icon, title, and subcategories
const industries = [
  {
    id: "plumbing-heating",
    icon: "🛠️",
    title: "Plumbing & Heating",
    color: "from-blue-500 to-blue-700",
    borderColor: "border-blue-500",
    hoverColor: "hover:border-blue-600",
    subcategories: [
      "Plumber",
      "Gas Engineer",
      "Heating Engineer",
      "Boiler Technician",
      "Pipe Fitter",
      "Underfloor Heating Specialist",
    ],
  },
  {
    id: "construction-renovation",
    icon: "🧱",
    title: "Construction & Renovation",
    color: "from-orange-500 to-orange-700",
    borderColor: "border-orange-500",
    hoverColor: "hover:border-orange-600",
    subcategories: [
      "Builder",
      "General Contractor",
      "Roofer",
      "Carpenter / Joiner",
      "Bricklayer",
      "Tiler",
      "Plasterer / Dryliner",
      "Painter & Decorator",
      "Electrician",
      "Flooring Specialist",
      "Kitchen Fitter",
      "Bathroom Fitter",
      "Window & Door Installer",
      "Loft Conversion Specialist",
      "Extension Specialist",
      "Insulation Installer",
    ],
  },
  {
    id: "transportation-delivery",
    icon: "🚚",
    title: "Transportation & Delivery",
    color: "from-green-500 to-green-700",
    borderColor: "border-green-500",
    hoverColor: "hover:border-green-600",
    subcategories: [
      "Man & Van",
      "Furniture Removal",
      "Courier",
      "House Clearance",
      "Junk Removal",
      "Moving Services",
    ],
  },
  {
    id: "gardening-landscaping",
    icon: "🌿",
    title: "Gardening & Landscaping",
    color: "from-emerald-500 to-emerald-700",
    borderColor: "border-emerald-500",
    hoverColor: "hover:border-emerald-600",
    subcategories: [
      "Gardener",
      "Landscaper",
      "Tree Surgeon",
      "Lawn Care Specialist",
      "Fence Installer",
      "Patio & Paving Specialist",
    ],
  },
  {
    id: "cleaning-maintenance",
    icon: "🧹",
    title: "Cleaning & Maintenance",
    color: "from-purple-500 to-purple-700",
    borderColor: "border-purple-500",
    hoverColor: "hover:border-purple-600",
    subcategories: [
      "Domestic Cleaner",
      "End of Tenancy Cleaner",
      "Commercial Cleaner",
      "Handyman",
      "Pressure Washing",
      "Property Maintenance",
    ],
  },
  {
    id: "hospitality-catering",
    icon: "🏨",
    title: "Hospitality & Catering",
    color: "from-pink-500 to-pink-700",
    borderColor: "border-pink-500",
    hoverColor: "hover:border-pink-600",
    subcategories: [
      "Private Chef",
      "Catering Services",
      "Event Staff",
      "Mobile Bar Services",
    ],
  },
  {
    id: "technology-it",
    icon: "💻",
    title: "Technology & IT",
    color: "from-indigo-500 to-indigo-700",
    borderColor: "border-indigo-500",
    hoverColor: "hover:border-indigo-600",
    subcategories: [
      "IT Support",
      "Network Technician",
      "Smart Home Installer",
      "CCTV Installer",
      "AV / Home Cinema Installer",
    ],
  },
  {
    id: "healthcare-medical",
    icon: "🩺",
    title: "Healthcare & Medical",
    color: "from-red-500 to-red-700",
    borderColor: "border-red-500",
    hoverColor: "hover:border-red-600",
    subcategories: [
      "Home Care Assistant",
      "Private Nurse",
      "Physiotherapist",
      "Personal Support Worker",
    ],
  },
  {
    id: "automotive",
    icon: "🚗",
    title: "Automotive",
    color: "from-gray-600 to-gray-800",
    borderColor: "border-gray-600",
    hoverColor: "hover:border-gray-700",
    subcategories: [
      "Mobile Mechanic",
      "Car Detailing",
      "Auto Electrician",
      "Windscreen Repair",
      "Tyre Fitting",
    ],
  },
  {
    id: "beauty-wellness",
    icon: "💅",
    title: "Beauty & Wellness",
    color: "from-rose-500 to-rose-700",
    borderColor: "border-rose-500",
    hoverColor: "hover:border-rose-600",
    subcategories: [
      "Mobile Hairdresser",
      "Beauty Therapist",
      "Massage Therapist",
      "Personal Trainer",
      "Nail Technician",
    ],
  },
  {
    id: "education-tutoring",
    icon: "📚",
    title: "Education & Tutoring",
    color: "from-yellow-500 to-yellow-700",
    borderColor: "border-yellow-500",
    hoverColor: "hover:border-yellow-600",
    subcategories: [
      "Private Tutor",
      "Music Teacher",
      "Language Teacher",
      "Sports Coach",
      "Driving Instructor",
    ],
  },
  {
    id: "security",
    icon: "🔒",
    title: "Security Services",
    color: "from-slate-600 to-slate-800",
    borderColor: "border-slate-600",
    hoverColor: "hover:border-slate-700",
    subcategories: [
      "Security Guard",
      "Locksmith",
      "Alarm Installation",
      "Security Consultant",
    ],
  },
  {
    id: "pet-services",
    icon: "🐾",
    title: "Pet Services",
    color: "from-amber-500 to-amber-700",
    borderColor: "border-amber-500",
    hoverColor: "hover:border-amber-600",
    subcategories: [
      "Dog Walker",
      "Pet Sitter",
      "Dog Groomer",
      "Pet Trainer",
      "Veterinary Nurse",
    ],
  },
  {
    id: "photography-media",
    icon: "📸",
    title: "Photography & Media",
    color: "from-violet-500 to-violet-700",
    borderColor: "border-violet-500",
    hoverColor: "hover:border-violet-600",
    subcategories: [
      "Photographer",
      "Videographer",
      "Drone Operator",
      "Video Editor",
      "Graphic Designer",
    ],
  },
  {
    id: "event-entertainment",
    icon: "🎉",
    title: "Event & Entertainment",
    color: "from-fuchsia-500 to-fuchsia-700",
    borderColor: "border-fuchsia-500",
    hoverColor: "hover:border-fuchsia-600",
    subcategories: [
      "DJ",
      "Event Planner",
      "Entertainer",
      "Magician",
      "Face Painter",
    ],
  },
  {
    id: "legal-financial",
    icon: "⚖️",
    title: "Legal & Financial",
    color: "from-cyan-600 to-cyan-800",
    borderColor: "border-cyan-600",
    hoverColor: "hover:border-cyan-700",
    subcategories: [
      "Accountant",
      "Bookkeeper",
      "Tax Advisor",
      "Legal Consultant",
      "Financial Advisor",
    ],
  },
]

interface UnifiedIndustrySectionProps {
  onCategorySelect?: (category: string) => void
}

export function UnifiedIndustrySection({ onCategorySelect }: UnifiedIndustrySectionProps) {
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null)

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
                {/* Industry Header - Simple row with icon, text, arrow */}
                <button
                  onClick={() => handleIndustryClick(industry.id)}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-2xl md:text-3xl flex-shrink-0">{industry.icon}</span>
                    <span className="text-sm md:text-base font-medium text-gray-700 group-hover:text-gray-900 leading-tight">
                      {industry.title}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-1" />
                  )}
                </button>

                {/* Subcategories - Expandable dropdown (pushes content down) */}
                {isExpanded && (
                  <div className="bg-white border border-gray-200 rounded-md shadow-lg mt-2 max-h-72 overflow-y-auto">
                    <div className="p-2 space-y-0.5">
                      {industry.subcategories.map((subcategory) => (
                        <button
                          key={subcategory}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubcategoryClick(subcategory)
                          }}
                          className="w-full text-left px-2 py-1.5 rounded text-sm md:text-base font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between group"
                        >
                          <span className="pr-1">{subcategory}</span>
                          <MapPin className="h-3 w-3 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
