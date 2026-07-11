// Client-safe half of the Turnstile config — the site key only. Never import
// lib/turnstile.ts (server verification + secret key) from client components.
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"
