"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, UserCheck, Check, MessageCircle, FileText } from "lucide-react"
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
import { PostConfirmAgreementModal, isAgreementModalDismissed, markAgreementModalDismissed } from "./post-confirm-agreement-modal"
import { AgreementEditorModal, loadSavedAgreement } from "./agreement-editor-modal"

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
  budgetMin?: number
  budgetMax?: number
  homeownerUserId?: string // The homeowner's user_id for sending messages
  contractorUserId?: string | null // The tradesperson's auth user_id for messaging
  // Agreement defaults for pre-filling editor
  homeownerName?: string
  homeownerAddress?: string
  tradespersonAddress?: string
  jobAddress?: string
  jobDescription?: string
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
  budgetMin,
  budgetMax,
  homeownerUserId,
  contractorUserId,
  homeownerName,
  homeownerAddress,
  tradespersonAddress,
  jobAddress,
  jobDescription,
}: HomeownerApplicationActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [messagingLoading, setMessagingLoading] = useState(false)
  const [showAgreementModal, setShowAgreementModal] = useState(false)
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [agreementSaved, setAgreementSaved] = useState(false)

  // Check on mount if a saved agreement exists for this job
  useEffect(() => {
    setAgreementSaved(!!loadSavedAgreement(jobId))
  }, [jobId])

  const openMessagesWithUser = async (targetUserId: string) => {
    setMessagingLoading(true)
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ with_user_id: targetUserId, job_id: jobId }),
      })
      const data = await res.json()
      if (!res.ok || !data.conversationId) throw new Error(data.error || "Failed to open conversation")
      router.push(`/messages/${data.conversationId}`)
    } catch (err: any) {
      toast({ title: "Could not open messages", description: err.message, variant: "destructive" })
    } finally {
      setMessagingLoading(false)
    }
  }

  const isThisContractorAccepted = acceptedContractorId === contractorId

  const handleAccept = async () => {
    // Guard: prevent double-acceptance if job is already confirmed
    if (isJobAlreadyAccepted) {
      toast({
        title: "Already confirmed",
        description: "A tradesperson has already been confirmed for this job.",
      })
      setShowAcceptDialog(false)
      return
    }

    setLoading(true)

    try {
      // ── State machine: atomically confirm the tradesperson ──
      const { error: rpcError } = await supabase.rpc("confirm_tradesperson", {
        p_job_id:          jobId,
        p_tradesperson_id: contractorId,
      })

      if (rpcError) {
        if (rpcError.message?.includes("fetch") || rpcError.message?.includes("JWT")) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        }
        throw rpcError
      }

      // Look up contractor's user_id for the chat message
      const { data: contractorData } = await supabase
        .from("company_profiles")
        .select("user_id")
        .eq("id", contractorId)
        .single()

      toast({
        title: "✅ Tradesperson Confirmed",
        description: `${contractorName} has been confirmed.`,
      })

      setShowAcceptDialog(false)

      // Show agreement modal for jobs over £500 (if not already dismissed)
      const effectiveBudget = budgetMax ?? budgetMin ?? 0
      if (effectiveBudget >= 500 && !isAgreementModalDismissed(jobId)) {
        setShowAgreementModal(true)
      }

      // Send a short system message to open the conversation
      if (contractorData?.user_id && homeownerUserId) {
        try {
          const budgetLine = jobBudget ? `\n${jobTitle || "Trade job"} (${jobBudget})` : `\n${jobTitle || "Trade job"}`
          const messageContent = `Application accepted${budgetLine}\nYou've been selected for this job. Arrange details with the homeowner.`

          await supabase.from("messages").insert({
            sender_id:    homeownerUserId,
            recipient_id: contractorData.user_id,
            subject:      `Application Accepted: ${jobTitle || "Trade Job"}`,
            content:      messageContent,
            message_type: "direct",
            job_id:       jobId,
            is_read:      false,
          })
        } catch (msgError) {
          console.error("[HOMEOWNER-ACTIONS] Error sending acceptance message:", msgError)
        }
      }

      // Navigate to the conversation (use real conv ID, not user ID)
      router.refresh()
      if (contractorData?.user_id) {
        setTimeout(() => openMessagesWithUser(contractorData.user_id), 800)
      }
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
      // Delete the application — removes it from the list immediately
      const { error } = await supabase
        .from("job_applications")
        .delete()
        .eq("id", applicationId)

      if (error) {
        if (error.message?.includes('fetch') || error.message?.includes('JWT')) {
          throw new Error("Authentication error. Please refresh the page and try again.")
        }
        throw error
      }

      toast({
        title: "Application Removed",
        description: `${contractorName}'s application has been removed.`,
      })

      setTimeout(() => {
        try {
          router.refresh()
        } catch {
          window.location.reload()
        }
      }, 500)
    } catch (error: any) {
      console.error("[HOMEOWNER-ACTIONS] Error rejecting application:", error)

      let errorMessage = "Failed to remove application. Please try again."
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('DISCONNECTED')) {
        errorMessage = "Network connection issue. Please check your connection and try again."
      } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        errorMessage = "Session expired. Please refresh the page and try again."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "❌ Failed to Remove",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const agreementDefaults = {
    homeownerName,
    homeownerAddress,
    tradespersonName: contractorName,
    tradespersonAddress,
    jobTitle,
    jobAddress,
    jobDescription,
    agreedPrice: jobBudget,
    paymentType: "",
  }

  // Don't show accept/reject buttons if already accepted/confirmed or withdrawn
  const statusLower = currentStatus?.toLowerCase()
  if (statusLower === "accepted" || statusLower === "confirmed" ||
      statusLower === "auto_cancelled" || statusLower === "withdrawn") {
    return null
  }

  // This contractor was confirmed — show arrange-visit CTA
  if (isThisContractorAccepted) {
    return (
      <>
        <div className="mt-1 space-y-2">
          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
            Confirmed — Arrange visit
          </p>
          <p className="text-xs text-slate-400">
            You&apos;ve accepted this tradesperson. Arrange time and details.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {contractorUserId && (
              <button
                onClick={() => openMessagesWithUser(contractorUserId)}
                disabled={messagingLoading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {messagingLoading ? "Opening…" : "Message tradesperson"}
              </button>
            )}
            <button
              onClick={() => setShowEditorModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              {agreementSaved ? "Agreement" : "Make Agreement"}
            </button>
          </div>
        </div>

        <PostConfirmAgreementModal
          isOpen={showAgreementModal}
          onClose={() => {
            markAgreementModalDismissed(jobId)
            setShowAgreementModal(false)
          }}
          onMakeAgreement={() => {
            markAgreementModalDismissed(jobId)
            setShowAgreementModal(false)
            setShowEditorModal(true)
          }}
          jobId={jobId}
        />

        <AgreementEditorModal
          isOpen={showEditorModal}
          onClose={() => setShowEditorModal(false)}
          jobId={jobId}
          defaults={agreementDefaults}
          onSaved={() => setAgreementSaved(true)}
        />
      </>
    )
  }

  if (isJobAlreadyAccepted && !isThisContractorAccepted) {
    return (
      <p className="text-xs text-slate-500 italic">
        Another tradesperson has been confirmed
      </p>
    )
  }

  return (
    <>
      <PostConfirmAgreementModal
        isOpen={showAgreementModal}
        onClose={() => {
          markAgreementModalDismissed(jobId)
          setShowAgreementModal(false)
        }}
        onMakeAgreement={() => {
          markAgreementModalDismissed(jobId)
          setShowAgreementModal(false)
          setShowEditorModal(true)
        }}
        jobId={jobId}
      />

      <AgreementEditorModal
        isOpen={showEditorModal}
        onClose={() => setShowEditorModal(false)}
        jobId={jobId}
        defaults={agreementDefaults}
        onSaved={() => setAgreementSaved(true)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setShowAcceptDialog(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 h-auto rounded-lg"
        >
          <CheckCircle className="h-4 w-4" />
          Confirm
        </Button>
        <Button
          variant="outline"
          onClick={handleReject}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-semibold border-red-500/40 text-red-400 hover:bg-red-500/15 hover:text-red-300 bg-transparent px-4 py-2 h-auto rounded-lg"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </div>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent className="bg-slate-900 border border-slate-700 text-white shadow-2xl shadow-black/60 max-w-md p-0 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />

          <div className="p-6">
            <AlertDialogHeader className="items-center text-center sm:text-center">
              {/* Icon */}
              <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <UserCheck className="h-7 w-7 text-emerald-400" />
              </div>

              <AlertDialogTitle className="text-xl font-bold text-white">
                Accept Contractor?
              </AlertDialogTitle>

              <AlertDialogDescription asChild>
                <div className="text-slate-400 text-sm mt-1">
                  <p>
                    You&apos;re about to confirm{" "}
                    <span className="font-semibold text-white">{contractorName}</span>{" "}
                    for this job.
                  </p>

                  <div className="mt-4 space-y-2 text-left">
                    {[
                      "This contractor will be marked as accepted",
                      "All other applications will be automatically rejected",
                      "You can mark the job as completed once the work is done",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <div className="mt-0.5 h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                        </div>
                        <span className="text-slate-300 text-xs leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-6 gap-3 sm:gap-3">
              <AlertDialogCancel
                disabled={loading}
                className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-900/40 font-semibold"
              >
                {loading ? "Accepting…" : "Confirm Contractor"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
