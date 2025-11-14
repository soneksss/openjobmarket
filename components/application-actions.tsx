"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

interface ApplicationActionsProps {
  applicationId: string
  currentStatus: string
  professionalUserId: string
  companyUserId: string
}

export default function ApplicationActions({
  applicationId,
  currentStatus,
  professionalUserId,
  companyUserId,
}: ApplicationActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    try {
      // Update application status
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", applicationId)

      if (error) throw error

      // If accepting application, verify interaction for reviews
      if (newStatus === "accepted") {
        try {
          await fetch("/api/reviews/verify-interaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userBId: professionalUserId,
              interactionType: "job_application_accepted",
            }),
          })
          console.log("[APPLICATION-ACTIONS] Interaction verified for reviews")
        } catch (verifyError) {
          console.error("[APPLICATION-ACTIONS] Failed to verify interaction:", verifyError)
          // Don't fail the entire operation if review verification fails
        }
      }

      router.refresh()
    } catch (error) {
      console.error("[APPLICATION-ACTIONS] Error updating status:", error)
      alert("Failed to update application status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {currentStatus === "pending" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatus("reviewed")}
            disabled={loading}
          >
            Mark as Reviewed
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => updateStatus("interview")}
            disabled={loading}
          >
            Schedule Interview
          </Button>
        </>
      )}
      {(currentStatus === "pending" || currentStatus === "reviewed" || currentStatus === "interview") && (
        <>
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => updateStatus("accepted")}
            disabled={loading}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => updateStatus("rejected")}
            disabled={loading}
          >
            Reject
          </Button>
        </>
      )}
      {currentStatus === "accepted" && (
        <Button size="sm" variant="outline" disabled>
          Accepted
        </Button>
      )}
      {currentStatus === "rejected" && (
        <Button size="sm" variant="outline" disabled>
          Rejected
        </Button>
      )}
    </div>
  )
}
