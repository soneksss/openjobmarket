"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Building2, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/client"

export default function BillingPage() {
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkSubscriptionStatus()
  }, [])

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_settings')

      if (!error && data) {
        setSubscriptionsEnabled(data.subscriptions_enabled)
      }
    } catch (err) {
      console.error("Error checking subscription status:", err)
      // Default to enabled if there's an error
      setSubscriptionsEnabled(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Open Job Market
        </Link>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-4xl flex items-center justify-center">
            <CreditCard className="h-10 w-10 mr-3 text-primary" />
            Company Subscription Plans
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Choose the perfect plan to find and hire the best talent
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Subscription Disabled Notice */}
          {!loading && !subscriptionsEnabled && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800">Platform is Currently Free</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Premium subscriptions are currently disabled. All platform features are available for free to all users.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Company Plans */}
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold flex items-center justify-center mb-2">
                <Building2 className="h-6 w-6 mr-2 text-blue-600" />
                For Companies
              </h2>
              <p className="text-muted-foreground">Find and hire the best talent</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Starter Plan</CardTitle>
                    <Badge variant="secondary">Free</Badge>
                  </div>
                  <p className="text-2xl font-bold">
                    £0<span className="text-sm font-normal">/month</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automatically assigned on signup
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm mb-4">
                    <li>• Post up to 5 jobs per month</li>
                    <li>• Contact up to 10 professionals</li>
                    <li>• Basic job search & discovery</li>
                    <li>• Map-based professional search</li>
                    <li>• Standard support</li>
                  </ul>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/auth/sign-up">Get Started Free</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className={`border-2 ${!subscriptionsEnabled ? 'border-gray-200 opacity-60' : 'border-primary'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Premium Plan</CardTitle>
                    {subscriptionsEnabled ? (
                      <Badge className="bg-primary">Recommended</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">
                    £10<span className="text-sm font-normal">/month</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subscriptionsEnabled ? '3 months free for all new signups!' : 'Currently unavailable'}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm mb-4">
                    <li>• Unlimited job postings</li>
                    <li>• Unlimited professional contacts</li>
                    <li>• Advanced search filters</li>
                    <li>• Priority job placement</li>
                    <li>• Analytics dashboard</li>
                    <li>• Priority support</li>
                  </ul>
                  <Button
                    className="w-full"
                    disabled={!subscriptionsEnabled}
                    asChild={subscriptionsEnabled}
                  >
                    {subscriptionsEnabled ? (
                      <Link href="/auth/sign-up">Start Premium Trial</Link>
                    ) : (
                      <span>Currently Unavailable</span>
                    )}
                  </Button>
                  {!subscriptionsEnabled && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Premium features are currently available for free
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Call to Action for Existing Users */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Already have an account?</h3>
              <p className="text-muted-foreground mb-4">
                Sign in to manage your subscription and view billing history
              </p>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link href="/auth/login">Sign In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Need help with billing?</h3>
            <p className="text-sm text-blue-700">
              Contact our billing support team at{" "}
              <a href="mailto:info@openjobmarket.com" className="underline">
                info@openjobmarket.com
              </a>{" "}
              or visit our{" "}
              <Link href="/contact" className="underline">
                help center
              </Link>{" "}
              for common billing questions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
