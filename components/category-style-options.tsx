"use client"

import { useTranslation } from "@/lib/i18n/context"

interface Category {
  key: string
  icon: string
  color: string
}

export function CategoryStyleOptions() {
  const { t } = useTranslation()

  // Sample categories for demo
  const sampleCategories = [
    { key: "plumber", icon: "🔧" },
    { key: "electrician", icon: "⚡" },
    { key: "builder", icon: "🏗️" },
    { key: "programmer", icon: "💻" },
    { key: "nurse", icon: "👩‍⚕️" },
  ]

  // Style Option 1: Professional Gray (CURRENT - like Checkatrade)
  const style1: Category[] = sampleCategories.map(cat => ({
    ...cat,
    color: "from-slate-600 to-slate-700"
  }))

  // Style Option 2: Subtle Blue-Gray
  const style2: Category[] = sampleCategories.map(cat => ({
    ...cat,
    color: "from-slate-500 to-blue-600"
  }))

  // Style Option 3: Navy Professional
  const style3: Category[] = sampleCategories.map(cat => ({
    ...cat,
    color: "from-blue-800 to-blue-900"
  }))

  // Style Option 4: Charcoal Professional
  const style4: Category[] = sampleCategories.map(cat => ({
    ...cat,
    color: "from-gray-700 to-gray-800"
  }))

  // Style Option 5: Teal Professional
  const style5: Category[] = sampleCategories.map(cat => ({
    ...cat,
    color: "from-teal-600 to-teal-700"
  }))

  const renderCategoryRow = (categories: Category[], title: string, description: string) => (
    <div className="mb-8 p-4 border-2 border-gray-300 rounded-lg bg-white">
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="flex gap-2 flex-wrap">
        {categories.map((category) => (
          <button
            key={category.key}
            className={`group relative overflow-hidden rounded-lg p-2 bg-gradient-to-br ${category.color} text-white shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 w-20 h-20`}
          >
            <div className="flex flex-col items-center justify-center text-center h-full gap-1">
              <div className="flex items-center justify-center flex-shrink-0">
                <span className="text-3xl drop-shadow-lg leading-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{category.icon}</span>
              </div>
              <span className="text-[10px] font-bold drop-shadow-md leading-tight line-clamp-1">{t(`categories.${category.key}`)}</span>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Choose Your Preferred Icon Style</h2>
        <p className="text-gray-600 mb-6 text-center">Select one of the professional color schemes below. All use the same icons but with different color treatments.</p>

        {renderCategoryRow(style1, "Option 1: Professional Gray (CURRENT)", "Clean, neutral slate gray - similar to Checkatrade. Works well for professional appearance.")}

        {renderCategoryRow(style2, "Option 2: Subtle Blue-Gray", "Soft gradient from gray to blue. Professional but adds a touch of brand color.")}

        {renderCategoryRow(style3, "Option 3: Navy Professional", "Deep navy blue - authoritative and trustworthy. Traditional corporate feel.")}

        {renderCategoryRow(style4, "Option 4: Charcoal Professional", "Dark charcoal gray - sophisticated and modern. Slightly darker than Option 1.")}

        {renderCategoryRow(style5, "Option 5: Teal Professional", "Professional teal - fresh and modern while remaining professional.")}
      </div>
    </div>
  )
}
