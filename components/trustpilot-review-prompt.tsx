"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { createClient } from "@/lib/client"

const TRUSTPILOT_URL = "https://uk.trustpilot.com/review/openjobmarket.com"

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Profile row id whose `first_review_prompt_shown` flag we set on open. */
  profileId: string
  /** Which profile table that id belongs to. Defaults to homeowner_profiles. */
  profileTable?: "homeowner_profiles" | "company_profiles"
}

type Step = "ask" | "positive" | "negative"

export function TrustpilotReviewPrompt({ isOpen, onClose, profileId, profileTable = "homeowner_profiles" }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>("ask")

  // Mark as shown the moment it opens, regardless of how it's dismissed —
  // "shown" means shown, not "the user picked a button."
  useEffect(() => {
    if (!isOpen) return
    supabase.from(profileTable)
      .update({ first_review_prompt_shown: true })
      .eq("id", profileId)
      .then(() => {})
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setStep("ask")
    onClose()
  }

  const handleLeaveReview = () => {
    window.open(TRUSTPILOT_URL, "_blank", "noopener,noreferrer")
    handleClose()
  }

  const handleSendFeedback = () => {
    handleClose()
    router.push("/contact")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "ask" && (
          <div className="px-6 pt-8 pb-6 text-center">
            <p className="text-xl font-bold text-white mb-6">Are you happy with Open Job Market?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setStep("positive")}
                className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl bg-slate-800 border border-slate-700 hover:border-emerald-500/60 hover:bg-slate-800/80 transition-colors"
              >
                <span className="text-4xl">😊</span>
                <span className="text-sm font-semibold text-white">Yes</span>
              </button>
              <button
                onClick={() => setStep("negative")}
                className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-800/80 transition-colors"
              >
                <span className="text-4xl">😐</span>
                <span className="text-sm font-semibold text-white">Not really</span>
              </button>
            </div>
          </div>
        )}

        {step === "positive" && (
          <div className="px-6 pt-6 pb-6 text-center">
            <p className="text-lg font-bold text-white mb-2">That's fantastic! 🎉</p>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Would you mind leaving us a quick review on Trustpilot?
              <br />
              Your feedback helps us grow and helps other people discover Open Job Market.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLeaveReview}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                Leave a Review
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

        {step === "negative" && (
          <div className="px-6 pt-6 pb-6 text-center">
            <p className="text-lg font-bold text-white mb-2">Thank you for your feedback.</p>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              We're always improving. If there's anything we can do better, please let us know.
            </p>
            <button
              onClick={handleSendFeedback}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              Send Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
