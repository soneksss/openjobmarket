"use client"

import { motion } from "framer-motion"
import { Home, UserCircle, Briefcase, HardHat } from "lucide-react"
import { OptionButton } from "./OptionButton"

interface Step3Props {
  userType: "individual" | "business"
  onSelect: (role: "homeowner" | "jobseeker" | "employer" | "contractor") => void
  onBack: () => void
}

export function Step3({ userType, onSelect, onBack }: Step3Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          {userType === "individual"
            ? "What best describes you?"
            : "What type of business?"}
        </h2>
        <p className="text-gray-600 text-lg">
          {userType === "individual"
            ? "Choose the option that fits you best"
            : "Select your business category"}
        </p>
      </div>

      <div className="space-y-4">
        {userType === "individual" ? (
          <>
            <OptionButton
              icon={Home}
              title="Homeowner"
              subtitle="I need help with tasks around my home"
              onClick={() => onSelect("homeowner")}
            />

            <OptionButton
              icon={UserCircle}
              title="Jobseeker / Professional"
              subtitle="I'm looking for work opportunities"
              onClick={() => onSelect("jobseeker")}
            />
          </>
        ) : (
          <>
            <OptionButton
              icon={Briefcase}
              title="Employer / Company"
              subtitle="I want to hire employees or professionals"
              onClick={() => onSelect("employer")}
            />

            <OptionButton
              icon={HardHat}
              title="Trade / Contractor"
              subtitle="I'm a tradesperson or contractor business"
              onClick={() => onSelect("contractor")}
            />
          </>
        )}
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
