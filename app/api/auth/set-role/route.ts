import { createClient, createAdminClient } from "@/lib/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/auth/set-role
 *
 * Called from /auth/choose-role after a new OAuth user picks their account type.
 * Updates user_type in public.users and upserts a minimal profile row so the
 * user can enter their dashboard without going through the full onboarding wizard.
 *
 * Body: { role: 'homeowner' | 'company' }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const role = body?.role as string
    if (role !== "homeowner" && role !== "company") {
      return NextResponse.json({ error: "role must be 'homeowner' or 'company'" }, { status: 400 })
    }

    const admin = createAdminClient()

    // ── Extract name/photo from Google/Facebook OAuth metadata ────────────────
    const meta = user.user_metadata ?? {}
    const rawName: string = meta.full_name ?? meta.name ?? ""
    const firstName: string | null =
      meta.given_name ?? meta.first_name ?? rawName.split(" ")[0] ?? null
    const lastName: string | null =
      meta.family_name ?? meta.last_name ?? (rawName.split(" ").slice(1).join(" ") || null)
    const avatarUrl: string | null = meta.avatar_url ?? meta.picture ?? null

    // ── 1. Upsert users row ───────────────────────────────────────────────────
    // Upsert, not update: the row is missing when the signup trigger failed.
    const userPatch: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      user_type: role,
      account_type: role === "company" ? "business" : "individual",
    }
    if (avatarUrl) userPatch.profile_photo_url = avatarUrl
    if (firstName || lastName) {
      userPatch.full_name = [firstName, lastName].filter(Boolean).join(" ") || null
    }
    const { error: userError } = await admin.from("users").upsert(userPatch, { onConflict: "id" })
    if (userError) {
      console.error("[SET-ROLE] users upsert failed:", userError.message)
      const emailTaken = userError.code === "23505"
      return NextResponse.json(
        {
          error: emailTaken
            ? "This email already belongs to another Open Job Market account. Sign in with your email and password instead."
            : "Something went wrong. Please try again.",
        },
        { status: emailTaken ? 409 : 500 },
      )
    }

    // ── 2. Upsert the correct profile row ─────────────────────────────────────
    // We use upsert so re-entrant calls are safe (e.g. user taps back and retries).
    if (role === "homeowner") {
      await admin.from("homeowner_profiles").upsert(
        {
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          profile_photo_url: avatarUrl,
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      )
    } else {
      // For tradespeople we don't have a company name yet — leave it null and let
      // the dashboard guide them to complete their profile.
      await admin.from("company_profiles").upsert(
        {
          user_id: user.id,
          company_name: null,
          logo_url: avatarUrl,
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      )
    }

    const dashboardUrl = role === "homeowner" ? "/dashboard/homeowner" : "/dashboard/company"
    console.log(`[SET-ROLE] user=${user.id} role=${role} → ${dashboardUrl}`)
    return NextResponse.json({ success: true, dashboardUrl })
  } catch (err) {
    console.error("[SET-ROLE] Fatal:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
