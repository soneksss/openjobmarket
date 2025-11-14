"use client"

import { useState } from "react"
import { OnboardingFlow } from "./OnboardingFlow"
import { X, MapPin, Briefcase } from "lucide-react"

interface OnboardingModalProps {
  action: "provider" | "hiring"
}

export function OnboardingModal({ action }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  const buttonConfig = {
    provider: {
      icon: MapPin,
      title: "Put Me on the Market",
      subtitle: "I'm looking for work or want to offer my services",
      gradient: "from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
    },
    hiring: {
      icon: Briefcase,
      title: "Post Jobs",
      subtitle: "I want to hire people or find professionals",
      gradient: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
    }
  }

  const config = buttonConfig[action]
  const Icon = config.icon

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex-1 sm:flex-none px-8 py-6 bg-gradient-to-r ${config.gradient} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group`}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="text-lg md:text-xl">{config.title}</span>
        </div>
        <p className="text-sm text-white/90 text-center">{config.subtitle}</p>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            <OnboardingFlow
              onClose={() => setIsOpen(false)}
              initialAction={action}
            />
          </div>
        </div>
      )}
    </>
  )
}
