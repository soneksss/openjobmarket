// Server-only Cloudflare Turnstile verification — never import this from a
// "use client" component (it references the secret key). For the site key,
// use lib/turnstile-client.ts instead.
// Falls back to Cloudflare's published "always passes" test secret when no
// real key is configured, so the flow works out of the box in dev.
// Swap in a real key (from the Cloudflare dashboard -> Turnstile) before shipping.
const TURNSTILE_SECRET_KEY =
  process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA"

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  if (!token) return false
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    })
    const data = await res.json()
    return !!data.success
  } catch {
    return false
  }
}
