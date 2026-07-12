"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Crown,
  Check,
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCircle2,
  Gift,
  Users,
  Loader2,
  Sparkles,
  Trophy,
  Rocket,
} from "lucide-react"
import Link from "next/link"

interface MembershipPlan {
  id: string
  key: string
  name: string
  price_pence: number
  billing_interval: string
  map_marker_color: string | null
  features: string[]
}

type MembershipStatusValue =
  | "platform_free"
  | "trial"
  | "trial_bonus"
  | "reward"
  | "active_paid"
  | "grace_period"
  | "expired"

interface MembershipStatus {
  status: MembershipStatusValue
  subscriptions_enabled: boolean
  first_job_completed_at: string | null
  free_active_until: string | null
  membership_plan: MembershipPlan | null
  membership_plan_selected_at: string | null
  referral_code: string
  founding_member: boolean
  founding_member_headline: string
  founding_member_body: string
  grace_period_ends_at: string | null
}

const DEFAULT_FOUNDING_HEADLINE = "🚀 Founding Member Programme"
const DEFAULT_FOUNDING_BODY =
  "Open Job Market is currently FREE while we build a strong local community of tradespeople and homeowners in Portsmouth."

const MOCK_STATUS_BASE = {
  membership_plan: null,
  membership_plan_selected_at: null,
  referral_code: "PREVIEW01",
  founding_member: true,
  founding_member_headline: DEFAULT_FOUNDING_HEADLINE,
  founding_member_body: DEFAULT_FOUNDING_BODY,
  grace_period_ends_at: null,
} as const

function formatPrice(pricePence: number) {
  return `£${(pricePence / 100).toFixed(pricePence % 100 === 0 ? 0 : 2)}`
}

function daysRemaining(untilIso: string | null): number {
  if (!untilIso) return 0
  const ms = new Date(untilIso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function FoundingMemberBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
      <Trophy className="w-3 h-3" />
      Founding Member
    </span>
  )
}

