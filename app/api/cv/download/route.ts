import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

// Force Node.js runtime
export const runtime = 'nodejs'

type CVSource = 'builder' | 'upload'

/**
 * Logs CV access attempt to audit log (GDPR/LGPD compliance)
 */
async function logCVAccess(
  supabase: any,
  professionalId: string,
  accessedByUserId: string | null,
  accessType: 'view' | 'download' | 'denied',
  accessAllowed: boolean,
  accessReason: string
) {
  try {
    await supabase.from('cv_access_audit_log').insert({
      professional_id: professionalId,
      accessed_by_user_id: accessedByUserId,
      access_type: accessType,
      access_allowed: accessAllowed,
      access_reason: accessReason,
    })
  } catch (error) {
    console.error("[CV-DOWNLOAD] Error logging audit:", error)
    // Don't throw - audit logging failure shouldn't block access
  }
}

/**
 * GET /api/cv/download?professionalId=xxx&type=builder|upload
 * Downloads a CV with access control
 *
 * Access Control Rules:
 * 1. Admins: DENIED (privacy compliance - admins cannot access CV content)
 * 2. Owner: ALLOWED (always)
 * 3. Others: Based on visibility setting
 *    - private: DENIED
 *    - public: ALLOWED
 *    - employers_only: Check employer_privacy_permissions
 *    - per_application: Check specific application
 *
 * Returns: CV file or error response
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[CV-DOWNLOAD] Processing download request...")

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[CV-DOWNLOAD] Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const professionalId = searchParams.get('professionalId')
    const cvType = searchParams.get('type') as CVSource | null

    console.log("[CV-DOWNLOAD] Request details:", {
      requestedBy: user.id,
      professionalId,
      cvType,
    })

    if (!professionalId) {
      return NextResponse.json(
        { error: "Missing professionalId parameter" },
        { status: 400 }
      )
    }

    // Fetch professional profile
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select(`
        id,
        user_id,
        cv_visibility,
        cv_source,
        cv_uploaded_file_path,
        cv_uploaded_file_type
      `)
      .eq('id', professionalId)
      .single()

    if (profileError || !profile) {
      console.error("[CV-DOWNLOAD] Professional profile not found:", profileError)
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      )
    }

    // Get requesting user's profile
    const { data: requestingUser, error: userError } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (userError || !requestingUser) {
      console.error("[CV-DOWNLOAD] Error fetching user:", userError)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // ACCESS CONTROL RULE 1: Admin users CANNOT access CV content (privacy compliance)
    if (requestingUser.user_type === 'admin') {
      console.log("[CV-DOWNLOAD] DENIED - Admin user attempted CV access")
      await logCVAccess(
        supabase,
        professionalId,
        user.id,
        'denied',
        false,
        'Admin users cannot access CV content for privacy compliance (GDPR/LGPD)'
      )
      return NextResponse.json(
        {
          error: "Forbidden: Admins cannot access CV content for privacy compliance. Use /api/cv/metadata for CV information."
        },
        { status: 403 }
      )
    }

    // ACCESS CONTROL RULE 2: Owner can always access their own CV
    const isOwner = profile.user_id === user.id

    if (isOwner) {
      console.log("[CV-DOWNLOAD] ALLOWED - Owner accessing own CV")
      await logCVAccess(
        supabase,
        professionalId,
        user.id,
        'download',
        true,
        'Owner access'
      )
      // Continue to file download
    } else {
      // ACCESS CONTROL RULE 3: Non-owner access based on visibility
      const visibility = profile.cv_visibility

      if (visibility === 'private') {
        console.log("[CV-DOWNLOAD] DENIED - CV is private")
        await logCVAccess(
          supabase,
          professionalId,
          user.id,
          'denied',
          false,
          'CV visibility: private'
        )
        return NextResponse.json(
          { error: "Forbidden: This CV is private" },
          { status: 403 }
        )
      }

      if (visibility === 'public') {
        console.log("[CV-DOWNLOAD] ALLOWED - CV is public")
        await logCVAccess(
          supabase,
          professionalId,
          user.id,
          'download',
          true,
          'CV visibility: public'
        )
        // Continue to file download
      } else if (visibility === 'employers_only') {
        // Check if user is an employer with privacy permissions
        const isEmployer = ['company', 'homeowner'].includes(requestingUser.user_type)

        if (!isEmployer) {
          console.log("[CV-DOWNLOAD] DENIED - User is not an employer")
          await logCVAccess(
            supabase,
            professionalId,
            user.id,
            'denied',
            false,
            'CV visibility: employers_only, but user is not an employer'
          )
          return NextResponse.json(
            { error: "Forbidden: Only employers can access this CV" },
            { status: 403 }
          )
        }

        // Check employer_privacy_permissions
        const employerProfileTable = requestingUser.user_type === 'company'
          ? 'company_profiles'
          : 'homeowner_profiles'

        const { data: employerProfile } = await supabase
          .from(employerProfileTable)
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!employerProfile) {
          console.log("[CV-DOWNLOAD] DENIED - Employer profile not found")
          await logCVAccess(
            supabase,
            professionalId,
            user.id,
            'denied',
            false,
            'Employer profile not found'
          )
          return NextResponse.json(
            { error: "Forbidden: Employer profile not found" },
            { status: 403 }
          )
        }

        // Check privacy permissions
        const { data: permission } = await supabase
          .from('employer_privacy_permissions')
          .select('can_see_personal_info')
          .eq('professional_id', professionalId)
          .eq('employer_id', employerProfile.id)
          .single()

        if (!permission || !permission.can_see_personal_info) {
          console.log("[CV-DOWNLOAD] DENIED - No privacy permission granted")
          await logCVAccess(
            supabase,
            professionalId,
            user.id,
            'denied',
            false,
            'CV visibility: employers_only, but no privacy permission granted'
          )
          return NextResponse.json(
            { error: "Forbidden: No permission to view this CV" },
            { status: 403 }
          )
        }

        console.log("[CV-DOWNLOAD] ALLOWED - Employer with privacy permission")
        await logCVAccess(
          supabase,
          professionalId,
          user.id,
          'download',
          true,
          'CV visibility: employers_only, employer has privacy permission'
        )
        // Continue to file download
      } else if (visibility === 'per_application') {
        console.log("[CV-DOWNLOAD] DENIED - Per-application visibility requires specific application context")
        await logCVAccess(
          supabase,
          professionalId,
          user.id,
          'denied',
          false,
          'CV visibility: per_application (not implemented in this endpoint)'
        )
        return NextResponse.json(
          {
            error: "Forbidden: CV is only visible per application. Please view through job application."
          },
          { status: 403 }
        )
      }
    }

    // ACCESS GRANTED - Proceed to download
    const sourceType = cvType || profile.cv_source

    if (sourceType === 'upload') {
      // Download uploaded file from storage
      if (!profile.cv_uploaded_file_path) {
        return NextResponse.json(
          { error: "No uploaded CV file found" },
          { status: 404 }
        )
      }

      console.log("[CV-DOWNLOAD] Fetching uploaded file:", profile.cv_uploaded_file_path)

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('cv-documents')
        .download(profile.cv_uploaded_file_path)

      if (downloadError || !fileData) {
        console.error("[CV-DOWNLOAD] Error downloading file:", downloadError)
        return NextResponse.json(
          { error: "Error downloading CV file" },
          { status: 500 }
        )
      }

      // Return file as response
      const headers = new Headers()
      headers.set('Content-Type', profile.cv_uploaded_file_type || 'application/pdf')
      headers.set('Content-Disposition', `attachment; filename="cv_${professionalId}.${profile.cv_uploaded_file_path.split('.').pop()}"`)

      return new NextResponse(fileData, {
        status: 200,
        headers,
      })
    } else if (sourceType === 'builder') {
      // For builder CV, return a placeholder for now
      // In production, this would generate PDF from builder data
      return NextResponse.json(
        {
          message: "Builder CV download endpoint - PDF generation to be implemented",
          professionalId,
        },
        { status: 501 } // Not Implemented
      )
    } else {
      return NextResponse.json(
        { error: "No CV found for this profile" },
        { status: 404 }
      )
    }
  } catch (error: any) {
    console.error("[CV-DOWNLOAD] Error:", {
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
