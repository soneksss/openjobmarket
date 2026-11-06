import { createAdminClient } from "@/lib/server"
import { safeReturnUrl } from "@/lib/safe-return-url"

// Where a freshly signed-in user goes next, plus the one-time fixes a new
// OAuth / Sign in with Apple account needs. Shared by /auth/callback (OAuth
// code exchange) and /auth/finish (native Sign in with Apple, where the
// session already exists). Returns a path on this site.
export async function afterSignInPath(
  supabase: any,
  userId: string,
  { accountType, returnUrl }: { accountType: string | null; returnUrl: string | null },
): Promise<string> {
  // ── Step 1: Get current user_type from DB ─────────────────────────────────
  const { data: userData } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", userId)
    .maybeSingle()

  if (!userData) {
    // Row not found at all — trigger hasn't fired yet; send to onboarding
    console.log("[AFTER-SIGN-IN] No users row, sending to onboarding")
    return "/onboarding"
  }

  // ── Step 2: Fix user_type for new OAuth signups ───────────────────────────
  // The handle_new_user trigger defaults user_type to 'professional' when no
  // app metadata is present (Google/Facebook/Apple don't send it).
  // If the signup form passed an account type, apply it now.
  let resolvedUserType = userData.user_type
  if (accountType && userData.user_type === "professional") {
    const intendedType = accountType === "company" ? "company" : "homeowner"
    const { error: updateErr } = await createAdminClient()
      .from("users")
      .update({ user_type: intendedType })
      .eq("id", userId)
    if (updateErr) {
      console.error("[AFTER-SIGN-IN] Failed to fix user_type:", updateErr.message)
    } else {
      console.log("[AFTER-SIGN-IN] Corrected user_type →", intendedType)
      resolvedUserType = intendedType
    }
  }

  // ── Step 3: Unknown role → choose-role page ───────────────────────────────
  // Covers: new social sign-ins that didn't pre-select an account type,
  // legacy 'professional' rows, and any other unrecognised type.
  if (resolvedUserType !== "homeowner" && resolvedUserType !== "company" && resolvedUserType !== "admin") {
    console.log("[AFTER-SIGN-IN] Unknown/unset role, redirecting to choose-role")
    return "/auth/choose-role"
  }

  // ── Step 4: Create profile if missing ────────────────────────────────────
  // This is intentionally non-fatal. If it fails the user still enters the app;
  // a missing profile just means some dashboard sections will be empty.
  const { error: profileError } = await supabase
    .rpc("complete_user_profile_after_verification", { p_user_id: userId })
  if (profileError) {
    console.error("[AFTER-SIGN-IN] Profile RPC error (non-fatal):", profileError.message)
  }

  // ── Step 5: Role-based redirect ───────────────────────────────────────────
  // No first_name / company_name gates — users enter the app immediately.
  // Incomplete profiles are handled with dashboard banners, not redirect loops.
  if (resolvedUserType === "admin") return "/admin/dashboard"
  // Set by the sign-up form when the user started from somewhere specific
  // (e.g. "Staff for my business" → the vacancy form).
  const safeReturn = safeReturnUrl(returnUrl)
  if (safeReturn) return safeReturn
  if (resolvedUserType === "company") return "/dashboard/company"
  return "/dashboard/homeowner"
}
