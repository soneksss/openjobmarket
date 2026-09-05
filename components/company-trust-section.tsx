import { ShieldCheck, CheckCircle2 } from "lucide-react"
import {
  type PublicVerificationItem,
  getPublicItem,
  hasActiveVerification,
  formatVerifiedDate,
} from "@/lib/verification"

/**
 * Public "Trust & verification" panel for a tradesperson profile.
 *
 * Shows ONLY what an OpenJobMarket admin has actually verified — one line per
 * category, never a blanket "everything checked" badge. Renders nothing when
 * there is no verification, so existing profiles are visually unchanged.
 *
 * Never exposes: uploaded certificates, internal admin notes, or private
 * business details beyond what the public profile already shows.
 */
export function CompanyTrustSection({
  verification,
  company,
}: {
  verification: PublicVerificationItem[] | null | undefined
  company: {
    business_type?: "limited_company" | "sole_trader" | null
    company_registration_number?: string | null
    insurance_provider?: string | null
    insurance_policy_type?: string | null
    insurance_cover_amount?: string | null
  }
}) {
  if (!hasActiveVerification(verification)) return null

  const business = getPublicItem(verification, "business")
  const registration = getPublicItem(verification, "company_registration")
  const insurance = getPublicItem(verification, "insurance")

  const businessVerified = business?.status === "verified"
  const registrationVerified = registration?.status === "verified"
  const insuranceVerified = insurance?.status === "verified"
  const insuranceExpired = insurance?.status === "expired"

  // "Verified by OpenJobMarket" date = most recent verified_at we have.
  const verifiedDates = (verification ?? [])
    .filter((i) => i.status === "verified" && i.verified_at)
    .map((i) => new Date(i.verified_at as string).getTime())
  const verifiedOn = verifiedDates.length ? formatVerifiedDate(new Date(Math.max(...verifiedDates)).toISOString()) : ""

  return (
    <section className="rounded-2xl border border-emerald-800/40 bg-emerald-950/25 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Trust &amp; verification
      </h2>

      <div className="space-y-4">
        {businessVerified && (
          <div>
            <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Business verified
            </p>
            <ul className="mt-1.5 space-y-1 pl-4">
              <li className="text-xs text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Company details verified
              </li>
              {registrationVerified && (
                <li className="text-xs text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" /> Company registration verified
                </li>
              )}
            </ul>
          </div>
        )}

        {insuranceVerified && (
          <div>
            <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Insurance verified
            </p>
            <div className="mt-1.5 pl-4 space-y-0.5 text-xs text-slate-300">
              {(company.insurance_policy_type || company.insurance_provider) && (
                <p>{company.insurance_policy_type || "Insurance"}{company.insurance_provider ? ` · ${company.insurance_provider}` : ""}</p>
              )}
              {company.insurance_cover_amount && <p>{company.insurance_cover_amount} cover</p>}
              {insurance?.expires_at && (
                <p className="text-slate-400">
                  Expires {new Date(insurance.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        )}

        {insuranceExpired && (
          <div>
            <p className="text-sm font-semibold text-orange-400 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-400" /> Insurance expired
            </p>
            <p className="mt-1 pl-4 text-xs text-slate-400">
              Previously verified insurance{insurance?.expires_at ? ` lapsed on ${new Date(insurance.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
            </p>
          </div>
        )}
      </div>

      {verifiedOn && (
        <p className="mt-4 pt-3 border-t border-emerald-900/40 text-[11px] text-slate-500">
          <span className="text-slate-400 font-medium">Verified by OpenJobMarket</span> · {verifiedOn}
        </p>
      )}
    </section>
  )
}
