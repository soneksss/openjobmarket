import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

// Force Node.js runtime
export const runtime = 'nodejs'

/**
 * Logs CV metadata access to audit log
 */
async function logMetadataAccess(
  supabase: any,
  professionalId: string,
  accessedByUserId: string,
  accessAllowed: boolean,
  accessReason: string
) {
  try {
    await supabase.from('cv_access_audit_log').insert({
      professional_id: professionalId,
      accessed_by_user_id: accessedByUserId,
      access_type: 'metadata',
      access_allowed: accessAllowed,
      access_reason: accessReason,
    })
  } catch (error) {
    console.error("[CV-METADATA] Error logging audit:", error)
  }
}

/**
 * GET /api/cv/metadata?professionalId=xxx
 * Returns CV metadata (ADMIN ONLY - no actual CV content)
 *
 * Access: Admins can view metadata to help users, but cannot access actual CV content
 *
 * Returns metadata like:
 * - has_cv: boolean
 * - cv_source: 'builder' | 'upload' | null
 * - uploaded_file_name: string | null
 * - uploaded_file_size: number | null
 * - uploaded_at: timestamp | null
 * - cv_visibility: string
 * - consent_given: boolean
 * - consent_given_at: timestamp | null
 *
 * Does NOT return actual CV content or sensitive personal data
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[CV-METADATA] Processing metadata request...")

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[CV-METADATA] Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const professionalId = searchParams.get('professionalId')

    console.log("[CV-METADATA] Request details:", {
      requestedBy: user.id,
      professionalId,
    })

    if (!professionalId) {
      return NextResponse.json(
        { error: "Missing professionalId parameter" },
        { status: 400 }
      )
    }

    // Get requesting user's profile
    const { data: requestingUser, error: userError } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (userError || !requestingUser) {
      console.error("[CV-METADATA] Error fetching user:", userError)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // ACCESS CONTROL: Only admins can access this endpoint
    if (requestingUser.user_type !== 'admin') {
      console.log("[CV-METADATA] DENIED - Non-admin user")
      await logMetadataAccess(
        supabase,
        professionalId,
        user.id,
        false,
        'User is not an admin'
      )
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    // Fetch professional profile metadata
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select(`
        id,
        user_id,
        cv_consent_given,
        cv_consent_given_at,
        cv_privacy_policy_version,
        cv_visibility,
        cv_source,
        cv_uploaded_file_name,
        cv_uploaded_file_size,
        cv_uploaded_file_type,
        cv_uploaded_at,
        cv_sensitive_data_warning_acknowledged,
        cv_sensitive_data_warning_acknowledged_at
      `)
      .eq('id', professionalId)
      .single()

    if (profileError || !profile) {
      console.error("[CV-METADATA] Professional profile not found:", profileError)
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      )
    }

    // Check if user has built CV
    const { data: builderCV, error: builderError } = await supabase
      .from('professional_cvs')
      .select('id, updated_at')
      .eq('professional_id', professionalId)
      .single()

    const hasBuilderCV = !builderError && !!builderCV
    const hasUploadedCV = !!profile.cv_uploaded_file_name
    const hasCVAny = hasBuilderCV || hasUploadedCV

    // Calculate last modified timestamp
    let lastModified: string | null = null
    if (profile.cv_source === 'builder' && builderCV?.updated_at) {
      lastModified = builderCV.updated_at
    } else if (profile.cv_source === 'upload' && profile.cv_uploaded_at) {
      lastModified = profile.cv_uploaded_at
    }

    // Log access
    await logMetadataAccess(
      supabase,
      professionalId,
      user.id,
      true,
      'Admin viewing CV metadata'
    )

    console.log("[CV-METADATA] Metadata accessed successfully:", {
      professionalId,
      hasCV: hasCVAny,
      cvSource: profile.cv_source,
    })

    // Return metadata (NO actual CV content)
    const metadata = {
      professional_id: professionalId,
      has_cv: hasCVAny,
      cv_source: profile.cv_source,

      // Consent information
      consent_given: profile.cv_consent_given,
      consent_given_at: profile.cv_consent_given_at,
      privacy_policy_version: profile.cv_privacy_policy_version,

      // Visibility settings
      cv_visibility: profile.cv_visibility,

      // Uploaded file metadata (if applicable)
      uploaded_file_name: profile.cv_uploaded_file_name,
      uploaded_file_size: profile.cv_uploaded_file_size,
      uploaded_file_type: profile.cv_uploaded_file_type,
      uploaded_at: profile.cv_uploaded_at,

      // Builder CV metadata
      has_builder_cv: hasBuilderCV,
      builder_cv_last_modified: builderCV?.updated_at || null,

      // Sensitive data warning
      sensitive_data_warning_acknowledged: profile.cv_sensitive_data_warning_acknowledged,
      sensitive_data_warning_acknowledged_at: profile.cv_sensitive_data_warning_acknowledged_at,

      // Timestamps
      last_modified: lastModified,

      // Privacy notice
      privacy_notice: "This metadata view is for administrative support only. Admins cannot access actual CV content for privacy compliance (GDPR/LGPD).",
    }

    return NextResponse.json(metadata)
  } catch (error: any) {
    console.error("[CV-METADATA] Error:", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json(
      {
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    )
  }
}
