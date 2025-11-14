"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Crown,
  Users,
  Check,
  Calendar,
  CreditCard,
  AlertCircle,
  Star,
  Eye,
  Zap,
  Target,
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

export default function ProfessionalSubscriptionPage() {
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

      // Load available plans for professionals
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("user_type", "professional")
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
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-muted-foreground animate-spin" />
          <div>
            <h1 className="text-3xl font-bold">Subscription</h1>
            <p className="text-muted-foreground">Loading subscription details...</p>
          </div>
        </div>
      </div>
    )
  }

  // If subscriptions are disabled, show message
  if (!adminSettings?.subscriptions_enabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Subscription</h1>
            <p className="text-muted-foreground">Manage your professional subscription</p>
          </div>
        </div>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Star className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">All Features Available</h3>
                <p className="text-green-600">
                  Subscriptions are currently disabled. You have access to all professional features at no cost.
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
      <div className="flex items-center space-x-2">
        <Crown className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground">Enhance your professional profile</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Status */}
      {userSubscription?.has_subscription ? (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <Check className="h-5 w-5" />
              <span>Active Premium Subscription</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-green-800">{userSubscription.plan_name} Plan</h3>
                <p className="text-green-600">£{userSubscription.price}/{formatDuration(30)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600">Expires on</p>
                <p className="font-medium text-green-800">
                  {userSubscription.end_date && formatDate(userSubscription.end_date)}
                </p>
                <p className="text-xs text-green-600">
                  {userSubscription.days_remaining} days remaining
                </p>
              </div>
            </div>

            {/* Active Features */}
            <div className="space-y-2">
              <h4 className="font-medium text-green-800">Active Features:</h4>
              <div className="grid md:grid-cols-2 gap-2">
                {userSubscription.features?.actively_looking && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Target className="h-4 w-4" />
                    <span className="text-sm">"Actively Looking" toggle</span>
                  </div>
                )}
                {userSubscription.features?.bold_profile && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Bold profile name</span>
                  </div>
                )}
                {userSubscription.features?.green_indicator && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Green visibility indicator</span>
                  </div>
                )}
                {userSubscription.features?.priority_search && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Star className="h-4 w-4" />
                    <span className="text-sm">Priority search ranking</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-amber-600" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800">Basic Profile</h3>
                <p className="text-amber-600">
                  Upgrade to Premium to unlock enhanced visibility and features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Professional Plans</h2>
        <div className="grid gap-6 max-w-md">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${userSubscription?.plan_name === plan.name ? 'border-green-500 bg-green-50' : 'border-green-200'}`}
            >
              {userSubscription?.plan_name === plan.name && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-green-600">Current Plan</Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-xl flex items-center justify-center space-x-2">
                  <Crown className="h-5 w-5 text-green-600" />
                  <span>{plan.name}</span>
                </CardTitle>
                <div className="text-3xl font-bold text-green-600">
                  £{plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{formatDuration(plan.duration_days)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Stand out and get noticed by employers
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{formatDuration(plan.duration_days)} duration</span>
                  </div>

                  {plan.features?.actively_looking && (
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="text-sm">"Actively Looking" toggle visibility</span>
                    </div>
                  )}

                  {plan.features?.bold_profile && (
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Bold profile name in search results</span>
                    </div>
                  )}

                  {plan.features?.green_indicator && (
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Green dot visibility indicator</span>
                    </div>
                  )}

                  {plan.features?.priority_search && (
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Higher ranking in search results</span>
                    </div>
                  )}
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-700">
                    <strong>Premium benefits:</strong> Increase your visibility to companies and get noticed faster with enhanced profile features.
                  </p>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
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
                      Upgrade for £{plan.price}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {plans.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Plans Available</h3>
            <p className="text-muted-foreground">
              No subscription plans are currently available for professionals.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium border-b pb-2">
              <div>Feature</div>
              <div className="text-center">Basic (Free)</div>
              <div className="text-center">Premium</div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Profile visibility</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Receive job applications</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>"Actively Looking" toggle</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Bold profile name</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Priority search ranking</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Green visibility indicator</div>
              <div className="text-center text-muted-foreground">×</div>
              <div className="text-center">
                <Check className="h-4 w-4 text-green-600 mx-auto" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Receipt className="h-6 w-6 mr-2" />
          Billing History
        </h2>
        <Card>
          <CardContent className="p-0">
            {billingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Plan</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Payment</th>
                      <th className="text-left p-4 font-medium">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="p-4">
                          {new Date(item.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{item.plan_name}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            {item.currency === 'GBP' ? '£' : item.currency}{item.amount}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={item.status === 'completed' ? 'default' :
                                   item.status === 'pending' ? 'secondary' : 'destructive'}
                            className={
                              item.status === 'completed' ? 'bg-green-600' :
                              item.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                            }
                          >
                            {item.status === 'completed' ? 'Paid' :
                             item.status === 'pending' ? 'Pending' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground capitalize">
                          {item.payment_method.replace('_', ' ')}
                        </td>
                        <td className="p-4">
                          {item.invoice_url ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={item.invoice_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Generate basic receipt info
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
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No billing history</h3>
                <p className="text-muted-foreground">
                  {userSubscription?.has_subscription
                    ? "Your billing history will appear here after your first payment."
                    : "Subscribe to Premium to see your billing history here."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}