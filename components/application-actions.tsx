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
  jobBudget?: string // Optional budget/salary display string
  jobId?: string // Job ID for linking
}

export default function ApplicationActions({
  applicationId,
  currentStatus,
  professionalUserId,
  companyUserId,
  applicantEmail,
  applicantName,
  jobTitle,
  jobBudget,
  jobId,
}: ApplicationActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    let updateSucceeded = false

    try {
      // Update application status
      const { error } = await supabase
        .from("job_applications")
        .update({ status: newStatus })
        .eq("id", applicationId)

      if (error) {
        // Handle specific Supabase errors
        if (error.message?.includes('fetch') || error.message?.includes('JWT')) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        }
        throw error
      }

      updateSucceeded = true

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
            link_url: `/applications/${applicationId}`,
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

      // Send email notification if applicant email is available (with timeout)
      if (applicantEmail && jobTitle) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

          await fetch("/api/notifications/application-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicantEmail,
              applicantName: applicantName || "Applicant",
              jobTitle,
              status: newStatus,
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          console.log("[APPLICATION-ACTIONS] Email notification sent successfully")
        } catch (emailError: any) {
          console.error("[APPLICATION-ACTIONS] Email notification failed:", emailError)
          if (emailError.name === 'AbortError') {
            console.warn("[APPLICATION-ACTIONS] Email notification timed out")
          }
          // Don't block the operation if email fails
        }
      }

      // If accepting application, verify interaction for reviews (with timeout)
      if (newStatus === "accepted") {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

          await fetch("/api/reviews/verify-interaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userBId: professionalUserId,
              interactionType: "job_application_accepted",
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          console.log("[APPLICATION-ACTIONS] Interaction verified for reviews")
        } catch (verifyError: any) {
          console.error("[APPLICATION-ACTIONS] Failed to verify interaction:", verifyError)
          if (verifyError.name === 'AbortError') {
            console.warn("[APPLICATION-ACTIONS] Review verification timed out")
          }
          // Don't fail the entire operation if review verification fails
        }

        // Send automatic system message to start the conversation
        try {
          const budgetText = jobBudget ? ` (${jobBudget})` : ''
          const messageContent = `🎉 Congratulations! Your application for the job "${jobTitle || 'the position'}"${budgetText} has been accepted!\n\nPlease reply to discuss further details and arrange the next steps.`

          const { error: messageError } = await supabase
            .from('messages')
            .insert({
              sender_id: companyUserId,
              recipient_id: professionalUserId,
              subject: `Application Accepted: ${jobTitle || 'Job Position'}`,
              content: messageContent,
              message_type: 'direct',
              job_id: jobId || null,
              is_read: false
            })

          if (messageError) {
            console.error("[APPLICATION-ACTIONS] Failed to send acceptance message:", messageError)
          } else {
            console.log("[APPLICATION-ACTIONS] Acceptance message sent successfully")
          }
        } catch (msgError) {
          console.error("[APPLICATION-ACTIONS] Error sending acceptance message:", msgError)
          // Don't fail the operation if message sending fails
        }
      }

      // If accepting, navigate to messages to discuss details
      if (newStatus === "accepted") {
        console.log("[APPLICATION-ACTIONS] Acceptance successful, opening messages...")
        setTimeout(() => {
          try {
            // Navigate to messages with the applicant
            router.push(`/messages/${professionalUserId}`)
          } catch (pushError) {
            console.error("[APPLICATION-ACTIONS] Router push failed:", pushError)
            // Fallback to direct navigation
            window.location.href = `/messages/${professionalUserId}`
          }
        }, 1500)
      } else {
        // For other status changes, just refresh
        setTimeout(() => {
          try {
            router.refresh()
          } catch (refreshError) {
            console.error("[APPLICATION-ACTIONS] Router refresh failed:", refreshError)
            window.location.reload()
          }
        }, 1500)
      }
    } catch (error: any) {
      console.error("[APPLICATION-ACTIONS] Error updating status:", error)

      // Provide specific error messages based on error type
      let errorMessage = "Failed to update application status. Please try again."

      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('DISCONNECTED')) {
        errorMessage = "Network connection issue. Please check your connection and try again."
      } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        errorMessage = "Session expired. Please refresh the page and try again."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      // CRITICAL: Always clear loading state, even if update succeeded
      // This prevents the button from staying stuck if router.refresh() or window.reload() fails
      if (!updateSucceeded) {
        setLoading(false)
      } else {
        // If update succeeded, clear loading after a delay to prevent stuck state
        setTimeout(() => {
          setLoading(false)
        }, 3000)
      }
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
