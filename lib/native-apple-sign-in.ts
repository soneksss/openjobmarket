import { registerPlugin } from "@capacitor/core"
import { createClient } from "@/lib/client"

// Sign in with Apple inside the iPhone app: Apple's own sheet (Face ID) via
// the AppleSignIn plugin in ios/App/App/AppleSignIn.swift, then Supabase
// signs the user in with Apple's identity token. Web-based Google/Facebook
// sign-in can't return to the app, so the iPhone app offers this instead.

interface AppleSignInResult {
  identityToken: string
  givenName: string
  familyName: string
  email: string
}

const AppleSignIn = registerPlugin<{ authorize(options: { nonce: string }): Promise<AppleSignInResult> }>("AppleSignIn")

/** True inside the iPhone app on a build that includes the plugin (build 18+). */
export function canUseNativeAppleSignIn(): boolean {
  if (typeof window === "undefined") return false
  const cap = (window as any).Capacitor
  return !!cap?.isNativePlatform?.() && cap.getPlatform?.() === "ios" && !!cap.isPluginAvailable?.("AppleSignIn")
}

/** True inside the iPhone app at all — web-based social sign-in doesn't work there. */
export function isIosApp(): boolean {
  if (typeof window === "undefined") return false
  const cap = (window as any).Capacitor
  return !!cap?.isNativePlatform?.() && cap.getPlatform?.() === "ios"
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Runs the whole sign-in and then navigates to /auth/finish, which applies the
 * account type and sends the user on. Resolves "cancelled" if they closed
 * Apple's sheet; throws on a real failure.
 */
export async function signInWithAppleNative(
  { accountType, returnUrl }: { accountType?: string | null; returnUrl?: string | null } = {},
): Promise<"cancelled" | void> {
  // Apple gets the hashed nonce; Supabase checks the raw one against it.
  const rawNonce = `${crypto.randomUUID()}${crypto.randomUUID()}`
  let result: AppleSignInResult
  try {
    result = await AppleSignIn.authorize({ nonce: await sha256Hex(rawNonce) })
  } catch (err: any) {
    if (err?.code === "CANCELED") return "cancelled"
    throw err
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: result.identityToken, nonce: rawNonce })
  if (error) throw error

  // Apple shares the name only on the very first sign-in — keep it.
  const fullName = [result.givenName, result.familyName].filter(Boolean).join(" ")
  if (fullName) {
    await supabase.auth.updateUser({
      data: { full_name: fullName, first_name: result.givenName, last_name: result.familyName },
    }).catch(() => {})
  }

  const params = new URLSearchParams()
  if (accountType) params.set("account_type", accountType)
  if (returnUrl) params.set("returnUrl", returnUrl)
  window.location.href = `/auth/finish${params.size ? `?${params}` : ""}`
}
