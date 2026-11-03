// Dark planet panel used on the left of the light split windows (welcome guide,
// sign-up, sign-in). Desktop only; small screens show just the white side.

import { Check } from "lucide-react"

export const BRAND_POINTS = ["No fees to post jobs", "No pay-per-lead for trades", "Contact each other directly"]

export function BrandPanel({ headline, children }: { headline: React.ReactNode; children?: React.ReactNode }) {
  return (
    <aside className="relative hidden lg:flex flex-col w-[36%] flex-shrink-0 p-10 text-white bg-[#04120d] overflow-hidden">
      <img src="/hero-space-mobile.webp" alt="" className="absolute inset-0 w-full h-full object-cover object-bottom opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#04120d] via-[#04120d]/70 to-transparent" />
      <div className="relative">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Open Job Market</p>
        <p className="mt-4 text-3xl xl:text-4xl font-bold leading-tight">{headline}</p>
        <div className="mt-8">
          {children ?? (
            <ul className="space-y-3 text-lg text-white/90">
              {BRAND_POINTS.map(t => (
                <li key={t} className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-300" />{t}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}

// Full-page version for auth pages: the planet behind, a light split card in front.
export function AuthSplitLayout({ headline, children }: { headline: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#030a08] flex items-start sm:items-center justify-center px-3 py-4 sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[url('/hero-space-mobile.webp')] md:bg-[url('/hero-space.webp')] bg-cover bg-right-bottom opacity-40" />
      <div className="relative flex w-full max-w-xl lg:max-w-[1100px] lg:w-[70vw] lg:min-h-[640px] overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl shadow-black/50">
        <BrandPanel headline={headline} />
        <div className="flex-1 min-w-0 flex flex-col justify-center p-5 sm:p-8 lg:p-12">{children}</div>
      </div>
    </div>
  )
}
