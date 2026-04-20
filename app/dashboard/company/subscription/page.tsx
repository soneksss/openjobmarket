"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Crown,
  Building2,
  Check,
  Calendar,
  Briefcase,
  Users,
  CreditCard,
  AlertCircle,
  Star,
  Receipt,
  Download
} from "lucide-react"
import { createClient } from "@/lib/client"

interface SubscriptionPlan {
  id: string
  name: string
  user_type: 'company' | 'professional'
  price: number
  duration_days: number
  job_limit: number | null
  contact_limit: number | null
  features: Record<string, any>
  active: boolean
}

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
  status: 'completed' | 'pending' | 'failed'
  payment_method: string
  invoice_url?: string
}

export default function CompanySubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adminSettings, setAdminSettings] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Load admin settings to check if subscriptions are enabled
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("subscriptions_enabled")
        .limit(1)
        .single()

      setAdminSettings(settings)

      // Load available plans for companies
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("user_type", "company")
        .eq("active", true)
        .order("price", { ascending: true })

      if (plansError) throw plansError
      setPlans(plansData || [])

      // Load user's current subscription
      const { data: subscriptionData, error: subError } = await supabase
        .rpc("get_user_active_subscription", { user_id_param: user.id })

      if (subError) throw subError
      setUserSubscription(subscriptionData)

      // Load billing history - get all user subscriptions for history
      const { data: historyData, error: historyError } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          created_at,
          start_date,
          end_date,
          status,
          payment_data,
          subscription_plans!inner(name, price)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (historyError) {
        console.warn("Error loading billing history:", historyError)
      } else {
        // Transform the data for display
        const transformedHistory: BillingHistory[] = (historyData || []).map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          plan_name: item.subscription_plans?.name || "Unknown Plan",
          amount: item.subscription_plans?.price || item.payment_data?.amount || 0,
          currency: item.payment_data?.currency || "GBP",
          status: item.status === 'active' || item.status === 'expired' ? 'completed' : item.status,
          payment_method: item.payment_data?.payment_gateway || "Credit Card",
          invoice_url: item.payment_data?.invoice_url
        }))
        setBillingHistory(transformedHistory)
      }

    } catch (err) {
      console.error("Error loading subscription data:", err)
      setError("Failed to load subscription information")
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseSubscription = async (planId: string) => {
    setPurchasing(planId)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const plan = plans.find(p => p.id === planId)
      if (!plan) throw new Error("Plan not found")

      // Calculate end date
      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + (plan.duration_days * 24 * 60 * 60 * 1000))

      // Create subscription record
      const { error: insertError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: user.id,
          plan_id: planId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          payment_data: {
            type: 'simulated_payment',
            amount: plan.price,
            currency: 'GBP',
            timestamp: new Date().toISOString(),
            payment_gateway: 'simulated'
          }
        })

      if (insertError) throw insertError

      // Reload subscription data
      await loadData()

    } catch (err) {
      console.error("Error purchasing subscription:", err)
      setError("Failed to purchase subscription. Please try again.")
    } finally {
      setPurchasing(null)
    }
  }

  const formatDuration = (days: number) => {
    if (days === 1) return "1 day"
    if (days === 7) return "1 week"
    if (days === 30) return "1 month"
    if (days < 7) return `${days} days`
    if (days < 30) return `${Math.floor(days / 7)} weeks`
    return `${Math.floor(days / 30)} months`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 flex-shrink-0">
            <Crown className="h-5 w-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Subscription</h1>
            <p className="text-sm text-slate-500">Loading subscription details...</p>
          </div>
        </div>
      </div>
    )
  }

  // If subscriptions are disabled, show message
  if (!adminSettings?.subscriptions_enabled) {
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

        <Card className="bg-blue-950/30 border-blue-800/50 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Star className="h-8 w-8 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-blue-200">All Features Available</h3>
                <p className="text-blue-400">
                  Subscriptions are currently disabled. You have access to all platform features at no cost.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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

      {error && (
        <Card className="bg-red-950/20 border-red-800/50 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-400">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Status */}
      {userSubscription?.has_subscription ? (
        <Card className="bg-green-950/30 border-green-800/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-300">
              <Check className="h-5 w-5" />
              <span>Active Subscription</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-green-200">{userSubscription.plan_name} Plan</h3>
                <p className="text-green-400">£{userSubscription.price}/{formatDuration(30)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-500">Expires on</p>
                <p className="font-medium text-green-200">
                  {userSubscription.end_date && formatDate(userSubscription.end_date)}
                </p>
                <p className="text-xs text-green-500">
                  {userSubscription.days_remaining} days remaining
                </p>
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Job Postings Usage */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Job Postings</span>
                    <span>
                      {userSubscription.jobs_used || 0}
                      {userSubscription.jobs_limit ? ` / ${userSubscription.jobs_limit}` : ' / Unlimited'}
                    </span>
                  </div>
                  {userSubscription.jobs_limit && (
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${Math.min(((userSubscription.jobs_used || 0) / userSubscription.jobs_limit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Client Contact Usage */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Client Contacts</span>
                    <span>
                      {userSubscription.contacts_used || 0}
                      {userSubscription.contacts_limit ? ` / ${userSubscription.contacts_limit}` : ' / Unlimited'}
                    </span>
                  </div>
                  {userSubscription.contacts_limit && (
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(((userSubscription.contacts_used || 0) / userSubscription.contacts_limit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-amber-950/30 border-amber-800/50 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-amber-400" />
              <div>
                <h3 className="text-lg font-semibold text-amber-200">No Active Subscription</h3>
                <p className="text-amber-400">
                  You need an active subscription to post jobs and connect with clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">Available Plans</p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative rounded-2xl ${
                userSubscription?.plan_name === plan.name
                  ? 'border-emerald-600/50 bg-emerald-950/30'
                  : 'border-slate-700/50 bg-slate-800/50'
              }`}
            >
              {userSubscription?.plan_name === plan.name && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-emerald-600 text-white text-xs">Current Plan</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg text-slate-100">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-emerald-400">
                  £{plan.price}
                  <span className="text-sm font-normal text-slate-500">
                    /{formatDuration(plan.duration_days)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">
                      {plan.job_limit ? `${plan.job_limit} job postings` : 'Unlimited job postings'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">
                      {plan.contact_limit ? `${plan.contact_limit} client contacts` : 'Unlimited client contacts'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">{formatDuration(plan.duration_days)} duration</span>
                  </div>

                  {plan.features?.support && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-slate-300 capitalize">
                        {plan.features.support.replace('_', ' ')} support
                      </span>
                    </div>
                  )}

                  {plan.features?.analytics && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-slate-300">Advanced analytics</span>
                    </div>
                  )}

                  {plan.features?.featured_jobs && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-slate-300">Featured job listings</span>
                    </div>
                  )}
                </div>

                <Button
                  className={`w-full ${
                    userSubscription?.plan_name === plan.name
                      ? 'bg-transparent border border-slate-600 text-slate-400'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                  onClick={() => handlePurchaseSubscription(plan.id)}
                  disabled={purchasing === plan.id || userSubscription?.plan_name === plan.name}
                  variant={userSubscription?.plan_name === plan.name ? "outline" : "default"}
                >
                  {purchasing === plan.id ? (
                    "Processing..."
                  ) : userSubscription?.plan_name === plan.name ? (
                    "Current Plan"
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe for £{plan.price}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {plans.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl text-center py-8">
          <CardContent>
            <Building2 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-200 mb-2">No Plans Available</h3>
            <p className="text-slate-500">
              No subscription plans are currently available.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">Billing History</p>
        <Card className="bg-slate-800/50 border-slate-700/50 rounded-2xl">
          <CardContent className="p-0">
            {billingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-700/50">
                    <tr>
                      <th className="text-left p-4 text-xs font-medium text-slate-400">Date</th>
                      <th className="text-left p-4 text-xs font-medium text-slate-400">Plan</th>
                      <th className="text-left p-4 text-xs font-medium text-slate-400">Amount</th>
                      <th className="text-left p-4 text-xs font-medium text-slate-400">Status</th>
                      <th className="text-left p-4 text-xs font-medium text-slate-400">Payment</th>
                      <th className="text-left p-4 text-xs font-medium text-slate-400">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20">
                        <td className="p-4 text-sm text-slate-300">
                          {new Date(item.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-slate-200">{item.plan_name}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-slate-200">
                            {item.currency === 'GBP' ? '£' : item.currency}{item.amount}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={
                              item.status === 'completed' ? 'bg-green-600/80 text-green-100' :
                              item.status === 'pending' ? 'bg-yellow-600/80 text-yellow-100' :
                              'bg-red-600/80 text-red-100'
                            }
                          >
                            {item.status === 'completed' ? 'Paid' :
                             item.status === 'pending' ? 'Pending' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-slate-400 capitalize">
                          {item.payment_method.replace('_', ' ')}
                        </td>
                        <td className="p-4">
                          {item.invoice_url ? (
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" asChild>
                              <a href={item.invoice_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-white"
                              onClick={() => {
                                const receiptText = `Receipt for ${item.plan_name}\nDate: ${new Date(item.created_at).toLocaleDateString()}\nAmount: £${item.amount}\nStatus: ${item.status}`
                                const blob = new Blob([receiptText], { type: 'text/plain' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `receipt-${item.id}.txt`
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Receipt
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
                <h3 className="text-sm font-semibold text-slate-300 mb-1">No billing history</h3>
                <p className="text-xs text-slate-500">
                  {userSubscription?.has_subscription
                    ? "Your billing history will appear here after your first payment."
                    : "Subscribe to a plan to see your billing history here."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}