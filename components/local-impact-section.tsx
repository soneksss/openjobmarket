import { Leaf, MapPin, Truck, Route, Fuel } from "lucide-react"

/**
 * "Local Impact" / "Good to know" marketing section.
 *
 * Shows that Open Job Market's super-local model can mean less unnecessary
 * travel — using ONE real platform figure (average job distance) alongside
 * published UK Government transport statistics, clearly labelled apart.
 *
 * ── Future-ready ───────────────────────────────────────────────────────────
 * Pass live platform numbers via `stats` to replace/extend the display later.
 * Only `avgJobDistanceMiles` is wired today (defaults to the measured 0.5 mi
 * from the admin analytics page); the rest are declared so the calculations
 * can be added without touching the layout. Do NOT invent values — leave a
 * field undefined and its card is simply not rendered.
 */
export interface PlatformImpactStats {
  /** Average distance between a tradesperson and the job they selected. */
  avgJobDistanceMiles?: number
  /** Jobs where the matched tradesperson was inside their local radius. */
  jobsMatchedLocally?: number
  /** Estimated vehicle miles not driven vs a non-local baseline. */
  estimatedMilesAvoided?: number
  /** Estimated CO₂e not emitted, in kg. */
  estimatedCo2eAvoidedKg?: number
  /** Share of completed jobs within 5 miles of the tradesperson, 0–100. */
  pctJobsWithin5Miles?: number
}

/** The one figure we can stand behind from real platform data today
 *  (average distance shown on the admin analytics page). */
const DEFAULT_STATS: PlatformImpactStats = {
  avgJobDistanceMiles: 0.5,
}

type StatCard = {
  value: string
  label: string
  icon: React.ElementType
  /** "platform" = Open Job Market data · "uk" = UK Government statistic */
  kind: "platform" | "uk"
}

function buildCards(stats: PlatformImpactStats): StatCard[] {
  const cards: StatCard[] = []

  if (stats.avgJobDistanceMiles != null) {
    const mi = stats.avgJobDistanceMiles
    cards.push({
      value: mi === 1 ? "1 mile" : `${mi} miles`,
      label: "Average distance from a tradesperson to the job they picked",
      icon: MapPin,
      kind: "platform",
    })
  }
  if (stats.pctJobsWithin5Miles != null) {
    cards.push({
      value: `${Math.round(stats.pctJobsWithin5Miles)}%`,
      label: "Of jobs matched within 5 miles of the tradesperson",
      icon: Route,
      kind: "platform",
    })
  }
  if (stats.jobsMatchedLocally != null) {
    cards.push({
      value: stats.jobsMatchedLocally.toLocaleString(),
      label: "Jobs matched with a local tradesperson",
      icon: MapPin,
      kind: "platform",
    })
  }
  if (stats.estimatedMilesAvoided != null) {
    cards.push({
      value: `${Math.round(stats.estimatedMilesAvoided).toLocaleString()} mi`,
      label: "Estimated vehicle miles avoided",
      icon: Route,
      kind: "platform",
    })
  }
  if (stats.estimatedCo2eAvoidedKg != null) {
    const kg = stats.estimatedCo2eAvoidedKg
    cards.push({
      value: kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`,
      label: "Estimated CO₂e avoided",
      icon: Leaf,
      kind: "platform",
    })
  }

  // Published UK Government statistics — fixed, evidence-based context.
  cards.push(
    { value: "70%", label: "Of trips in England are under 5 miles", icon: Route, kind: "uk" },
    { value: "17%", label: "Of motor-vehicle traffic in Great Britain is vans", icon: Truck, kind: "uk" },
    { value: "32%", label: "Of UK greenhouse-gas emissions came from transport in 2024", icon: Fuel, kind: "uk" },
  )

  return cards
}

const COPY = {
  homeowner: {
    eyebrow: "Good to know",
    heading: "Local jobs, less unnecessary travel",
    intro:
      "Open Job Market is built around local work. When tradespeople find jobs nearby — or on the way home — there can be less unnecessary driving, less fuel used and fewer emissions.",
    points: [] as string[],
  },
  tradesperson: {
    eyebrow: "Good to know",
    heading: "Work closer to home",
    intro:
      "Open Job Market is built around local work, so the jobs you see are near you — not across the county.",
    points: [
      "Pick jobs close to you",
      "Spend less time travelling",
      "Find work on the way home",
      "Keep more of your working day productive",
    ],
  },
} as const

export function LocalImpactSection({
  variant,
  stats,
  embedded = false,
}: {
  variant: "homeowner" | "tradesperson"
  stats?: PlatformImpactStats
  /** true = drop the full-bleed section chrome and render as a card that slots
   *  into an existing page layout (e.g. the About page). */
  embedded?: boolean
}) {
  const copy = COPY[variant]
  const cards = buildCards({ ...DEFAULT_STATS, ...stats })

  const body = (
    <>
      {/* Header */}
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400/80 mb-2">
            <Leaf className="h-3.5 w-3.5" />
            {copy.eyebrow}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-white">{copy.heading}</h2>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">{copy.intro}</p>
        </div>

        {/* Tradesperson benefit points */}
        {copy.points.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
            {copy.points.map((p) => (
              <div
                key={p}
                className="flex items-center gap-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 px-3.5 py-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-sm text-slate-200">{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {cards.map((c) => {
            const Icon = c.icon
            const isPlatform = c.kind === "platform"
            return (
              <div
                key={c.label}
                className={`rounded-2xl border p-4 flex flex-col ${
                  isPlatform
                    ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent"
                    : "border-slate-700/50 bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isPlatform ? "bg-emerald-500/15" : "bg-slate-700/50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isPlatform ? "text-emerald-400" : "text-slate-300"}`} />
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      isPlatform
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-700/60 text-slate-300"
                    }`}
                  >
                    {isPlatform ? "Open Job Market data" : "UK Government data"}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white leading-none">{c.value}</div>
                <div className="text-xs text-slate-300 mt-1.5 leading-snug">{c.label}</div>
              </div>
            )
          })}
        </div>

        {/* Supporting context */}
        <p className="text-xs text-slate-400 leading-relaxed mt-5 max-w-3xl">
          Cars account for 76% of passenger travel distance in England, and road transport produces
          89% of the UK's domestic transport greenhouse-gas emissions — so shorter, local trips add up.
        </p>

        {/* Sources / methodology */}
        <p className="text-[11px] text-slate-500 leading-relaxed mt-3 max-w-3xl">
          Sources: UK Department for Transport — National Travel Survey and road traffic statistics;
          UK Department for Energy Security &amp; Net Zero — 2024 provisional greenhouse-gas figures.
          “Open Job Market data” is the mean straight-line distance between a tradesperson's registered
          location and the job they selected. Figures are indicative, not a guarantee of savings on any
          individual job.
        </p>
    </>
  )

  if (embedded) {
    return (
      <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 sm:p-6">
        {body}
      </section>
    )
  }

  return (
    <section className="py-10 border-t border-slate-800/60">
      <div className="container mx-auto px-4 max-w-5xl">{body}</div>
    </section>
  )
}
