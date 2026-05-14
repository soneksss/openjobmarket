"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Crown,
  Check,
  CheckCircle2,
  Calendar,
  Briefcase,
  Users,
  CreditCard,
  AlertCircle,
  Receipt,
  Download,
  ArrowLeft,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/lib/client"
import Link from "next/link"

interface UserSubscription {
  has_subscription: boolean
  subscription_id?: string
  plan_name?: string
  plan_type?: string
  price?: number
  start_date?: string
  end_date?: string
  jobs_used?: number
  jobs_limit?: number | null
  contacts_used?: number
  contacts_limit?: number | null
  features?: Record<string, any>
  days_remaining?: number
}

interface BillingHistory {
  id: string
  created_at: string
  plan_name: string
  amount: number
  currency: string
  status: "completed" | "pending" | "failed"
  payment_method: string
  invoice_url?: string
}

const LOAD_TIMEOUT_MS = 3000

function FreeAccessPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 flex-shrink-0">
          <Crown className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Subscription</h1>
          <p className="text-sm text-slate-500">Your current access level</p>
        </div>
      </div>

      {/* Free Access badge + headline */}
      <Card className="bg-emerald-950/30 border-emerald-700/40 rounded-2xl">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-white">Free Early Access</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Open Job Market is currently free to use during the early launch phase.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                You can receive job requests, appear on the local trades map, and manage
                your business profile completely free while the platform is growing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
          How Open Job Market works
        </p>
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl">
          <CardContent className="pt-5 pb-5 space-y-3">
            {[
              "No lead fees",
              "No commission on jobs",
              "Tradespeople keep 100% of the job value",
              "Optional low monthly subscription may apply later",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-sm text-slate-200">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Future pricing notice */}
      <Card className="bg-slate-800/30 border-slate-700/30 rounded-2xl">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-300 font-medium">Future pricing: </span>
            A small subscription (around £10/month) may be introduced in the future, but only
            after the platform brings consistent work to tradespeople.
          </p>
        </CardContent>
      </Card>

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

export default function CompanySubscriptionPage() {
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Hard timeout — show Free Access page after 3 s regardless
    const timeout = setTimeout(() => setLoading(false), LOAD_TIMEOUT_MS)

    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); clearTimeout(timeout); return }

        const { data: subscriptionData } = await supabase
          .rpc("get_user_active_subscription", { user_id_param: user.id })
        setUserSubscription(subscriptionData ?? null)

        if (subscriptionData?.has_subscription) {
          const { data: historyData } = await supabase
            .from("user_subscriptions")
            .select("id, created_at, status, payment_data, subscription_plans!inner(name, price)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          const transformed: BillingHistory[] = (historyData || []).map((item: any) => ({
            id: item.id,
            created_at: item.created_at,
            plan_name: item.subscription_plans?.name || "Unknown Plan",
            amount: item.subscription_plans?.price || item.payment_data?.amount || 0,
            currency: item.payment_data?.currency || "GBP",
            status: item.status === "active" || item.status === "expired" ? "completed" : item.status,
            payment_method: item.payment_data?.payment_gateway || "Credit Card",
            invoice_url: item.payment_data?.invoice_url,
          }))
          setBillingHistory(transformed)
        }
      } catch {
        // Any error → fall through to FreeAccessPage
      } finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    }

    loadData()
    return () => clearTimeout(timeout)
  }, [])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 flex-shrink-0">
            <Crown className="h-5 w-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Subscription</h1>
            <p className="text-sm text-slate-500">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  // ── No subscription or error → Free Early Access ─────────────────────────────
  if (!userSubscription?.has_subscription) {
    return <FreeAccessPage />
  }

  // ── Active paid subscription ─────────────────────────────────────────────────
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 flex-shrink-0">
          <Crown className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Subscription</h1>
          <p className="text-sm text-slate-500">Manage your subscription plan</p>
        </div>
      </div>

      {/* Active plan card */}
      <Card className="bg-emerald-950/30 border-emerald-800/50 rounded-2xl">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-300">
            <Check className="h-5 w-5" />
            <span className="font-semibold">Active Subscription</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-emerald-200">{userSubscription.plan_name} Plan</h3>
              <p className="text-emerald-400 text-sm">£{userSubscription.price}/month</p>
            </div>
            <div className="md:text-right">
              <p className="text-xs text-emerald-500">Expires on</p>
              <p className="font-medium text-emerald-200">
                {userSubscription.end_date && formatDate(userSubscription.end_date)}
              </p>
              <p className="text-xs text-emerald-500">{userSubscription.days_remaining} days remaining</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Job Postings</span>
                <span>
                  {userSubscription.jobs_used ?? 0}
                  {userSubscription.jobs_limit ? ` / ${userSubscription.jobs_limit}` : " / Unlimited"}
                </span>
              </div>
              {userSubscription.jobs_limit && (
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(((userSubscription.jobs_used ?? 0) / userSubscription.jobs_limit) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Client Contacts</span>
                <span>
                  {userSubscription.contacts_used ?? 0}
                  {userSubscription.contacts_limit ? ` / ${userSubscription.contacts_limit}` : " / Unlimited"}
                </span>
              </div>
              {userSubscription.contacts_limit && (
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(((userSubscription.contacts_used ?? 0) / userSubscription.contacts_limit) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing history */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">Billing History</p>
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-0">
            {billingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-700/50">
                    <tr>
                      {["Date", "Plan", "Amount", "Status", "Payment", "Invoice"].map(h => (
                        <th key={h} className="text-left p-4 text-xs font-medium text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20">
                        <td className="p-4 text-sm text-slate-300">
                          {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-200">{item.plan_name}</td>
                        <td className="p-4 text-sm font-medium text-slate-200">
                          {item.currency === "GBP" ? "£" : item.currency}{item.amount}
                        </td>
                        <td className="p-4">
                          <Badge className={
                            item.status === "completed" ? "bg-emerald-600/80 text-emerald-100" :
                            item.status === "pending"   ? "bg-yellow-600/80 text-yellow-100"  :
                                                          "bg-red-600/80 text-red-100"
                          }>
                            {item.status === "completed" ? "Paid" : item.status === "pending" ? "Pending" : "Failed"}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-slate-400 capitalize">{item.payment_method.replace("_", " ")}</td>
                        <td className="p-4">
                          {item.invoice_url ? (
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" asChild>
                              <a href={item.invoice_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" />Download
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white"
                              onClick={() => {
                                const txt = `Receipt for ${item.plan_name}\nDate: ${new Date(item.created_at).toLocaleDateString()}\nAmount: £${item.amount}\nStatus: ${item.status}`
                                const a = Object.assign(document.createElement("a"), {
                                  href: URL.createObjectURL(new Blob([txt], { type: "text/plain" })),
                                  download: `receipt-${item.id}.txt`,
                                })
                                a.click()
                              }}
                            >
                              <Receipt className="h-4 w-4 mr-1" />Receipt
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <Receipt className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-sm font-semibold text-slate-300 mb-1">No billing history</p>
                <p className="text-xs text-slate-500">Your billing history will appear here after your first payment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
