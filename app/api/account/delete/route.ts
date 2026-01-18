import { createClient } from "@/lib/server"
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

    // Create Supabase client with cookies
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

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

    // Step 1: Check for orphaned state before deletion
    const { data: orphanedCheck, error: orphanedCheckError } = await supabase.rpc(
      "detect_orphaned_user_state",
      { p_user_id: user.id }
    )

    if (orphanedCheckError) {
      console.warn("[API] Failed to check orphaned state:", orphanedCheckError)
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

    // Step 3: Call comprehensive deletion function
    const { data: deleteResult, error: deleteError } = await supabase.rpc(
      "delete_user_comprehensive",
      {
        p_primary_reason: primaryReason,
        p_custom_message: customMessage || null,
        p_user_email: userEmail,
        p_user_password: userPassword,
      }
    )

    if (deleteError) {
      console.error("[API] Deletion function error:", deleteError)
      return NextResponse.json(
        { success: false, error: deleteError.message || "Failed to delete account" },
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

    // Step 4: Force sign out on server side
    // Note: This will likely fail with 403 because user no longer exists,
    // but we try anyway for completeness
    try {
      await supabase.auth.signOut()
      console.log("[API] Server-side sign out successful")
    } catch (signOutError) {
      console.log("[API] Server-side sign out failed (expected):", signOutError)
      // Expected to fail since user is deleted, continue anyway
    }

    // Step 5: Clear all auth cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'sb-localhost-auth-token',
      'sb-localhost-auth-token-code-verifier',
    ]

    cookiesToClear.forEach((cookieName) => {
      cookieStore.delete(cookieName)
    })

    console.log("[API] Auth cookies cleared")

    // Step 6: Return success with redirect instruction
    return NextResponse.json(
      {
        success: true,
        message: "Account successfully deleted",
        redirect: "/auth/signup",
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
