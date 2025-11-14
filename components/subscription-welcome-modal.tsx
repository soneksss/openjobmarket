"use client"

import { useState, useEffect } from "react"
import { X, Gift, Briefcase, Users, TrendingUp, CheckCircle, Eye, UserCheck, Star, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/client"

type SubscriptionWelcomeModalProps = {
  userId: string
  userType: "professional" | "company"
  onClose?: () => void
}

export default function SubscriptionWelcomeModal({
  userId,
  userType,
  onClose,
}: SubscriptionWelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    checkForWelcomeMessage()
  }, [userId])

  const checkForWelcomeMessage = async () => {
    try {
      console.log("[WELCOME-MODAL] Checking for welcome message for user:", userId)

      // Check localStorage first to avoid showing modal multiple times
      const hasSeenWelcome = localStorage.getItem(`welcome_shown_${userId}`)
      if (hasSeenWelcome === 'true') {
        console.log("[WELCOME-MODAL] User has already seen welcome message (localStorage)")
        setLoading(false)
        return
      }

      // Check if user should see the welcome message
      const { data: shouldShow, error: shouldShowError } = await supabase
        .rpc("should_show_welcome_message", { user_id_param: userId })

      if (shouldShowError) {
        console.error("[WELCOME-MODAL] Error checking welcome message:", shouldShowError)
        // If function doesn't exist yet (SQL not run), just hide modal
        if (shouldShowError.code === 'PGRST202') {
          console.log("[WELCOME-MODAL] SQL functions not set up yet, skipping welcome modal")
        }
        setLoading(false)
        return
      }

      console.log("[WELCOME-MODAL] Should show welcome:", shouldShow)

      if (shouldShow) {
        // Get the welcome message
        const { data: message, error: messageError } = await supabase
          .rpc("get_user_welcome_message", { user_id_param: userId })

        if (messageError) {
          console.error("[WELCOME-MODAL] Error getting welcome message:", messageError)
          setLoading(false)
          return
        }

        console.log("[WELCOME-MODAL] Welcome message:", message)
        setWelcomeMessage(message)
        setIsOpen(true)
      }

      setLoading(false)
    } catch (err) {
      console.error("[WELCOME-MODAL] Exception checking welcome message:", err)
      setLoading(false)
    }
  }

  const handleClose = async () => {
    // Close modal immediately for better UX
    setIsOpen(false)

    // Mark as shown in localStorage
    localStorage.setItem(`welcome_shown_${userId}`, 'true')
    console.log("[WELCOME-MODAL] Marked welcome as shown in localStorage")

    try {
      // Mark the welcome message as shown (non-blocking)
      await supabase.rpc("mark_welcome_message_shown", { user_id_param: userId })
      console.log("[WELCOME-MODAL] Marked welcome message as shown in database")
    } catch (err) {
      console.error("[WELCOME-MODAL] Error marking welcome as shown:", err)
      // Silently fail - modal is already closed and localStorage is set
    }

    if (onClose) {
      onClose()
    }
  }

  if (loading || !isOpen || !welcomeMessage) {
    return null
  }

  const isCompany = userType === "company"
  const isProfessional = userType === "professional"

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-white dark:bg-slate-900 p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              🎉 Congratulations!
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400">
              {isProfessional
                ? "You've been upgraded to a 3-month premium subscription!"
                : "You now have a free 3-month subscription!"
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Features - Simple list */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isProfessional
                ? "Your premium subscription includes:"
                : "With your subscription, you can:"
              }
            </p>

            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {isCompany ? (
                <>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Post unlimited jobs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Contact unlimited people</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Priority listing in search results</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>"Actively Looking" toggle</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Bold profile name in search results</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Priority search ranking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Green visibility indicator</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Enhanced profile features</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Duration notice */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your Premium subscription is active for <strong>3 months</strong>. After that, you'll be moved to the free {isProfessional ? "Basic" : "Starter"} plan.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
