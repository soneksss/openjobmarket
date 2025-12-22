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
}

export function HomeownerApplicationActions({
  applicationId,
  contractorId,
  contractorName,
  jobId,
  currentStatus,
  isJobAlreadyAccepted,
  acceptedContractorId,
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
          completion_status: 'accepted'
        })
        .eq("id", jobId)

      if (jobError) throw jobError

      toast({
        title: "✅ Contractor Accepted",
        description: `${contractorName} has been accepted for this job.`,
      })

      router.refresh()
      setShowAcceptDialog(false)
    } catch (error: any) {
      console.error("Error accepting contractor:", error)
      toast({
        title: "❌ Failed to Accept",
        description: error.message || "Failed to accept contractor. Please try again.",
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

      if (error) throw error

      toast({
        title: "Application Rejected",
        description: `${contractorName}'s application has been rejected.`,
      })

      router.refresh()
    } catch (error: any) {
      console.error("Error rejecting application:", error)
      toast({
        title: "❌ Failed to Reject",
        description: error.message || "Failed to reject application. Please try again.",
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
            <AlertDialogDescription>
              Are you sure you want to accept <strong>{contractorName}</strong> for this job?
              <br />
              <br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Mark this contractor as accepted</li>
                <li>Automatically reject all other applications</li>
                <li>Allow you to mark the job as completed once work is done</li>
              </ul>
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
