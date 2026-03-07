import { createClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

// GET - Poll for urgent job responses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get the job to verify ownership and get urgency details
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select(`
        id,
        title,
        urgency_type,
        search_state,
        search_radius_miles,
        homeowner_id,
        company_id
      `)
      .eq("id", jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    // Verify user owns this job
    let isOwner = false

    // Check homeowner ownership
    if (job.homeowner_id) {
      const { data: homeownerProfile } = await supabase
        .from("homeowner_profiles")
        .select("user_id")
        .eq("id", job.homeowner_id)
        .single()
      isOwner = homeownerProfile?.user_id === user.id
    }

    // Check company ownership
    if (!isOwner && job.company_id) {
      const { data: companyProfile } = await supabase
        .from("company_profiles")
        .select("user_id")
        .eq("id", job.company_id)
        .single()
      isOwner = companyProfile?.user_id === user.id
    }

    if (!isOwner) {
      console.error("[URGENT-RESPONSES] User not authorized:", {
        userId: user.id,
        jobId,
        homeownerId: job.homeowner_id,
        companyId: job.company_id
      })
      return NextResponse.json(
        { error: "Not authorized to view responses for this job" },
        { status: 403 }
      )
    }

    // Get applications/responses to this job from tradespeople
    const { data: applications, error: applicationsError } = await supabase
      .from("job_applications")
      .select(`
        id,
        status,
        created_at,
        professional_id,
        contractor_id,
        company_id,
        professional_profiles (
          id,
          user_id,
          first_name,
          last_name,
          business_name,
          avatar_url,
          location,
          verified
        ),
        contractor_profiles (
          id,
          user_id,
          company_name,
          avatar_url,
          location,
          verified
        ),
        company_profiles (
          id,
          user_id,
          company_name,
          logo_url,
          location,
          verified
        )
      `)
      .eq("job_id", jobId)
      .in("status", ["PENDING", "pending", "interested", "available"])
      .order("created_at", { ascending: false })

    if (applicationsError) {
      console.error("[URGENT-RESPONSES] Error fetching applications:", applicationsError)
      return NextResponse.json(
        { error: "Failed to fetch responses" },
        { status: 500 }
      )
    }

    // Get count of dispatched alerts to tradespeople
    // This table may not exist yet, so handle gracefully
    let notifiedCount = 0
    try {
      const { count, error: alertError } = await supabase
        .from("urgent_job_dispatch_alerts")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jobId)

      if (!alertError && count !== null) {
        notifiedCount = count
      }
    } catch (err) {
      // Table might not exist, that's okay
      console.log("[URGENT-RESPONSES] No dispatch alerts table or empty result")
    }

    // Format responses for the frontend
    const responses = (applications || []).map((app: any) => {
      let profile = null
      let type = ""

      if (app.professional_profiles) {
        profile = app.professional_profiles
        type = "professional"
      } else if (app.contractor_profiles) {
        profile = app.contractor_profiles
        type = "contractor"
      } else if (app.company_profiles) {
        profile = app.company_profiles
        type = "company"
      }

      if (!profile) return null

      // Get name based on profile type
      const name = type === "professional"
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : profile.company_name || profile.business_name || "Unknown"

      // Get avatar
      const avatar_url = profile.avatar_url || profile.logo_url || null

      return {
        id: profile.id,
        user_id: profile.user_id,
        name,
        business_name: profile.business_name || profile.company_name,
        avatar_url,
        rating: 4.5, // TODO: Fetch actual rating from reviews
        review_count: 12, // TODO: Fetch actual review count
        distance_miles: 2.5, // TODO: Calculate actual distance
        response_time: "Responded just now",
        verified: profile.verified || false,
        phone: null, // Don't expose phone until contact is initiated
        type
      }
    }).filter(Boolean)

    return NextResponse.json({
      success: true,
      responses,
      notifiedCount: notifiedCount || 0,
      searchState: job.search_state,
      searchRadius: job.search_radius_miles
    })

  } catch (error) {
    console.error("[URGENT-RESPONSES] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Mark job as interested/responded (for tradespeople)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get the user's profile based on their type
    const { data: userData } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    // Determine which profile ID to use
    let profileId = null
    let profileField = ""

    if (userData.user_type === "professional") {
      const { data: profile } = await supabase
        .from("professional_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()
      profileId = profile?.id
      profileField = "professional_id"
    } else if (userData.user_type === "contractor") {
      const { data: profile } = await supabase
        .from("contractor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()
      profileId = profile?.id
      profileField = "contractor_id"
    } else if (userData.user_type === "company") {
      const { data: profile } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single()
      profileId = profile?.id
      profileField = "company_id"
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      )
    }

    // Check if application already exists
    const { data: existingApp } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq(profileField, profileId)
      .single()

    if (existingApp) {
      // Update existing application
      const { error: updateError } = await supabase
        .from("job_applications")
        .update({
          status: "interested",
          updated_at: new Date().toISOString()
        })
        .eq("id", existingApp.id)

      if (updateError) {
        console.error("[URGENT-RESPONSES] Error updating application:", updateError)
        return NextResponse.json(
          { error: "Failed to update response" },
          { status: 500 }
        )
      }
    } else {
      // Create new application
      const { error: insertError } = await supabase
        .from("job_applications")
        .insert({
          job_id: jobId,
          [profileField]: profileId,
          status: "interested",
          message: body.message || null
        })

      if (insertError) {
        console.error("[URGENT-RESPONSES] Error creating application:", insertError)
        return NextResponse.json(
          { error: "Failed to submit response" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: "Response submitted successfully"
    })

  } catch (error) {
    console.error("[URGENT-RESPONSES] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
