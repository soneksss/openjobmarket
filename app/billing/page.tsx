"use client"

import { useState, useEffect } from "react"
import { CreditCard, Building2, ArrowLeft, AlertCircle, Check } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/client"

export default function BillingPage() {
  const pathname = usePathname()
  const isOnBrRoute = pathname?.startsWith('/br')
  const signUpUrl = isOnBrRoute
    ? `/auth/sign-up?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : '/auth/sign-up'

  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_admin_settings')
        if (!error && data) setSubscriptionsEnabled(data.subscriptions_enabled)
      } catch {
        setSubscriptionsEnabled(true)
      } finally {
        setLoading(false)
      }
    }
    checkSubscriptionStatus()
  }, [])

  const starterFeatures = [
    "Post 1 job at a time",
    "Send up to 5 messages per month",
    "Limited search filters",
    "Standard visibility",
    "Basic support",
  ]

  const premiumFeatures = [
    "Unlimited job postings",
    "Unlimited professional contacts",
    "Advanced search filters",
    "Priority job placement",
    "Analytics dashboard",
    "Priority support",
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />Back to Open Job Market
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CreditCard className="h-8 w-8 text-emerald-400" />
            <h1 className="text-3xl font-bold text-white">Company Subscription Plans</h1>
          </div>
          <p className="text-slate-400">Choose the perfect plan to connect with homeowners near you</p>
        </div>

        {!loading && !subscriptionsEnabled && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/40 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-300">Platform is Currently Free</h3>
                <p className="text-sm text-blue-400/80 mt-0.5">
                  Premium subscriptions are currently disabled. All platform features are available for free to all users.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-center gap-2">
          <Building2 className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">For Tradespeople & Companies</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto mb-8">
          {/* Starter */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Starter Plan</h3>
              <span className="text-xs bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full">Auto-Assigned</span>
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-white">£0</span>
              <span className="text-slate-400 text-sm">/month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {subscriptionsEnabled
                ? 'Automatically applied to all companies when subscriptions are enabled'
                : 'Default plan for all companies'}
            </p>
            <ul className="space-y-2 mb-5">
              {starterFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                  <Check className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-2.5 rounded-xl border border-slate-600 text-slate-500 text-sm font-medium cursor-not-allowed">
              Automatically Applied
            </button>
          </div>

          {/* Premium */}
          <div className={`bg-slate-800 rounded-xl border p-6 ${!subscriptionsEnabled ? 'border-slate-700/50 opacity-60' : 'border-emerald-600/60'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Premium Plan</h3>
              {subscriptionsEnabled ? (
                <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded-full">Recommended</span>
              ) : (
                <span className="text-xs bg-slate-700 text-slate-400 border border-slate-600 px-2 py-0.5 rounded-full">Disabled</span>
              )}
            </div>
            <div className="mb-1">
              <span className="text-3xl font-bold text-white">£10</span>
              <span className="text-slate-400 text-sm">/month</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {subscriptionsEnabled ? '3 months free for all new signups!' : 'Currently unavailable'}
            </p>
            <ul className="space-y-2 mb-5">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            {subscriptionsEnabled ? (
              <Link
                href={signUpUrl}
                className="block w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
              >
                Start Premium Trial
              </Link>
            ) : (
              <button disabled className="w-full py-2.5 rounded-xl bg-slate-700 text-slate-500 text-sm font-medium cursor-not-allowed">
                Currently Unavailable
              </button>
            )}
          </div>
        </div>

        {/* Already have an account */}
        <div className="bg-gradient-to-br from-blue-950 to-slate-800 rounded-xl border border-blue-800/40 p-6 text-center mb-5">
          <h3 className="text-lg font-semibold text-white mb-1">Already have an account?</h3>
          <p className="text-slate-400 text-sm mb-4">Sign in to manage your subscription and view billing history</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/auth/login"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700/50 text-sm text-slate-400">
          <span className="font-medium text-slate-300">Need help with billing? </span>
          Visit our{" "}
          <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">
            contact page
          </Link>
          {" "}and we'll get back to you as soon as possible.
        </div>
      </div>
    </div>
  )
}
