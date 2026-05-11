"use client"

import { motion } from "framer-motion"

interface Step3Props {
  userType: "individual" | "business"
  onSelect: (role: "homeowner" | "jobseeker" | "employer" | "contractor") => void
  onBack: () => void
}

export function Step3({ onSelect, onBack }: Step3Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <p className="text-sm font-semibold text-blue-500 uppercase tracking-widest mb-2">
          Step 1 of 2
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Create Your Account
        </h2>
        <p className="text-gray-500 text-base">
          How will you use the platform?
        </p>
      </div>

      <div className="space-y-4">
        <motion.button
          onClick={() => onSelect("homeowner")}
          className="w-full p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all duration-200 text-left group"
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏠</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                Hire Tradespeople
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Post jobs and hire trusted local professionals
              </p>
            </div>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onSelect("contractor")}
          className="w-full p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-orange-400 hover:shadow-lg transition-all duration-200 text-left group"
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">👷</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                Find Trade Jobs
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Discover local jobs and grow your trade business
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          ← Back
        </button>
      </div>
    </motion.div>
  )
}
