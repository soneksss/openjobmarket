"use client"

import { motion } from "framer-motion"
import { User, Building2 } from "lucide-react"
import { OptionButton } from "./OptionButton"

interface Step2Props {
  onSelect: (userType: "individual" | "business") => void
  onBack: () => void
}

export function Step2({ onSelect, onBack }: Step2Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Who are you?
        </h2>
        <p className="text-gray-600 text-lg">
          Tell us a bit about yourself
        </p>
      </div>

      <div className="space-y-4">
        <OptionButton
          icon={User}
          title="I am an Individual"
          subtitle="I'm a person looking for work or posting personal tasks"
          onClick={() => onSelect("individual")}
        />

        <OptionButton
          icon={Building2}
          title="I am a Business"
          subtitle="I represent a company or trade business"
          onClick={() => onSelect("business")}
        />
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
