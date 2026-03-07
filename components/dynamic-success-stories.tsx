"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSearchType } from "@/lib/contexts/search-type-context"
import { successStoriesByTab, getHighlightColor } from "@/lib/data/success-stories"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

export function DynamicSuccessStories() {
  const { searchType } = useSearchType()
  const stories = successStoriesByTab[searchType] || successStoriesByTab.vacancies

  return (
    <section className="py-3 md:py-5 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-2 md:mb-3">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-1.5 text-balance text-blue-900">
            Success Stories
          </h2>
          <p className="text-xs md:text-sm text-gray-600 max-w-3xl mx-auto text-pretty px-2">
            Real results from professionals and companies who found their perfect match
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={searchType}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid md:grid-cols-3 gap-3 md:gap-4 max-w-6xl mx-auto"
          >
            {stories.map((story, index) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-0 shadow-lg h-full">
                  <div className={`aspect-video bg-gradient-to-br ${story.gradientFrom} ${story.gradientTo} relative overflow-hidden`}>
                    <img
                      src={story.image}
                      alt={`${story.name} - ${story.role}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 md:p-3">
                    <h3 className="text-base md:text-lg font-bold mb-1 text-gray-800">
                      {story.name} - {story.role}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 leading-relaxed mb-1.5 md:mb-2">
                      "{story.quote}"
                    </p>
                    <div
                      className="flex items-center font-semibold text-xs md:text-sm"
                      style={{ color: getHighlightColor(searchType) }}
                    >
                      <span className="text-lg md:text-xl mr-1.5">{story.highlightIcon}</span>
                      <span>{story.highlight}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="text-center mt-2 md:mt-3">
          <p className="text-gray-500 text-xs md:text-sm mb-2 md:mb-2.5">
            Join thousands who found their perfect match
          </p>
          <Button
            size="default"
            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
            asChild
          >
            <Link href="/onboarding">Start Your Success Story</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
