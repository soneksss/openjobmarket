const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns true if the string is a full UUID (e.g. from an old /jobs/<uuid> URL) */
export function isUUID(str: string): boolean {
  return UUID_REGEX.test(str)
}

/** Returns the canonical job URL: slug-based if available, UUID fallback otherwise */
export function getJobUrl(job: { id: string; slug?: string | null }): string {
  return `/jobs/${job.slug ?? job.id}`
}
