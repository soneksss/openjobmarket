import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

// Force Node.js runtime
export const runtime = 'nodejs'

/**
 * POST /api/cv/consent
 * Records user consent for CV data processing (GDPR/LGPD compliance)
 *
 * Body: { professionalId: string, consentGiven: boolean }
 * Returns: { success: boolean, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[CV-CONSENT] Processing consent request...")

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[CV-CONSENT] Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { professionalId, consentGiven } = body

    console.log("[CV-CONSENT] Request details:", {
      userId: user.id,
      professionalId,
      consentGiven,
    })

    // Validate required fields
    if (!professionalId || typeof consentGiven !== 'boolean') {
      console.log("[CV-CONSENT] Missing or invalid required fields")
      return NextResponse.json(
        { error: "Missing required fields: professionalId and consentGiven" },
        { status: 400 }
      )
    }

    // Verify the professional profile belongs to the authenticated user
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, user_id')
      .eq('id', professionalId)
      .single()

    if (profileError || !profile) {
      console.error("[CV-CONSENT] Professional profile not found:", profileError)
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      )
    }

    if (profile.user_id !== user.id) {
      console.log("[CV-CONSENT] User does not own this profile")
      return NextResponse.json(
        { error: "Unauthorized: You do not own this profile" },
        { status: 403 }
      )
    }

    // Update consent in professional_profiles
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update({
        cv_consent_given: consentGiven,
        cv_consent_given_at: consentGiven ? new Date().toISOString() : null,
        cv_privacy_policy_version: consentGiven ? '1.0' : null,
      })
      .eq('id', professionalId)

    if (updateError) {
      console.error("[CV-CONSENT] Failed to update consent:", updateError)
      return NextResponse.json(
        { error: "Failed to record consent. Please try again." },
        { status: 500 }
      )
    }

    console.log("[CV-CONSENT] Consent recorded successfully:", {
      professionalId,
      consentGiven,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: consentGiven
        ? "Consent recorded successfully"
        : "Consent withdrawn successfully",
    })
  } catch (error: any) {
    console.error("[CV-CONSENT] Error:", {
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
