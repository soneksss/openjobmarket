"use client"

import { useSearchType } from "@/lib/contexts/search-type-context"

const backgroundGradients: Record<string, string> = {
  traders: "from-orange-50 via-orange-100/50 to-white",
  jobs_tasks: "from-purple-50 via-purple-100/50 to-white",
  vacancies: "from-blue-50 via-blue-100/50 to-white",
  talents: "from-emerald-50 via-emerald-100/50 to-white",
}

const borderColors: Record<string, { job: string; company: string; trades: string; homeowner: string }> = {
  traders: { job: "border-blue-400", company: "border-green-400", trades: "border-orange-500", homeowner: "border-purple-400" },
  jobs_tasks: { job: "border-blue-400", company: "border-green-400", trades: "border-orange-400", homeowner: "border-purple-500" },
  vacancies: { job: "border-blue-500", company: "border-green-400", trades: "border-orange-400", homeowner: "border-purple-400" },
  talents: { job: "border-blue-400", company: "border-green-500", trades: "border-orange-400", homeowner: "border-purple-400" },
}

export function DynamicIndustriesSection() {
  const { searchType } = useSearchType()
  const borders = borderColors[searchType] || borderColors.traders

  return (
    <section className={`py-3 md:py-5 bg-gradient-to-b ${backgroundGradients[searchType]} transition-all duration-700 ease-in-out`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-3 md:mb-4">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-1.5 text-balance text-slate-800">
            How Open Job Market Can Help You
          </h2>
          <p className="text-xs md:text-sm text-gray-600 max-w-3xl mx-auto text-pretty px-2">
            Connecting the right people with the right opportunities
          </p>
        </div>

        {/* 4 Cards Grid - Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-6xl mx-auto">
          {/* Talent Card */}
          <div className={`bg-white rounded-lg shadow-md border-2 ${borders.job} overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105`}>
            <div className="bg-blue-600 text-white p-2 md:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-2xl md:text-3xl">💼</span>
                <h3 className="text-sm md:text-base font-bold leading-tight">Job Seekers</h3>
              </div>
              <p className="text-blue-100 text-[10px] md:text-xs">Find your dream role</p>
            </div>
            <div className="p-2 md:p-3">
              <ul className="space-y-1 md:space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Build professional CV</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Search jobs on map</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Apply anonymously</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Companies Card */}
          <div className={`bg-white rounded-lg shadow-md border-2 ${borders.company} overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105`}>
            <div className="bg-green-600 text-white p-2 md:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-2xl md:text-3xl">🏢</span>
                <h3 className="text-sm md:text-base font-bold leading-tight">Companies</h3>
              </div>
              <p className="text-green-100 text-[10px] md:text-xs">Hire top talent</p>
            </div>
            <div className="p-2 md:p-3">
              <ul className="space-y-1 md:space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Post job vacancies</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Browse candidates</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Manage applications</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Tradespeople Card */}
          <div className={`bg-white rounded-lg shadow-md border-2 ${borders.trades} overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105`}>
            <div className="bg-orange-600 text-white p-2 md:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-2xl md:text-3xl">🔨</span>
                <h3 className="text-sm md:text-base font-bold leading-tight">Tradespeople</h3>
              </div>
              <p className="text-orange-100 text-[10px] md:text-xs">Grow your business</p>
            </div>
            <div className="p-2 md:p-3">
              <ul className="space-y-1 md:space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Showcase portfolio</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Find local jobs</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Get reviews</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Homeowners Card */}
          <div className={`bg-white rounded-lg shadow-md border-2 ${borders.homeowner} overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105`}>
            <div className="bg-purple-600 text-white p-2 md:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-2xl md:text-3xl">🏠</span>
                <h3 className="text-sm md:text-base font-bold leading-tight">Homeowners</h3>
              </div>
              <p className="text-purple-100 text-[10px] md:text-xs">Find trusted trades</p>
            </div>
            <div className="p-2 md:p-3">
              <ul className="space-y-1 md:space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Post trade jobs</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Compare quotes</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-green-600 font-bold text-sm mt-0.5">✓</span>
                  <span className="text-slate-700 text-[10px] md:text-xs font-medium">Hire with confidence</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
