"use client"
import { Suspense } from "react"
import JobWizardModal from "./job-wizard-modal"

type Props = {
  companyProfile: any
  userType: "company" | "homeowner"
}

export default function NewJobModalClient({ companyProfile, userType }: Props) {
  console.log("[v0] NewJobModalClient rendering with profile:", companyProfile?.company_name)

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading job posting form...</p>
          </div>
        </div>
      }
    >
      <JobWizardModal companyProfile={companyProfile} userType={userType} />
    </Suspense>
  )
}
