import { createClient, createAdminClient } from "@/lib/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = 'nodejs'

interface DeleteAccountRequest {
  primaryReason: string
  customMessage?: string
  userEmail: string
  userPassword: string
}

export async function POST(request: Request) {
  try {
    const body: DeleteAccountRequest = await request.json()
    const { primaryReason, customMessage, userEmail, userPassword } = body

    // Validate required fields
    if (!primaryReason || !userEmail || !userPassword) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Create Supabase client (uses cookies internally)
    const supabase = await createClient()
    const cookieStore = await cookies()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      )
    }

    console.log("[API] Account deletion requested for user:", user.id, user.email)

    // Step 1: Check for orphaned state before deletion (optional - function may not exist)
    try {
      const { data: orphanedCheck, error: orphanedCheckError } = await supabase.rpc(
        "detect_orphaned_user_state",
        { p_user_id: user.id }
      )

      if (orphanedCheckError) {
        // Function might not exist - this is OK, it's optional
        console.log("[API] Orphaned state check skipped (function may not exist):", orphanedCheckError.message)
      } else if (orphanedCheck && orphanedCheck.is_corrupted) {
        console.warn("[API] User is in corrupted state:", orphanedCheck.issues)
        // Attempt recovery before deletion
        const { error: recoveryError } = await supabase.rpc("recover_orphaned_user", {
          p_user_id: user.id,
        })
        if (recoveryError) {
          console.warn("[API] Recovery failed, proceeding with deletion anyway:", recoveryError)
        } else {
          console.log("[API] Successfully recovered orphaned user state")
        }
      }
    } catch (orphanedError) {
      // Silently continue - orphaned user detection is optional
      console.log("[API] Orphaned state detection skipped:", orphanedError)
    }

    // Step 2: Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    })

    if (signInError) {
      console.log("[API] Password verification failed:", signInError.message)
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 403 }
      )
    }

    console.log("[API] Password verified, proceeding with deletion")

    // Sanitize reason to known enum values; unknown values fall back to 'other'
    // to prevent "invalid input value for enum deletion_reason_type" errors.
    const KNOWN_REASONS = [
      'cant_find_what_looking_for', 'not_enough_users', 'too_complicated',
      'poor_ux', 'trust_safety_concerns', 'found_alternative', 'temporary_use',
      'technical_issues', 'privacy_concerns', 'not_using', 'other',
    ]
    const safePrimaryReason = KNOWN_REASONS.includes(primaryReason) ? primaryReason : 'other'

    // Step 3: Call comprehensive deletion function
    let { data: deleteResult, error: deleteError } = await supabase.rpc(
      "delete_user_comprehensive",
      {
        p_primary_reason: safePrimaryReason,
        p_custom_message: customMessage || null,
        p_user_email: userEmail,
        p_user_password: userPassword,
      }
    )

    // If the reason still causes an enum error (DB enum missing the value), retry with 'other'
    if (deleteError && (deleteError.message?.includes('invalid input value for enum') || deleteError.code === '22P02')) {
      console.warn("[API] Enum error with reason, retrying with 'other':", deleteError.message)
      ;({ data: deleteResult, error: deleteError } = await supabase.rpc(
        "delete_user_comprehensive",
        {
          p_primary_reason: 'other',
          p_custom_message: customMessage || null,
          p_user_email: userEmail,
          p_user_password: userPassword,
        }
      ))
    }

    if (deleteError) {
      console.error("[API] Deletion function error:", JSON.stringify(deleteError, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: deleteError.message || "Failed to delete account",
          details: deleteError.code || deleteError.hint || null
        },
        { status: 500 }
      )
    }

    // Check if function returned error
    if (deleteResult && !deleteResult.success) {
      console.error("[API] Deletion function returned error:", deleteResult.error)
      return NextResponse.json(
        { success: false, error: deleteResult.error },
        { status: 500 }
      )
    }

    console.log("[API] Account deletion successful:", deleteResult)

    // Step 4: Delete auth user via Admin API (SQL DELETE FROM auth.users in the RPC
    // silently fails because the postgres role lacks permission on auth.users)
    try {
      const adminClient = createAdminClient()
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id)
      if (authDeleteError) {
        console.error("[API] Admin auth deletion error:", authDeleteError)
        // Don't fail the request — public data is already deleted, user is effectively gone
      } else {
        console.log("[API] Auth user deleted via Admin API")
      }
    } catch (adminError) {
      console.error("[API] Admin client error during auth deletion:", adminError)
    }

    // Step 6: Force sign out on server side
    // Note: This will likely fail with 403 because user no longer exists,
    // but we try anyway for completeness
    try {
      await supabase.auth.signOut()
      console.log("[API] Server-side sign out successful")
    } catch (signOutError) {
      console.log("[API] Server-side sign out failed (expected):", signOutError)
      // Expected to fail since user is deleted, continue anyway
    }

    // Step 7: Clear all auth cookies (non-critical - don't fail if this fails)
    try {
      const cookiesToClear = [
        'sb-access-token',
        'sb-refresh-token',
        'supabase-auth-token',
        'sb-localhost-auth-token',
        'sb-localhost-auth-token-code-verifier',
      ]

      cookiesToClear.forEach((cookieName) => {
        try {
          cookieStore.delete(cookieName)
        } catch {
          // Individual cookie deletion failure is OK
        }
      })

      console.log("[API] Auth cookies cleared")
    } catch (cookieError) {
      console.log("[API] Cookie clearing failed (non-critical):", cookieError)
      // Continue anyway - account is already deleted
    }

    // Step 8: Return success with redirect instruction
    return NextResponse.json(
      {
        success: true,
        message: "Account successfully deleted",
        redirect: "/",
        alreadyDeleted: deleteResult?.already_deleted || false,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[API] Unexpected error during account deletion:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}
