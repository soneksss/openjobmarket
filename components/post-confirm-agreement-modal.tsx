"use client"

import { X, FileText, Shield } from "lucide-react"

interface PostConfirmAgreementModalProps {
  isOpen: boolean
  onClose: () => void
  onMakeAgreement: () => void
  jobId: string
}

const STORAGE_KEY = (jobId: string) => `ojm_agreement_dismissed_${jobId}`

export function markAgreementModalDismissed(jobId: string) {
  try { localStorage.setItem(STORAGE_KEY(jobId), "1") } catch {}
}

export function isAgreementModalDismissed(jobId: string): boolean {
  try { return !!localStorage.getItem(STORAGE_KEY(jobId)) } catch { return false }
}

export function PostConfirmAgreementModal({ isOpen, onClose, onMakeAgreement, jobId }: PostConfirmAgreementModalProps) {
  if (!isOpen) return null

  const handleDismiss = () => {
    markAgreementModalDismissed(jobId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-400" />

        {/* Close icon */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <Shield className="h-7 w-7 text-blue-400" />
          </div>

          <p className="text-lg font-bold text-white mb-3">
            Protect this job with a simple agreement
          </p>

          <p className="text-sm text-slate-300 leading-relaxed">
            For jobs over £500, we recommend creating a simple pre-filled agreement.
            It helps both homeowner and tradesperson avoid misunderstandings about price,
            scope, materials, timing, and payment.
          </p>

          <p className="text-xs text-slate-500 mt-2">
            You can edit all details before printing or saving.
          </p>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={onMakeAgreement}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Make Agreement
          </button>
        </div>
      </div>
    </div>
  )
}
