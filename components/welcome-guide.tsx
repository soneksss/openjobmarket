"use client"

// First-visit guide shown over the map to signed-out visitors. It asks whether
// they're a homeowner or a tradesperson and sends them to the right place.
// The chosen role is a display preference only (cookie, readable by the proxy
// so "/" opens the right map). It never grants access to anything.

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Bell, Briefcase, Check, Hammer, Home, Loader2, MapPin, MessagesSquare, Search, ToggleRight, X } from "lucide-react"
import { TRADE_INDUSTRIES } from "@/lib/data/trade-industries"

type Role = "homeowner" | "tradesperson"
type Step = "closed" | "welcome" | "homeowner" | "tradesperson" | "trade-setup" | "trade-profile"
type Seeded = { id: string; name: string }
type Demand = { jobs: number; businesses: number; seeded: Seeded[] }

const ROLE_COOKIE = "ojm_role"
const DISMISSED_KEY = "ojm_welcome_dismissed"
const OPEN_EVENT = "ojm:open-welcome"
const ROLE_EVENT = "ojm:role-changed"
const TRADES = TRADE_INDUSTRIES.filter(t => t.title !== "Not sure / Other")
// Roughly 20 miles each way around the postcode.
const LAT_SPAN = 0.29
const LNG_SPAN = 0.46
// Below this many open jobs we talk about competition instead of job volume.
const MIN_JOBS_TO_SHOW = 5

function hasAuthCookie() {
  return /(?:^|; )sb-[^=]+-auth-token/.test(document.cookie)
}

function readRole(): Role | null {
  const m = document.cookie.match(/(?:^|; )ojm_role=(homeowner|tradesperson)/)
  return (m?.[1] as Role) ?? null
}

function saveRole(role: Role) {
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=31536000; SameSite=Lax`
}

function demandMessage(d: Demand, trade: string, postcode: string) {
  if (d.jobs >= MIN_JOBS_TO_SHOW)
    return `${d.jobs} open jobs your trade can quote for within 20 miles of ${postcode} right now.`
  if (d.businesses === 0)
    return `No ${trade} business has a profile within 20 miles of ${postcode} yet. Join now and you'll be the first one homeowners here find.`
  if (d.businesses < 5)
    return `Only ${d.businesses} ${trade} ${d.businesses === 1 ? "business has" : "businesses have"} a profile near ${postcode}. Homeowners here have very few to choose from.`
  return `Homeowners near ${postcode} are comparing ${d.businesses} ${trade} businesses. Add yours so you're in the running.`
}