export default function CompanySubscriptionPage() {
  const searchParams = useSearchParams()
  const preview = searchParams?.get("preview") // "launch" | "normal" — admin preview only, no real data touched

  const [status, setStatus] = useState<MembershipStatus | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)

  const [promoCode, setPromoCode] = useState("")
  const [promoSubmitting, setPromoSubmitting] = useState(false)
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [selectingPlan, setSelectingPlan] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadStatus = async () => {
    if (preview === "launch") {
      setStatus({ ...MOCK_STATUS_BASE, status: "platform_free", subscriptions_enabled: false, first_job_completed_at: null, free_active_until: null })
      return
    }
    if (preview === "normal") {
      setStatus({ ...MOCK_STATUS_BASE, status: "trial", subscriptions_enabled: true, first_job_completed_at: null, free_active_until: null })
      return
    }
    try {
      const res = await fetch("/api/tradesperson/membership-status")
      if (res.ok) setStatus(await res.json())
    } catch {
      // Leave status null — page falls back to a minimal view below
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadStatus(),
      fetch("/api/membership-plans")
        .then(r => (r.ok ? r.json() : { plans: [] }))
        .then(d => { if (!cancelled) setPlans(d.plans ?? []) })
        .catch(() => {}),
    ]).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview])

  const handleRedeemPromo = async (e: FormEvent) => {
    e.preventDefault()
    if (!promoCode.trim() || promoSubmitting || preview) return
    setPromoSubmitting(true)
    setPromoMessage(null)
    try {
      const res = await fetch("/api/tradesperson/redeem-promo-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setPromoMessage({
          type: "success",
          text: data.free_days_granted > 0
            ? `Code applied — ${data.free_days_granted} free days added to your account.`
            : "Code applied successfully.",
        })
        setPromoCode("")
        loadStatus()
      } else {
        setPromoMessage({ type: "error", text: data.error ?? "Unable to redeem this code" })
      }
    } catch {
      setPromoMessage({ type: "error", text: "Something went wrong. Please try again." })
    } finally {
      setPromoSubmitting(false)
    }
  }

  const handleSelectPlan = async (planKey: string) => {
    if (preview) return
    setSelectingPlan(planKey)
    try {
      const res = await fetch("/api/tradesperson/select-membership-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_key: planKey }),
      })
      if (res.ok) await loadStatus()
    } finally {
      setSelectingPlan(null)
    }
  }

  const referralLink = status?.referral_code && typeof window !== "undefined"
    ? `${window.location.origin}/auth/sign-up?accountType=company&source=quickcheck&ref=${status.referral_code}`
    : ""

  const copyReferralLink = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 flex-shrink-0">
            <Crown className="h-5 w-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Membership</h1>
            <p className="text-sm text-slate-500">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  const remaining = daysRemaining(status?.free_active_until ?? null)
  const graceDaysRemaining = daysRemaining(status?.grace_period_ends_at ?? null)
  const isLaunchMode = status?.status === "platform_free"

  return (
    <div className="space-y-6 max-w-2xl">
      {preview && (
        <div className="rounded-xl bg-blue-950/40 border border-blue-800/50 px-4 py-2 text-xs text-blue-300">
          Admin preview — {preview === "launch" ? "Launch Mode" : "Normal Mode"}. No real data shown or changed.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 flex-shrink-0">
          <Crown className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-white">Membership</h1>
            {status?.founding_member && <FoundingMemberBadge />}
          </div>
          <p className="text-sm text-slate-500">Your current access level</p>
        </div>
      </div>

      {/* ── Status card ──────────────────────────────────────────────────── */}
      {isLaunchMode && (
        <>
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 shadow-lg shadow-emerald-500/20">
            <p className="text-white font-bold text-sm sm:text-base leading-snug flex items-center gap-2">
              <Rocket className="w-4 h-4 flex-shrink-0" />
              {status?.founding_member_headline || DEFAULT_FOUNDING_HEADLINE}
            </p>
          </div>
          <Card className="bg-emerald-950/30 border-emerald-700/40 rounded-2xl">
            <CardContent className="pt-6 pb-6 space-y-3">
              <p className="text-slate-200 text-sm leading-relaxed">
                {status?.founding_member_body || DEFAULT_FOUNDING_BODY}
              </p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1">During Launch Mode</p>
              <ul className="space-y-1.5 text-sm text-slate-300">
                <li>• All Active Membership features are included.</li>
                <li>• No payment details are required.</li>
                <li>• No subscription is required.</li>
                <li>• You will receive plenty of notice before memberships are introduced.</li>
              </ul>
              {remaining > 0 && (
                <p className="text-emerald-300 text-sm font-medium leading-relaxed">
                  You&apos;ve also banked {remaining} bonus day{remaining === 1 ? "" : "s"} of Active Membership
                  from promo codes / referrals — these will apply automatically once membership plans go live.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {(status?.status === "trial" || status?.status === "trial_bonus") && (
        <Card className="bg-emerald-950/30 border-emerald-700/40 rounded-2xl">
          <CardContent className="pt-6 pb-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-white">You currently have FREE Active Membership</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Trial
              </span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>• Your free trial ends after your first completed job.</li>
              <li>• After your first completed job you receive an additional FREE 30 days of Active Membership.</li>
              <li>• No payment required until then.</li>
            </ul>
            {status.status === "trial_bonus" && remaining > 0 && (
              <p className="text-emerald-300 text-sm font-medium leading-relaxed">
                You&apos;ve already banked {remaining} bonus day{remaining === 1 ? "" : "s"} from promo codes / referrals —
                these will apply on top of your reward once your trial ends.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {status?.status === "reward" && (
        <Card className="bg-emerald-950/30 border-emerald-700/40 rounded-2xl">
          <CardContent className="pt-6 pb-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-lg font-bold text-white">You earned it!</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Thanks for completing your first job. You have{" "}
              <span className="text-emerald-300 font-semibold">{remaining} day{remaining === 1 ? "" : "s"}</span> of
              free Active Membership remaining.
            </p>
            <p className="text-xs text-slate-500">
              Choose a plan below any time — it&apos;ll take over automatically once your reward period ends.
            </p>
          </CardContent>
        </Card>
      )}

      {status?.status === "active_paid" && status.membership_plan && (
        <Card className="bg-emerald-950/30 border-emerald-800/50 rounded-2xl">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Active Membership</span>
            </div>
            <div>
              <h3 className="font-semibold text-emerald-200">{status.membership_plan.name}</h3>
              <p className="text-emerald-400 text-sm">
                {formatPrice(status.membership_plan.price_pence)}/{status.membership_plan.billing_interval}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Billing isn&apos;t live yet — your plan is reserved and won&apos;t be charged until subscriptions open.
            </p>
          </CardContent>
        </Card>
      )}

      {status?.status === "grace_period" && (
        <Card className="bg-amber-950/30 border-amber-700/40 rounded-2xl">
          <CardContent className="pt-6 pb-6 space-y-2">
            <span className="text-lg font-bold text-white">Memberships have started</span>
            <p className="text-slate-300 text-sm leading-relaxed">
              As an existing member you have <span className="text-amber-300 font-semibold">{graceDaysRemaining} day{graceDaysRemaining === 1 ? "" : "s"}</span>{" "}
              before billing begins — plenty of time to choose the plan that suits your business below.
            </p>
          </CardContent>
        </Card>
      )}

      {status?.status === "expired" && (
        <Card className="bg-amber-950/30 border-amber-700/40 rounded-2xl">
          <CardContent className="pt-6 pb-6 space-y-2">
            <span className="text-lg font-bold text-white">Your free period has ended</span>
            <p className="text-slate-300 text-sm leading-relaxed">
              Choose a membership plan below to keep your visibility on Open Job Market.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Promo code ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">Have a promo code?</p>
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl">
          <CardContent className="pt-5 pb-5">
            <form onSubmit={handleRedeemPromo} className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Gift className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <Input
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
              <Button type="submit" disabled={promoSubmitting || !promoCode.trim()} className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl">
                {promoSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            </form>
            {promoMessage && (
              <p className={`text-sm mt-3 ${promoMessage.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {promoMessage.text}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Referral ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">Invite other tradespeople</p>
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl">
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed">
                Share your referral link — when someone signs up with it, you both earn bonus days of free
                Active Membership.
              </p>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={referralLink} className="bg-slate-900/50 border-slate-700 text-slate-300 text-xs sm:text-sm" />
              <Button type="button" onClick={copyReferralLink} variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 rounded-xl flex-shrink-0">
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Membership plans ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-1">
          {isLaunchMode ? "Future Membership Plans" : "Membership plans"}
        </p>
        {isLaunchMode && (
          <p className="text-xs text-slate-500 px-1 mb-3">
            Once the platform is established, we expect to introduce these — not currently available.
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {plans.map((plan, i) => {
            const isActive = status?.membership_plan?.key === plan.key
            const isRecommended = i === plans.length - 1 && plans.length > 1
            return (
              <Card
                key={plan.id}
                className={isRecommended ? "bg-emerald-950/30 border-emerald-700/40 rounded-2xl relative" : "bg-slate-800/50 border-slate-700/50 rounded-2xl relative"}
              >
                {isLaunchMode ? (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-600 text-slate-200">
                    Coming Soon
                  </span>
                ) : isRecommended && (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">
                    Recommended
                  </span>
                )}
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: plan.map_marker_color === "green" ? "#34d399" : "#94a3b8" }}
                    />
                    <h3 className="font-bold text-white">{plan.name}</h3>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    Around {formatPrice(plan.price_pence)}
                    <span className={`text-sm font-medium ${isRecommended ? "text-emerald-300/80" : "text-slate-400"}`}>/{plan.billing_interval}</span>
                  </p>
                  <div className="space-y-2">
                    {plan.features.map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isRecommended ? "text-emerald-400" : "text-slate-400"}`} />
                        <span className={`text-sm ${isRecommended ? "text-slate-200" : "text-slate-300"}`}>{item}</span>
                      </div>
                    ))}
                  </div>
                  {!isLaunchMode && (
                    <Button
                      onClick={() => handleSelectPlan(plan.key)}
                      disabled={isActive || selectingPlan === plan.key}
                      className={isActive
                        ? "w-full bg-slate-700 text-slate-300 rounded-xl cursor-default"
                        : "w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl"}
                    >
                      {selectingPlan === plan.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isActive ? (
                        "Selected"
                      ) : (
                        "Select"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        {!isLaunchMode && !status?.subscriptions_enabled && (
          <p className="text-xs text-slate-500 px-1 mt-3">
            No payment is taken — plans go live automatically once subscriptions are switched on.
          </p>
        )}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl flex-1">
          <Link href="/dashboard/company">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
        </Button>
        <Button asChild variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 rounded-xl flex-1">
          <Link href="/dashboard/company/profile">
            <ExternalLink className="w-4 h-4 mr-2" />
            View My Company Profile
          </Link>
        </Button>
      </div>
    </div>
  )
}
