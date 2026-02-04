"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface HomeownerApplicationActionsProps {
  applicationId: string
  contractorId: string
  contractorName: string
  jobId: string
  currentStatus: string
  isJobAlreadyAccepted: boolean
  acceptedContractorId: string | null
  jobTitle?: string
  jobBudget?: string // Budget display string (e.g., "£500 - £1000")
  homeownerUserId?: string // The homeowner's user_id for sending messages
}

export function HomeownerApplicationActions({
  applicationId,
  contractorId,
  contractorName,
  jobId,
  currentStatus,
  isJobAlreadyAccepted,
  acceptedContractorId,
  jobTitle,
  jobBudget,
  homeownerUserId,
}: HomeownerApplicationActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)

  const isThisContractorAccepted = acceptedContractorId === contractorId

  const handleAccept = async () => {
    setLoading(true)

    try {
      // Update the job to set this contractor as accepted
      const { error: jobError } = await supabase
        .from("jobs")
        .update({
          accepted_contractor_id: contractorId,
          completion_status: 'accepted',
          status: 'accepted' // Hide from map when accepted
        })
        .eq("id", jobId)

      if (jobError) {
        // Handle specific Supabase errors
        if (jobError.message?.includes('fetch') || jobError.message?.includes('JWT')) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        }
        throw jobError
      }

      // Update this application to accepted
      const { error: acceptError } = await supabase
        .from("job_applications")
        .update({ status: "accepted" })
        .eq("id", applicationId)

      if (acceptError) {
        if (acceptError.message?.includes('fetch') || acceptError.message?.includes('JWT')) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        }
        throw acceptError
      }

      // Reject all other applications for this job
      const { error: rejectError } = await supabase
        .from("job_applications")
        .update({ status: "rejected" })
        .eq("job_id", jobId)
        .neq("id", applicationId)

      if (rejectError) {
        console.error("[HOMEOWNER-ACTIONS] Failed to reject other applications:", rejectError)
        // Don't fail the entire operation if rejecting others fails
      }

      // Get contractor's user_id for messaging
      const { data: contractorData } = await supabase
        .from("professional_profiles")
        .select("user_id")
        .eq("id", contractorId)
        .single()

      toast({
        title: "✅ Contractor Accepted",
        description: `${contractorName} has been accepted for this job.`,
      })

      setShowAcceptDialog(false)

      // Create notification for the contractor
      if (contractorData?.user_id) {
        try {
          const notificationMessage = `🎉 Congratulations! Your application for "${jobTitle || 'the trade job'}"${jobBudget ? ` (budget: ${jobBudget})` : ''} has been accepted!`

          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: contractorData.user_id,
              type: "application_status_change",
              title: "Application Accepted!",
              message: notificationMessage,
              link_url: `/applications/${applicationId}`,
              is_read: false,
            })

          if (notificationError) {
            console.error("[HOMEOWNER-ACTIONS] Failed to create notification:", notificationError)
          } else {
            console.log("[HOMEOWNER-ACTIONS] Dashboard notification created successfully")
          }
        } catch (notifError) {
          console.error("[HOMEOWNER-ACTIONS] Notification creation failed:", notifError)
        }

        // Send automatic system message to start the conversation
        if (homeownerUserId) {
          try {
            const budgetText = jobBudget ? ` (budget: ${jobBudget})` : ''
            const messageContent = `🎉 Congratulations! Your application for the job "${jobTitle || 'the trade job'}"${budgetText} has been accepted!\n\nPlease reply to discuss further details and arrange the next steps.`

            const { error: messageError } = await supabase
              .from('messages')
              .insert({
                sender_id: homeownerUserId,
                recipient_id: contractorData.user_id,
                subject: `Application Accepted: ${jobTitle || 'Trade Job'}`,
                content: messageContent,
                message_type: 'direct',
                job_id: jobId,
                is_read: false
              })

            if (messageError) {
              console.error("[HOMEOWNER-ACTIONS] Failed to send acceptance message:", messageError)
            } else {
              console.log("[HOMEOWNER-ACTIONS] Acceptance message sent successfully")
            }
          } catch (msgError) {
            console.error("[HOMEOWNER-ACTIONS] Error sending acceptance message:", msgError)
          }
        }
      }

      console.log("[HOMEOWNER-ACTIONS] Acceptance successful, opening messages...")

      // Use setTimeout to ensure toast is visible before navigation
      setTimeout(() => {
        try {
          if (contractorData?.user_id) {
            router.push(`/messages/${contractorData.user_id}`)
          } else {
            // Fallback to refresh if we can't get user_id
            console.error("[HOMEOWNER-ACTIONS] No user_id found for contractor")
            router.refresh()
          }
        } catch (pushError) {
          console.error("[HOMEOWNER-ACTIONS] Router push failed:", pushError)
          // Fallback to direct navigation
          if (contractorData?.user_id) {
            window.location.href = `/messages/${contractorData.user_id}`
          } else {
            window.location.reload()
          }
        }
      }, 1500)
    } catch (error: any) {
      console.error("[HOMEOWNER-ACTIONS] Error accepting contractor:", error)

      // Provide specific error messages based on error type
      let errorMessage = "Failed to accept contractor. Please try again."

      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('DISCONNECTED')) {
        errorMessage = "Network connection issue. Please check your connection and try again."
      } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        errorMessage = "Session expired. Please refresh the page and try again."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "❌ Failed to Accept",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)

    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: "rejected" })
        .eq("id", applicationId)

      if (error) {
        // Handle specific Supabase errors
        if (error.message?.includes('fetch') || error.message?.includes('JWT')) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        }
        throw error
      }

      toast({
        title: "Application Rejected",
        description: `${contractorName}'s application has been rejected.`,
      })

      // Use setTimeout to ensure toast is visible before refresh
      setTimeout(() => {
        try {
          router.refresh()
        } catch (refreshError) {
          console.error("[HOMEOWNER-ACTIONS] Router refresh failed:", refreshError)
          // Fallback to reload if router.refresh() fails
          window.location.reload()
        }
      }, 1000)
    } catch (error: any) {
      console.error("[HOMEOWNER-ACTIONS] Error rejecting application:", error)

      // Provide specific error messages based on error type
      let errorMessage = "Failed to reject application. Please try again."

      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('DISCONNECTED')) {
        errorMessage = "Network connection issue. Please check your connection and try again."
      } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        errorMessage = "Session expired. Please refresh the page and try again."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "❌ Failed to Reject",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Don't show accept/reject buttons if already accepted/rejected or if another contractor is accepted
  if (currentStatus === "accepted" || currentStatus === "rejected") {
    return null
  }

  if (isJobAlreadyAccepted && !isThisContractorAccepted) {
    return (
      <p className="text-sm text-gray-500 italic">
        Another contractor has been accepted for this job
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-col space-y-2">
        <Button
          size="sm"
          onClick={() => setShowAcceptDialog(true)}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Accept Contractor
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={loading}
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </div>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Contractor?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span>Are you sure you want to accept <strong>{contractorName}</strong> for this job?</span>
                <div className="mt-3">This will:</div>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Mark this contractor as accepted</li>
                  <li>Automatically reject all other applications</li>
                  <li>Allow you to mark the job as completed once work is done</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Accepting..." : "Yes, Accept Contractor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
