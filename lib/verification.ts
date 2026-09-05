/**
 * Shared types + display helpers for the tradesperson verification layer.
 *
 * "Registered" = usable profile (no gating — existing behaviour, unchanged).
 * "Verified"   = an OpenJobMarket admin has manually checked a specific piece
 *                of information. Shown per-category, never as a blanket claim.
 */

export type VerificationType = "business" | "company_registration" | "insurance"

export type ItemStatus =
  | "not_verified"
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "revoked"

export type EnvelopeStatus =
  | "not_requested"
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "revoked"

/** Per-category row as returned to the owner (private). */
export interface VerificationItem {
  type: VerificationType
  status: ItemStatus
  verified_at: string | null
  expires_at: string | null
  rejection_reason?: string | null
}

/** The owner's full verification state. */
export interface OwnerVerification {
  status: EnvelopeStatus
  requested_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  items: VerificationItem[]
}

/** Public-safe row from get_company_public_verification(). */
export interface PublicVerificationItem {
  type: VerificationType
  status: "verified" | "expired"
  verified_at: string | null
  expires_at: string | null
}

export const VERIFICATION_LABELS: Record<VerificationType, string> = {
  business: "Business details",
  company_registration: "Company registration",
  insurance: "Insurance",
}

/** Human label for a status, used on the private (owner/admin) side. */
export function itemStatusLabel(status: ItemStatus): string {
  switch (status) {
    case "verified": return "Verified"
    case "pending": return "Pending review"
    case "rejected": return "Not verified"
    case "expired": return "Expired"
    case "revoked": return "Withdrawn"
    default: return "Not verified"
  }
}

/** Tailwind classes for a small status pill (owner/admin side). */
export function itemStatusPill(status: ItemStatus): string {
  switch (status) {
    case "verified": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "pending": return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "expired": return "bg-orange-500/15 text-orange-400 border-orange-500/30"
    case "rejected":
    case "revoked": return "bg-slate-700/60 text-slate-400 border-slate-600/50"
    default: return "bg-slate-700/60 text-slate-400 border-slate-600/50"
  }
}

/** Does this company have at least one currently-valid admin verification?
 *  Drives the small "Verified" badge on cards / the map. */
export function hasActiveVerification(items: PublicVerificationItem[] | null | undefined): boolean {
  return !!items?.some((i) => i.status === "verified")
}

export function getPublicItem(
  items: PublicVerificationItem[] | null | undefined,
  type: VerificationType,
): PublicVerificationItem | undefined {
  return items?.find((i) => i.type === type)
}

/** dd MMM yyyy — matches the app's existing date style. */
export function formatVerifiedDate(iso: string | null | undefined): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
