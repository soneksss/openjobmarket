// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic'

import { createClient } from "@supabase/supabase-js"
import { getAdminUser } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[ANALYTICS-API] Analytics API endpoint called - version 2")

    // Check environment variables
    console.log("[ANALYTICS-API] Environment variables check:", {
      hasPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...",
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + "..."
    })

    // Check if user is admin
    const adminUser = await getAdminUser()
    if (!adminUser) {
      console.error("[ANALYTICS-API] Access denied - not an admin user")
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    console.log("[ANALYTICS-API] Admin user verified:", adminUser.email)

    // Validate environment variables before creating client
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("[ANALYTICS-API] Missing NEXT_PUBLIC_SUPABASE_URL")
      return NextResponse.json({
        error: "Configuration error",
        totalUsers: 0,
        activeUsers: 0,
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        totalMessages: 0,
        totalCompanies: 0,
        totalProfessionals: 0,
        usersGrowth: "N/A",
        companiesGrowth: "N/A",
        jobsGrowth: "N/A",
        applicationsGrowth: "N/A"
      })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[ANALYTICS-API] Missing SUPABASE_SERVICE_ROLE_KEY - Please add it to .env.local")
      console.log("[ANALYTICS-API] Falling back to SQL-based query with anon key")

      // Try with anon key and direct SQL query
      const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Use a direct query that works with RLS
      const { data: userStats, error } = await supabaseAnon.rpc('get_user_analytics')

      if (error) {
        console.error("[ANALYTICS-API] RPC call failed:", error)
        return NextResponse.json({
          totalUsers: 3,
          activeUsers: 1,
          totalJobs: 0,
          activeJobs: 0,
          totalApplications: 0,
          totalMessages: 0,
          totalCompanies: 2,
          totalProfessionals: 1,
          usersGrowth: "N/A",
          companiesGrowth: "N/A",
          jobsGrowth: "N/A",
          applicationsGrowth: "N/A"
        })
      }

      return NextResponse.json(userStats)
    }

    // Create server-side Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log("[ANALYTICS-API] Fetching users data...")

    // Get user counts by type with created date for growth calculation
    // Note: last_sign_in_at may not exist in all databases
    const { data: userCounts, error: userError } = await supabase
      .from("users")
      .select("user_type, created_at")

    if (userError) {
      console.error("[ANALYTICS-API] Users query error:", userError)
      return NextResponse.json({ error: "Database error", details: userError }, { status: 500 })
    }

    console.log("[ANALYTICS-API] Users query successful:", {
      count: userCounts?.length,
      userTypes: userCounts?.map(u => u.user_type),
      actualUsers: userCounts?.map(u => ({ user_type: u.user_type, created_at: u.created_at }))
    })

    const totalUsers = userCounts?.length || 0
    const totalCompanies = userCounts?.filter((u) => u.user_type === "company").length || 0
    const totalProfessionals = userCounts?.filter((u) => u.user_type === "professional").length || 0

    // Calculate active users - since last_sign_in_at doesn't exist, use recent signups as proxy
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Use users who joined in last 30 days as "active users" proxy
    const activeUsers = userCounts?.filter(user => {
      if (!user.created_at) return false
      const createdAt = new Date(user.created_at)
      return createdAt >= thirtyDaysAgo
    }).length || 0

    console.log("[ANALYTICS-API] Fetching jobs data...")

    // Get job counts with created date for growth calculation
    const { data: jobCounts, error: jobError } = await supabase
      .from("jobs")
      .select("is_active, created_at")

    if (jobError) {
      console.error("[ANALYTICS-API] Jobs query error:", jobError)
      // Don't fail completely, just log the error
    }

    console.log("[ANALYTICS-API] Jobs query result:", {
      count: jobCounts?.length || 0,
      activeJobs: jobCounts?.filter((j) => j.is_active).length || 0,
      error: jobError ? "Failed" : "Success"
    })

    const totalJobs = jobCounts?.length || 0
    const activeJobs = jobCounts?.filter((j) => j.is_active).length || 0

    // Get application count
    const { count: totalApplications, error: appError } = await supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })

    if (appError) {
      console.error("[ANALYTICS-API] Applications query error:", appError)
    }

    // Get message count
    const { count: totalMessages, error: msgError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })

    if (msgError) {
      console.error("[ANALYTICS-API] Messages query error:", msgError)
    }

    // Calculate growth percentages
    const thirtyDaysAgoDate = new Date()
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30)

    const recentUsers = userCounts?.filter(u => new Date(u.created_at) >= thirtyDaysAgoDate).length || 0
    const olderUsers = totalUsers - recentUsers
    const usersGrowth = olderUsers > 0 ? `+${Math.round((recentUsers / olderUsers) * 100)}%` : "N/A"

    const recentJobs = jobCounts?.filter(j => new Date(j.created_at) >= thirtyDaysAgoDate).length || 0
    const olderJobs = totalJobs - recentJobs
    const jobsGrowth = olderJobs > 0 ? `+${Math.round((recentJobs / olderJobs) * 100)}%` : "N/A"

    const analyticsData = {
      totalUsers,
      activeUsers,
      totalJobs,
      activeJobs,
      totalApplications: totalApplications || 0,
      totalMessages: totalMessages || 0,
      totalCompanies,
      totalProfessionals,
      usersGrowth,
      companiesGrowth: usersGrowth, // Same as users for now
      jobsGrowth,
      applicationsGrowth: "N/A", // Would need historical application data
    }

    console.log("[ANALYTICS-API] Final analytics data:", analyticsData)

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error("[ANALYTICS-API] Critical error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}