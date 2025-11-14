"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"

interface PremiumStatus {
  isPremium: boolean
  subscriptionName: string | null
  contactsUsed: number
  contactsLimit: number | null
  loading: boolean
}

/**
 * Hook to check if a user has an active premium subscription
 * Returns premium status information including subscription details
 * NOTE: Subscriptions are ONLY for companies and contractors, NOT for jobseekers/professionals or homeowners
 */
export function usePremiumStatus(userId: string | null | undefined, userType?: string): PremiumStatus {
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    subscriptionName: null,
    contactsUsed: 0,
    contactsLimit: null,
    loading: true,
  })

  useEffect(() => {
    if (!userId) {
      setStatus({
        isPremium: false,
        subscriptionName: null,
        contactsUsed: 0,
        contactsLimit: null,
        loading: false,
      })
      return
    }

    // Only check subscriptions for companies and contractors (both are businesses)
    if (userType && userType !== 'company' && userType !== 'employer' && userType !== 'contractor') {
      console.log("[USE-PREMIUM-STATUS] Subscriptions only available for companies/contractors, user type:", userType)
      setStatus({
        isPremium: false,
        subscriptionName: null,
        contactsUsed: 0,
        contactsLimit: null,
        loading: false,
      })
      return
    }

    const checkPremiumStatus = async () => {
      try {
        const supabase = createClient()

        // First, check if subscriptions are enabled by admin
        const { data: adminSettings, error: adminError } = await supabase
          .from("admin_settings")
          .select("subscriptions_enabled")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (adminError || !adminSettings?.subscriptions_enabled) {
          console.log("[USE-PREMIUM-STATUS] Subscriptions not enabled by admin")
          setStatus({
            isPremium: false,
            subscriptionName: null,
            contactsUsed: 0,
            contactsLimit: null,
            loading: false,
          })
          return
        }

        // Get active subscription for the user
        const { data: subscription, error } = await supabase
          .from("user_subscriptions")
          .select(`
            *,
            plan:subscription_plans!plan_id(
              name,
              contact_limit,
              job_limit,
              price
            )
          `)
          .eq("user_id", userId)
          .eq("status", "active")
          .gt("end_date", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (error) {
          // Silently handle subscription errors - subscription system may not be set up yet
          if (error.code === '42P17') {
            console.log("[USE-PREMIUM-STATUS] Subscription system not configured (foreign key missing)")
          } else if (error.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" - not an error, just no subscription
            console.log("[USE-PREMIUM-STATUS] No active subscription found or error:", error.code)
          }
          setStatus({
            isPremium: false,
            subscriptionName: null,
            contactsUsed: 0,
            contactsLimit: null,
            loading: false,
          })
          return
        }

        if (!subscription) {
          setStatus({
            isPremium: false,
            subscriptionName: null,
            contactsUsed: 0,
            contactsLimit: null,
            loading: false,
          })
          return
        }

        // Check if it's actually a premium subscription (not free/basic)
        const plan = subscription.plan
        const isPremium =
          plan?.name?.toLowerCase().includes("premium") ||
          (plan?.price && plan.price > 0)

        setStatus({
          isPremium,
          subscriptionName: plan.name,
          contactsUsed: subscription.contacts_used || 0,
          contactsLimit: plan.contact_limit,
          loading: false,
        })

        console.log("[USE-PREMIUM-STATUS] Premium status:", {
          userId,
          isPremium,
          subscriptionName: plan.name,
          contactsUsed: subscription.contacts_used,
          contactsLimit: plan.contact_limit,
        })
      } catch (err) {
        console.error("[USE-PREMIUM-STATUS] Error checking premium status:", err)
        setStatus({
          isPremium: false,
          subscriptionName: null,
          contactsUsed: 0,
          contactsLimit: null,
          loading: false,
        })
      }
    }

    checkPremiumStatus()
  }, [userId, userType])

  return status
}

/**
 * Server-side utility function to check premium status
 * Use this in server components or API routes
 * NOTE: Subscriptions are ONLY for companies and contractors, NOT for jobseekers/professionals or homeowners
 */
export async function checkPremiumStatusServer(userId: string, supabase: any, userType?: string): Promise<boolean> {
  try {
    // Only check subscriptions for companies and contractors (both are businesses)
    if (userType && userType !== 'company' && userType !== 'employer' && userType !== 'contractor') {
      console.log("[CHECK-PREMIUM-STATUS-SERVER] Subscriptions only available for companies/contractors, user type:", userType)
      return false
    }

    // First, check if subscriptions are enabled by admin
    const { data: adminSettings, error: adminError } = await supabase
      .from("admin_settings")
      .select("subscriptions_enabled")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (adminError || !adminSettings?.subscriptions_enabled) {
      console.log("[CHECK-PREMIUM-STATUS-SERVER] Subscriptions not enabled by admin")
      return false
    }

    const { data: subscription, error } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        plan:subscription_plans!plan_id(
          name,
          price
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("end_date", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !subscription) {
      return false
    }

    // Check if it's a premium subscription
    const plan = subscription.plan
    const isPremium =
      plan?.name?.toLowerCase().includes("premium") ||
      (plan?.price && plan.price > 0)

    return isPremium
  } catch (err) {
    console.error("[CHECK-PREMIUM-STATUS-SERVER] Error:", err)
    return false
  }
}
