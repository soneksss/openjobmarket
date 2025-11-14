"use client"

import { motion } from "framer-motion"
import { MapPin, Briefcase } from "lucide-react"
import { OptionButton } from "./OptionButton"

interface Step1Props {
  onSelect: (action: "provider" | "hiring") => void
}

export function Step1({ onSelect }: Step1Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Welcome to OpenJobMarket
        </h2>
        <p className="text-gray-600 text-lg">
          What would you like to do?
        </p>
      </div>

      <div className="space-y-4">
        <OptionButton
          icon={MapPin}
          title="Put Me on the Map"
          subtitle="I'm looking for work or want to offer my services"
          onClick={() => onSelect("provider")}
        />

        <OptionButton
          icon={Briefcase}
          title="Post Jobs"
          subtitle="I want to hire people or find professionals"
          onClick={() => onSelect("hiring")}
        />
      </div>
    </motion.div>
  )
}
