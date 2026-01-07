import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

// Force Node.js runtime
export const runtime = 'nodejs'

type CVVisibility = 'private' | 'public' | 'employers_only' | 'per_application'

const VALID_VISIBILITY_OPTIONS: CVVisibility[] = [
  'private',
  'public',
  'employers_only',
  'per_application'
]

/**
 * PUT /api/cv/visibility
 * Updates CV visibility settings for a professional profile
 *
 * Body: { professionalId: string, visibility: CVVisibility }
 * Returns: { success: boolean, message: string }
 */
export async function PUT(request: NextRequest) {
  try {
    console.log("[CV-VISIBILITY] Processing visibility update request...")

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[CV-VISIBILITY] Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { professionalId, visibility } = body

    console.log("[CV-VISIBILITY] Request details:", {
      userId: user.id,
      professionalId,
      visibility,
    })

    // Validate required fields
    if (!professionalId || !visibility) {
      console.log("[CV-VISIBILITY] Missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: professionalId and visibility" },
        { status: 400 }
      )
    }

    // Validate visibility option
    if (!VALID_VISIBILITY_OPTIONS.includes(visibility)) {
      console.log("[CV-VISIBILITY] Invalid visibility option:", visibility)
      return NextResponse.json(
        {
          error: `Invalid visibility option. Must be one of: ${VALID_VISIBILITY_OPTIONS.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Verify professional profile belongs to user
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, user_id, cv_visibility')
      .eq('id', professionalId)
      .single()

    if (profileError || !profile) {
      console.error("[CV-VISIBILITY] Professional profile not found:", profileError)
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      )
    }

    if (profile.user_id !== user.id) {
      console.log("[CV-VISIBILITY] User does not own this profile")
      return NextResponse.json(
        { error: "Unauthorized: You do not own this profile" },
        { status: 403 }
      )
    }

    // Check if visibility is actually changing
    if (profile.cv_visibility === visibility) {
      console.log("[CV-VISIBILITY] No change needed")
      return NextResponse.json({
        success: true,
        message: "Visibility already set to this value",
      })
    }

    // Update CV visibility
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update({
        cv_visibility: visibility,
      })
      .eq('id', professionalId)

    if (updateError) {
      console.error("[CV-VISIBILITY] Error updating visibility:", updateError)
      return NextResponse.json(
        { error: "Failed to update visibility. Please try again." },
        { status: 500 }
      )
    }

    console.log("[CV-VISIBILITY] Visibility updated successfully:", {
      professionalId,
      oldVisibility: profile.cv_visibility,
      newVisibility: visibility,
    })

    return NextResponse.json({
      success: true,
      message: "CV visibility updated successfully",
      visibility,
    })
  } catch (error: any) {
    console.error("[CV-VISIBILITY] Error:", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    )
  }
}