export default function WelcomeGuide({ page }: { page: "trades" | "jobs" }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("closed")
  const [signedIn, setSignedIn] = useState(true)

  const [postcode, setPostcode] = useState("")
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoState, setGeoState] = useState<"idle" | "loading" | "notfound">("idle")
  const [industries, setIndustries] = useState<string[]>([])
  const [demand, setDemand] = useState<Demand | null>(null)
  const [demandLoading, setDemandLoading] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasAuthCookie()) return
    setSignedIn(false)
    const saved = readRole()
    let dismissed = false
    try { dismissed = localStorage.getItem(DISMISSED_KEY) === "1" } catch { /* storage blocked */ }
    if (!saved && !dismissed) setStep("welcome")
    const reopen = () => setStep("welcome")
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  useEffect(() => {
    if (step === "closed") return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss() }
    window.addEventListener("keydown", onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [step])

  // Postcode → coordinates, once it looks like a full UK postcode.
  useEffect(() => {
    setCoords(null)
    const pc = postcode.trim()
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(pc)) { setGeoState("idle"); return }
    setGeoState("loading")
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pc)}&country=gb&format=json&limit=1`, { signal: ctrl.signal })
        .then(r => r.json())
        .then(rows => {
          if (rows?.[0]) { setCoords({ lat: parseFloat(rows[0].lat), lng: parseFloat(rows[0].lon) }); setGeoState("idle") }
          else setGeoState("notfound")
        })
        .catch(() => { if (!ctrl.signal.aborted) setGeoState("notfound") })
    }, 500)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [postcode])

  // Real local demand for the chosen trades: open jobs nearby, and how many
  // businesses in the main trade already have a profile there.
  useEffect(() => {
    setDemand(null)
    if (!coords || industries.length === 0) return
    const bbox = {
      north: String(coords.lat + LAT_SPAN), south: String(coords.lat - LAT_SPAN),
      east: String(coords.lng + LNG_SPAN), west: String(coords.lng - LNG_SPAN),
    }
    const jobsParams = new URLSearchParams({ ...bbox, industries: industries.join(",") })
    const tradersParams = new URLSearchParams({ ...bbox, industry: industries[0].replace(/ & /g, "_AND_") })
    const ctrl = new AbortController()
    setDemandLoading(true)
    const t = setTimeout(() => {
      Promise.all([
        fetch(`/api/jobs?${jobsParams}`, { signal: ctrl.signal }).then(r => r.ok ? r.json() : []),
        fetch(`/api/traders?${tradersParams}`, { signal: ctrl.signal }).then(r => r.ok ? r.json() : []),
      ])
        .then(([jobs, traders]: [any[], any[]]) => {
          setDemand({
            jobs: jobs.length,
            businesses: traders.filter(tr => tr.profile_type === "company").length,
            seeded: traders.filter(tr => tr.profile_type === "seeded").map(tr => ({ id: tr.id, name: tr.name })),
          })
        })
        .catch(() => { /* aborted or offline: no message */ })
        .finally(() => { if (!ctrl.signal.aborted) setDemandLoading(false) })
    }, 300)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [coords, industries])

  const listedMatches = useMemo(() => {
    const q = businessName.trim().toLowerCase()
    if (q.length < 2 || !demand) return []
    return demand.seeded.filter(s => s.name?.toLowerCase().includes(q)).slice(0, 4)
  }, [businessName, demand])

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, "1") } catch { /* storage blocked */ }
    setStep("closed")
  }

  function choose(r: Role) {
    saveRole(r)
    window.dispatchEvent(new Event(ROLE_EVENT))
    setStep(r)
  }

  function goTo(target: "trades" | "jobs", query = "") {
    setStep("closed")
    if (target !== page || query) router.push(`/find-${target}${query}`)
  }

  function postJob() {
    setStep("closed")
    if (page === "trades") window.dispatchEvent(new Event("ojm:post-job"))
    else router.push("/find-trades?postJob=1")
  }

  function browseJobs() {
    const params = new URLSearchParams()
    if (coords) params.set("postcode", postcode.trim().toUpperCase())
    if (industries.length) params.set("industries", industries.join(","))
    const qs = params.toString()
    goTo("jobs", qs ? `?${qs}` : "")
  }

  function createProfile() {
    const params = new URLSearchParams({ source: "welcome", accountType: "company" })
    if (postcode.trim()) params.set("postcode", postcode.trim().toUpperCase())
    if (businessName.trim()) params.set("companyName", businessName.trim())
    if (industries.length) params.set("industries", industries.join("|"))
    router.push(`/auth/sign-up?${params}`)
  }

  const toggleIndustry = (title: string) =>
    setIndustries(prev => prev.includes(title) ? prev.filter(i => i !== title) : [...prev, title])

  if (signedIn || step === "closed") return null

  const trade = industries[0]
  const isTradeFlow = step === "trade-setup" || step === "trade-profile"

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 backdrop-blur-[3px] p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl ojm-glow-panel border border-emerald-400/25 p-5 sm:p-7 outline-none"
      >
        <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>

        {step !== "welcome" && (
          <button
            onClick={() => setStep(step === "trade-profile" ? "trade-setup" : step === "trade-setup" ? "tradesperson" : "welcome")}
            className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}

        {isTradeFlow && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
              <span className="text-emerald-300">Free business profile · No lead fees</span>
              <span className="text-slate-500">Step {step === "trade-setup" ? 1 : 2} of 2</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: step === "trade-setup" ? "50%" : "100%" }} />
            </div>
          </div>
        )}

        {step === "welcome" && (
          <>
            <h2 id="welcome-title" className="text-2xl sm:text-3xl font-bold text-white pr-8">
              Welcome to <span className="ojm-glow-text">Open Job Market</span>
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">Find work. Find tradespeople. Get jobs done.</p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Choose what you want to do</p>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => choose("homeowner")} className="group text-left rounded-xl border p-4 ojm-glow-card">
                <span className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300"><Home className="w-5 h-5" /></span>
                <span className="mt-3 block text-base font-bold text-white">I&apos;m a homeowner</span>
                <span className="mt-0.5 block text-xs text-slate-400">Looking for someone to do a job?</span>
              </button>
              <button onClick={() => choose("tradesperson")} className="group text-left rounded-xl border p-4 ojm-glow-card">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300"><Hammer className="w-5 h-5" /></span>
                <span className="mt-3 block text-base font-bold text-white">I&apos;m a tradesperson</span>
                <span className="mt-0.5 block text-xs text-slate-400">Looking for trade jobs or new customers?</span>
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-emerald-200/80">No fees to post jobs · No hidden charges · Connect directly</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <a href="/home" className="text-slate-300 hover:text-white underline-offset-2 hover:underline">What is Open Job Market?</a>
              <button onClick={dismiss} className="text-slate-500 hover:text-slate-300">Just let me look</button>
            </div>
          </>
        )}

        {step === "homeowner" && (
          <>
            <h2 id="welcome-title" className="text-xl sm:text-2xl font-bold text-white">What would you like to do?</h2>
            <div className="mt-4 space-y-2.5">
              <ChoiceCard icon={<Briefcase className="w-5 h-5" />} tone="emerald" title="Post a job"
                text="Describe what needs doing and get responses from local tradespeople." onClick={postJob} />
              <ChoiceCard icon={<Search className="w-5 h-5" />} tone="sky" title="Find local tradespeople"
                text="Explore the map and contact tradespeople directly." onClick={() => goTo("trades")} />
            </div>
          </>
        )}

        {step === "tradesperson" && (
          <>
            <h2 id="welcome-title" className="text-xl sm:text-2xl font-bold text-white">What would you like to do?</h2>
            <div className="mt-4 space-y-2.5">
              <ChoiceCard icon={<MapPin className="w-5 h-5" />} tone="emerald" title="Get new customers"
                text="Put your business on the map for free, so local homeowners can find and contact you." onClick={() => setStep("trade-setup")} />
              <ChoiceCard icon={<Briefcase className="w-5 h-5" />} tone="sky" title="Find trade jobs"
                text="Browse jobs posted by homeowners near you." onClick={() => goTo("jobs")} />
            </div>
            <p className="mt-4 text-center text-xs text-emerald-200/80">No subscription · No pay-per-lead · No hidden fees</p>
          </>
        )}

        {step === "trade-setup" && (
          <>
            <h2 id="welcome-title" className="text-xl sm:text-2xl font-bold text-white">Let&apos;s put your business on the map</h2>
            <label htmlFor="welcome-postcode" className="mt-4 block text-xs font-semibold text-slate-300">Where are you based?</label>
            <div className="relative mt-1.5">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              <input
                id="welcome-postcode"
                value={postcode}
                onChange={e => setPostcode(e.target.value.toUpperCase())}
                placeholder="Postcode, e.g. PO1 2AB"
                autoComplete="postal-code"
                className="w-full rounded-xl bg-black/30 border border-emerald-400/20 focus:border-emerald-400/60 outline-none pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-slate-500"
              />
              {geoState === "loading" && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
              {coords && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />}
            </div>
            {geoState === "notfound" && <p className="mt-1 text-[11px] text-orange-300">We couldn&apos;t find that postcode.</p>}

            <p className="mt-4 text-xs font-semibold text-slate-300">What work do you do? <span className="font-normal text-slate-500">Pick all that apply</span></p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TRADES.map(t => {
                const on = industries.includes(t.title)
                return (
                  <button key={t.title} onClick={() => toggleIndustry(t.title)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${on
                      ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-100"
                      : "bg-white/[0.03] border-white/10 text-slate-300 hover:border-emerald-400/30"}`}>
                    {on && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}{t.title}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 min-h-[52px]" aria-live="polite">
              {demand && trade ? (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100 leading-relaxed">
                  {demandMessage(demand, trade, postcode.trim().toUpperCase())}
                </div>
              ) : demandLoading ? (
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Checking demand near you…</p>
              ) : (
                <p className="text-xs text-slate-500">Add your postcode and trade to see demand near you.</p>
              )}
            </div>

            <button
              onClick={() => setStep("trade-profile")}
              disabled={!postcode.trim() || industries.length === 0}
              className="mt-4 w-full rounded-xl ojm-glow-button py-3 text-sm font-bold disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {step === "trade-profile" && (
          <>
            <h2 id="welcome-title" className="text-xl sm:text-2xl font-bold text-white">Your business. More work. <span className="ojm-glow-text">Free.</span></h2>

            <label htmlFor="welcome-business" className="mt-4 block text-xs font-semibold text-slate-300">
              Business name <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="welcome-business"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Smith Plumbing"
              autoComplete="organization"
              className="mt-1.5 w-full rounded-xl bg-black/30 border border-emerald-400/20 focus:border-emerald-400/60 outline-none px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
            />
            {listedMatches.length > 0 && (
              <div className="mt-2 rounded-xl border border-sky-400/25 bg-sky-500/5 p-2">
                <p className="px-1 pb-1 text-[11px] text-sky-200">Is this your business? It&apos;s already listed. Claim it for free:</p>
                {listedMatches.map(s => (
                  <a key={s.id} href={`/seeded/${s.id}/claim`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-white hover:bg-white/5">
                    <span className="truncate">{s.name}</span>
                    <span className="flex-shrink-0 text-sky-300 font-semibold">Claim →</span>
                  </a>
                ))}
              </div>
            )}

            <ul className="mt-5 space-y-2.5">
              <Benefit icon={<MapPin className="w-3.5 h-3.5" />} title="Get discovered locally" text="Homeowners near you can find your business on the map." />
              <Benefit icon={<MessagesSquare className="w-3.5 h-3.5" />} title="Receive direct enquiries" text="Homeowners can contact you through the platform." />
              <Benefit icon={<Bell className="w-3.5 h-3.5" />} title="Hear about new jobs" text="Turn on alerts for jobs matching your trade and area." />
              <Benefit icon={<ToggleRight className="w-3.5 h-3.5" />} title="You control your availability" text="Show when you're available, or that you're busy." />
            </ul>
            <p className="mt-4 text-center text-xs font-semibold text-emerald-200">No subscription · No pay-per-lead · No hidden fees</p>

            <button onClick={createProfile} className="mt-4 w-full rounded-xl ojm-glow-button py-3 text-sm font-bold">
              Create my free business profile
            </button>
            <button onClick={browseJobs} className="mt-2 w-full rounded-xl border border-white/15 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5">
              No thanks, I just want to browse jobs
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Small "I'm a homeowner · change" pill. Rendered inside each map's own layout
// so the map's overlays (post-a-job, filters) cover it.
export function WelcomeSwitch() {
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    if (hasAuthCookie()) return
    const sync = () => setRole(readRole())
    sync()
    window.addEventListener(ROLE_EVENT, sync)
    return () => window.removeEventListener(ROLE_EVENT, sync)
  }, [])

  if (!role) return null
  return (
    <button
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="self-center inline-flex items-center gap-1.5 rounded-full ojm-glass px-3 py-1 text-[11px] font-medium text-emerald-100 hover:text-white"
    >
      {role === "homeowner" ? <Home className="w-3 h-3" /> : <Hammer className="w-3 h-3" />}
      I&apos;m a {role}
      <span className="text-emerald-400 font-semibold">· change</span>
    </button>
  )
}

function ChoiceCard({ icon, tone, title, text, onClick }: { icon: React.ReactNode; tone: "emerald" | "sky"; title: string; text: string; onClick: () => void }) {
  const toneCls = tone === "emerald"
    ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
    : "bg-sky-500/15 border-sky-400/30 text-sky-300"
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 text-left rounded-xl border p-3.5 ojm-glow-card">
      <span className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${toneCls}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="block text-xs text-slate-400">{text}</span>
      </span>
      <ArrowRight className="flex-shrink-0 w-4 h-4 text-slate-500" />
    </button>
  )
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">{icon}</span>
      <span className="text-xs text-slate-400"><span className="block text-sm font-semibold text-white">{title}</span>{text}</span>
    </li>
  )
}
