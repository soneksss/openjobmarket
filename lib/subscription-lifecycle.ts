import { createClient } from "@/lib/server"

/**
 * Subscription lifecycle management utilities
 */

export async function expireOldSubscriptions() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc("expire_old_subscriptions")

    if (error) {
      console.error("Error expiring old subscriptions:", error)
      return { success: false, error: error.message }
    }

    console.log(`Successfully expired ${data} subscriptions`)
    return { success: true, expired_count: data }
  } catch (err) {
    console.error("Exception expiring subscriptions:", err)
    return { success: false, error: "Unexpected error" }
  }
}

export async function getUserActiveSubscription(userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .rpc("get_user_active_subscription", { user_id_param: userId })

    if (error) {
      console.error("Error getting user subscription:", error)
      return null
    }

    return data
  } catch (err) {
    console.error("Exception getting user subscription:", err)
    return null
  }
}

export async function checkUserCanPostJob(userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .rpc("can_user_post_job", { user_id_param: userId })

    if (error) {
      console.error("Error checking job posting permission:", error)
      return { can_post: false, reason: "error" }
    }

    return data
  } catch (err) {
    console.error("Exception checking job posting permission:", err)
    return { can_post: false, reason: "error" }
  }
}

export async function checkUserCanContactProfessional(userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .rpc("can_user_contact_professional", { user_id_param: userId })

    if (error) {
      console.error("Error checking contact permission:", error)
      return { can_contact: false, reason: "error" }
    }

    return data
  } catch (err) {
    console.error("Exception checking contact permission:", err)
    return { can_contact: false, reason: "error" }
  }
}

export async function incrementSubscriptionUsage(userId: string, usageType: 'job' | 'contact') {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .rpc("increment_subscription_usage", {
        user_id_param: userId,
        usage_type: usageType
      })

    if (error) {
      console.error("Error incrementing subscription usage:", error)
      return false
    }

    return data
  } catch (err) {
    console.error("Exception incrementing subscription usage:", err)
    return false
  }
}

/**
 * Check if subscriptions are enabled in admin settings
 */
export async function areSubscriptionsEnabled() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("subscriptions_enabled")
      .limit(1)
      .single()

    if (error) {
      console.error("Error checking subscription settings:", error)
      return false
    }

    return data?.subscriptions_enabled || false
  } catch (err) {
    console.error("Exception checking subscription settings:", err)
    return false
  }
}

/**
 * Get subscription plans for a specific user type
 */
export async function getSubscriptionPlans(userType: 'company' | 'professional') {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("user_type", userType)
      .eq("active", true)
      .order("price", { ascending: true })

    if (error) {
      console.error("Error getting subscription plans:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Exception getting subscription plans:", err)
    return []
  }
}

/**
 * Create a new subscription for a user
 */
export async function createUserSubscription(
  userId: string,
  planId: string,
  paymentData: any = {}
) {
  const supabase = await createClient()

  try {
    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single()

    if (planError || !plan) {
      console.error("Error getting plan:", planError)
      return { success: false, error: "Plan not found" }
    }

    // Calculate end date
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + (plan.duration_days * 24 * 60 * 60 * 1000))

    // Create subscription
    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        payment_data: paymentData
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating subscription:", error)
      return { success: false, error: error.message }
    }

    return { success: true, subscription: data }
  } catch (err) {
    console.error("Exception creating subscription:", err)
    return { success: false, error: "Unexpected error" }
  }
}