// Only same-site paths may be used as a post-auth destination ("/jobs/vacancy/new"),
// never full URLs or protocol-relative ones ("//evil.com"), so links can't redirect off-site.
export function safeReturnUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null
  return value
}
