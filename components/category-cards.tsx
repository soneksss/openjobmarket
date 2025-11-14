"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Briefcase, Building2, Wrench, Home } from "lucide-react"
import { OnboardingFlow } from "./onboarding/OnboardingFlow"
import Link from "next/link"

interface Category {
  id: string
  title: string
  icon: React.ReactNode
  shortSummary: string
  fullDescription: string[]
  ctaText: string
  action: "provider" | "hiring"
  gradient: string
  hoverGradient: string
}

const categories: Category[] = [
  {
    id: "jobseeker",
    title: "Jobseekers",
    icon: <Briefcase className="w-8 h-8 md:w-10 md:h-10" />,
    shortSummary: "Find jobs or let employers find you — anonymously and on your own terms.",
    fullDescription: [
      "Whether you're employed or between jobs, put yourself on the Job Market without revealing personal details.",
      "Set your desired salary, and let employers reach out directly.",
      "Or search for opportunities close to home using our advanced filters — full-time, part-time, freelance, or apprenticeships.",
      "Our goal: make job hunting transparent, fast, and local."
    ],
    ctaText: "Start as Jobseeker",
    action: "provider",
    gradient: "from-emerald-400 to-emerald-600",
    hoverGradient: "from-emerald-500 to-emerald-700"
  },
  {
    id: "employer",
    title: "Employers",
    icon: <Building2 className="w-8 h-8 md:w-10 md:h-10" />,
    shortSummary: "Post jobs or find talent directly on the map — faster than traditional job boards.",
    fullDescription: [
      "Post open positions and discover skilled professionals around you.",
      "Use advanced filters like experience level, skills, and languages to pinpoint the perfect match.",
      "Find not only employees but also tradespeople for your projects.",
      "Our platform helps you discover candidates you didn't even know existed."
    ],
    ctaText: "I'm an Employer",
    action: "hiring",
    gradient: "from-blue-400 to-blue-600",
    hoverGradient: "from-blue-500 to-blue-700"
  },
  {
    id: "contractor",
    title: "Tradespeople",
    icon: <Wrench className="w-8 h-8 md:w-10 md:h-10" />,
    shortSummary: "Offer your services and let businesses or homeowners find you instantly.",
    fullDescription: [
      "If you're a tradesperson, put your services on the map so companies and homeowners can easily reach you.",
      "Set your minimum rate, define your service area, and update your location anytime.",
      "We help you find more jobs near your current location, so you spend less time commuting and more time earning."
    ],
    ctaText: "Get Started as Tradesperson",
    action: "provider",
    gradient: "from-orange-400 to-orange-600",
    hoverGradient: "from-orange-500 to-orange-700"
  },
  {
    id: "homeowner",
    title: "Homeowners",
    icon: <Home className="w-8 h-8 md:w-10 md:h-10" />,
    shortSummary: "Find trusted tradespeople nearby — maybe even your neighbor!",
    fullDescription: [
      "Looking for local professionals for home repairs or small projects?",
      "Our map makes it simple to compare rates, skills, and reviews from tradespeople nearby.",
      "You might even discover that the perfect helper lives just down the street.",
      "We help you connect locally — quickly, safely, and transparently."
    ],
    ctaText: "Find Local Help",
    action: "hiring",
    gradient: "from-purple-400 to-purple-600",
    hoverGradient: "from-purple-500 to-purple-700"
  }
]

export function CategoryCards() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingAction, setOnboardingAction] = useState<"provider" | "hiring">("provider")

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedCategory(null)
      }
    }

    if (selectedCategory) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [selectedCategory])

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category)
    // Store category information for onboarding flow
    const roleMapping: Record<string, string> = {
      jobseeker: "jobseeker",
      employer: "employer",
      contractor: "contractor",
      homeowner: "homeowner"
    }

    const userTypeMapping: Record<string, string> = {
      jobseeker: "individual",
      employer: "business",
      contractor: "individual",
      homeowner: "individual"
    }

    // Store the pre-selected role and user type for the onboarding flow
    localStorage.setItem("onboarding_preselected_role", roleMapping[category.id] || "")
    localStorage.setItem("onboarding_preselected_usertype", userTypeMapping[category.id] || "")
    localStorage.setItem("selectedCategory", category.id)
  }

  const handleClose = () => {
    setSelectedCategory(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto">
        {categories.map((category) => (
          <motion.div
            key={category.id}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className="p-3 md:p-4 cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white group"
              onClick={() => handleCategoryClick(category)}
            >
              <div className="space-y-2">
                {/* Icon */}
                <div
                  className={`w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-gradient-to-br ${category.gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}
                >
                  {category.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 text-center">
                  {category.title}
                </h3>

                {/* Short Summary */}
                <p className="text-sm md:text-base text-gray-600 text-center leading-relaxed min-h-[3rem]">
                  {category.shortSummary}
                </p>

                {/* Learn More Hint */}
                <p className="text-xs md:text-sm text-blue-600 font-semibold text-center group-hover:underline">
                  Click to learn more →
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, type: "spring", damping: 25 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Header with Icon */}
              <div className={`bg-gradient-to-br ${selectedCategory.gradient} p-8 text-white`}>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {selectedCategory.icon}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold">{selectedCategory.title}</h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Full Description */}
                <div className="space-y-4">
                  {selectedCategory.fullDescription.map((paragraph, index) => (
                    <p key={index} className="text-base md:text-lg text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  <Button
                    size="lg"
                    onClick={() => {
                      setOnboardingAction(selectedCategory.action)
                      setShowOnboarding(true)
                      setSelectedCategory(null)
                    }}
                    className={`w-full py-6 text-lg font-semibold bg-gradient-to-r ${selectedCategory.gradient} hover:bg-gradient-to-r hover:${selectedCategory.hoverGradient} shadow-lg hover:shadow-xl transition-all duration-200`}
                  >
                    {selectedCategory.ctaText}
                  </Button>
                </div>

                {/* Additional Info */}
                <p className="text-sm text-gray-500 text-center pt-2">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-blue-600 hover:underline font-semibold">
                    Sign in here
                  </Link>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowOnboarding(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            <OnboardingFlow
              onClose={() => setShowOnboarding(false)}
              initialAction={onboardingAction}
            />
          </div>
        </div>
      )}
    </>
  )
}
