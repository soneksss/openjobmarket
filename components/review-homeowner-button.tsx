"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import ReviewSubmissionModal from "@/components/review-submission-modal"

interface ReviewHomeownerButtonProps {
  jobId: string
  jobTitle: string
  homeownerUserId: string
  homeownerName: string
}

export function ReviewHomeownerButton({
  jobId,
  jobTitle,
  homeownerUserId,
  homeownerName,
}: ReviewHomeownerButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-400 hover:text-amber-300 transition-colors"
      >
        <Star className="w-3.5 h-3.5" />
        Review
      </button>

      <ReviewSubmissionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        jobId={jobId}
        jobTitle={jobTitle}
        reviewedUserId={homeownerUserId}
        reviewedUserName={homeownerName}
        reviewedUserType="homeowner"
        reviewerType="company"
        onSuccess={() => setOpen(false)}
      />
    </>
  )
}
