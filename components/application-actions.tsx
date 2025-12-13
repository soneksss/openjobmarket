"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface ApplicationActionsProps {
  applicationId: string
  currentStatus: string
  professionalUserId: string
  companyUserId: string
  applicantEmail?: string
  applicantName?: string
  jobTitle?: string
}

export default function ApplicationActions({
  applicationId,
  currentStatus,
  professionalUserId,
  companyUserId,
  applicantEmail,
  applicantName,
  jobTitle,
}: ApplicationActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    try {
      // Update application status
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", applicationId)

      if (error) throw error

      // Show success toast based on action
      const statusMessages: Record<string, { title: string; description: string }> = {
        reviewed: { title: "✓ Marked as Reviewed", description: "Application has been marked as reviewed." },
        interview: { title: "✓ Interview Scheduled", description: "Application has been moved to interview stage." },
        accepted: { title: "✓ Application Accepted", description: "Applicant has been accepted for the position." },
        rejected: { title: "Application Rejected", description: "Applicant has been notified of the decision." },
      }

      if (statusMessages[newStatus]) {
        toast({
          title: statusMessages[newStatus].title,
          description: statusMessages[newStatus].description,
          duration: 5000,
        })
      }

      // Create dashboard notification for the applicant
      try {
        const notificationMessage = newStatus === "accepted"
          ? `Congratulations! Your application for "${jobTitle || 'the position'}" has been accepted!`
          : newStatus === "rejected"
          ? `Your application for "${jobTitle || 'the position'}" has been reviewed.`
          : newStatus === "interview"
          ? `Great news! You've been invited to interview for "${jobTitle || 'the position'}".`
          : `Your application status has been updated to "${newStatus}".`

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: professionalUserId,
            type: "application_status_change",
            title: "Application Status Update",
            message: notificationMessage,
            link: `/applications/${applicationId}`,
            is_read: false,
          })

        if (notificationError) {
          console.error("[APPLICATION-ACTIONS] Failed to create notification:", notificationError)
        } else {
          console.log("[APPLICATION-ACTIONS] Dashboard notification created successfully")
        }
      } catch (notifError) {
        console.error("[APPLICATION-ACTIONS] Notification creation failed:", notifError)
      }

      // Send email notification if applicant email is available
      if (applicantEmail && jobTitle) {
        try {
          await fetch("/api/notifications/application-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicantEmail,
              applicantName: applicantName || "Applicant",
              jobTitle,
              status: newStatus,
            }),
          })
          console.log("[APPLICATION-ACTIONS] Email notification sent successfully")
        } catch (emailError) {
          console.error("[APPLICATION-ACTIONS] Email notification failed:", emailError)
          // Don't block the operation if email fails
        }
      }

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
      toast({
        title: "Update Failed",
        description: "Failed to update application status. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
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
