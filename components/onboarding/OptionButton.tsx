"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"

interface OptionButtonProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  onClick: () => void
  selected?: boolean
}

export function OptionButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  selected = false
}: OptionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        w-full p-6 rounded-xl border-2 transition-all duration-200
        hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
        ${selected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-blue-300'
        }
      `}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-4">
        <div className={`
          p-3 rounded-lg transition-colors
          ${selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
        `}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-left flex-1">
          <h3 className={`
            text-lg font-semibold transition-colors
            ${selected ? 'text-blue-700' : 'text-gray-900'}
          `}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.button>
  )
}
