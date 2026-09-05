"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import {
  type OwnerVerification,
  type VerificationType,
  VERIFICATION_LABELS,
  itemStatusLabel,
  itemStatusPill,
} from "@/lib/verification"

/**
 * "Verification" section for the Edit Company Profile page.
 *
 * Completely self-contained — it fetches and submits through its own API and
 * never touches the parent form's state or save flow. Removing this component
 * leaves the rest of the profile editing behaviour exactly as it was.
 *
 * Verification is optional. A tradesperson can use the whole marketplace
 * without it; this just adds trust signals homeowners can see.
 */
export function CompanyVerificationSection() {
  const [data, setData] = useState<
    (OwnerVerification & { hasInsuranceDoc: boolean; isLimitedCompany: boolean; hasRegNumber: boolean }) | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch("/api/company/verification", { credentials: "include" })
      if (res.ok) setData(await res.json())
    } catch {
      /* leave data null — section stays hidden, profile editing unaffected */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/company/verification", { method: "POST", credentials: "include" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          body.error === "already_pending"
            ? "You already have a verification request under review."
            : body.error ?? "Could not submit. Please try again.",
        )
      } else {
        setConfirming(false)
        await load()
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Fail-safe: if the fetch failed entirely, render nothing rather than a broken box.
  if (!loading && !data) return null

  const isPending = data?.status === "pending"
  const isVerified = data?.status === "verified"
  const wasRejected = data?.status === "rejected"

  // Which categories are eligible to be reviewed.
  const categories: VerificationType[] = ["business"]
  if (data?.isLimitedCompany && data?.hasRegNumber) categories.push("company_registration")
  categories.push("insurance")

  const itemFor = (type: VerificationType) => data?.items.find((i) => i.type === type)

  return (
    <div className="space-y-4 pt-6 border-t border-slate-700/50">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-400" />
        <h3 className="text-base font-semibold text-white">
          Verification <span className="text-slate-500 text-sm font-normal">(Optional)</span>
        </h3>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">Build trust with homeowners</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Verified information can help homeowners feel more confident when choosing your business.
          You can keep using OpenJobMarket normally whether or not you're verified.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading verification status…
        </div>
      ) : (
        <>
          {/* Per-category status */}
          <div className="space-y-2">
            {categories.map((type) => {
              const item = itemFor(type)
              const status = item?.status ?? "not_verified"
              return (
                <div
                  key={type}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white">{VERIFICATION_LABELS[type]}</p>
                    {type === "insurance" && item?.expires_at && status === "verified" && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cover to {new Date(item.expires_at).toLocaleDateString("en-GB")}
                      </p>
                    )}
                    {type === "insurance" && status === "expired" && (
                      <p className="text-[11px] text-orange-400 mt-0.5">Cover has expired — upload a current certificate</p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${itemStatusPill(status)}`}
                  >
                    {status === "verified" && <CheckCircle2 className="h-3 w-3" />}
                    {status === "pending" && <Clock className="h-3 w-3" />}
                    {itemStatusLabel(status)}
                  </span>
                </div>
              )
            })}
          </div>

          {wasRejected && data?.rejection_reason && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-slate-300 font-medium">Reviewer note:</span> {data.rejection_reason}
              </p>
            </div>
          )}

          {/* State-driven CTA */}
          {isPending ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
              <p className="text-sm font-semibold text-amber-300">Verification requested</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Your information has been submitted for review. You can continue using OpenJobMarket while we check it.
              </p>
            </div>
          ) : isVerified ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> You're verified
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Homeowners can see which of your details OpenJobMarket has checked. Re-submit if your information changes
                (for example after renewing insurance).
              </p>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
              >
                Re-submit for review
              </button>
            </div>
          ) : confirming ? (
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-4">
              <p className="text-sm font-semibold text-white">Submit for verification</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                We'll review your business information and any supporting documents. You can continue using OpenJobMarket
                while your verification is being reviewed.
              </p>
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-60 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/30 transition-colors"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit for verification
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirming(false); setError(null) }}
                  disabled={submitting}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                Get verified
              </button>
              {wasRejected && (
                <p className="text-xs text-slate-500 mt-2">
                  Update your details above, then re-submit for another review.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
