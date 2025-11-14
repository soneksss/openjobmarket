"use client"

import { motion } from "framer-motion"

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  labels
}: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10" />

        {/* Active progress line */}
        <motion.div
          className="absolute top-5 left-0 h-1 bg-blue-500 -z-10"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`
          }}
          transition={{ duration: 0.3 }}
        />

        {labels.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep

          return (
            <div key={stepNumber} className="flex flex-col items-center">
              <motion.div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  font-semibold text-sm transition-colors duration-200
                  ${isActive
                    ? 'bg-blue-500 text-white shadow-lg'
                    : isCompleted
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                  }
                `}
                initial={{ scale: 0.8 }}
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {stepNumber}
              </motion.div>
              <span className={`
                mt-2 text-xs font-medium transition-colors
                ${isActive ? 'text-blue-600' : 'text-gray-400'}
              `}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
