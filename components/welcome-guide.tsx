"use client"

// First-visit guide shown over the map to signed-out visitors. It asks whether
// they're a homeowner or a tradesperson and sends them to the right place.
// The chosen role is a display preference only (cookie, readable by the proxy
// so "/" opens the right map). It never grants access to anything.

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Bell, Briefcase, Building2, Check, Hammer, Loader2, MapPin, MessagesSquare, Search, ToggleRight, TrendingUp, UserPlus, Users, X } from "lucide-react"
import { TRADE_INDUSTRIES } from "@/lib/data/trade-industries"
import { BrandPanel } from "@/components/brand-panel"
import { geocodeUrl, postcodeCountry, visitorCountry } from "@/lib/geo"

// What the visitor said they're looking for: tradespeople, trade jobs, vacancies, or staff.
type Role = "homeowner" | "tradesperson" | "jobseeker" | "employer"
type MapPage = "trades" | "jobs" | "vacancies"
type Step = "closed" | "welcome" | "homeowner" | "t-postcode" | "t-trades" | "t-name" | "t-join"
type Seeded = { id: string; name: string }
type Demand = { jobs: number; businesses: number; seeded: Seeded[] }

const ROLE_COOKIE = "ojm_role"
const DISMISSED_KEY = "ojm_welcome_dismissed"
// A new employer signs up as a business, then lands straight on the vacancy form.
const EMPLOYER_SIGNUP = `/auth/sign-up?source=welcome&accountType=company&returnUrl=${encodeURIComponent("/jobs/vacancy/new")}`
const TRADES = TRADE_INDUSTRIES.filter(t => t.title !== "Not sure / Other")
// A full UK postcode or US ZIP code (see lib/geo).
const isPostcode = (s: string) => postcodeCountry(s) !== null
// Roughly 20 miles each way around the postcode.
const LAT_SPAN = 0.29
const LNG_SPAN = 0.46
// Below this many open jobs we talk about competition instead of job volume.
const MIN_JOBS_TO_SHOW = 5

const TRADE_STEPS: { step: Step; label: string }[] = [
  { step: "t-postcode", label: "Your area" },
  { step: "t-trades", label: "Your trades" },
  { step: "t-name", label: "Your business" },
  { step: "t-join", label: "Create free profile" },
]
const BACK: Partial<Record<Step, Step>> = {
  homeowner: "welcome", "t-postcode": "welcome", "t-trades": "t-postcode", "t-name": "t-trades", "t-join": "t-name",
}

function hasAuthCookie() {
  return /(?:^|; )sb-[^=]+-auth-token/.test(document.cookie)
}

function readRole(): Role | null {
  const m = document.cookie.match(/(?:^|; )ojm_role=(homeowner|tradesperson|jobseeker|employer)/)
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

export default function WelcomeGuide({ page }: { page: MapPage }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("closed")
  const [signedIn, setSignedIn] = useState(true)
  // US visitors are asked for a ZIP code. The window only renders after mount, so reading the cookie here is safe.
  const zipMode = typeof document !== "undefined" && visitorCountry() === "US"

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
    if (!isPostcode(pc)) { setGeoState("idle"); return }
    setGeoState("loading")
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(geocodeUrl(pc, null), { signal: ctrl.signal })
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
    if (r === "jobseeker") goTo("vacancies")
    else if (r === "employer") { setStep("closed"); router.push(EMPLOYER_SIGNUP) }
    else setStep(r === "homeowner" ? "homeowner" : "t-postcode")
  }

  function goTo(target: MapPage, query = "") {
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

  const pc = postcode.trim().toUpperCase()
  const trade = industries[0]
  const tradeIndex = TRADE_STEPS.findIndex(s => s.step === step)
  const isTradeFlow = tradeIndex >= 0
  const back = BACK[step]
  const demandBox = demand && trade ? (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 lg:px-5 lg:py-4">
      <TrendingUp className="flex-shrink-0 w-5 h-5 lg:w-6 lg:h-6 text-emerald-600 mt-0.5" />
      <p className="text-sm lg:text-base font-medium text-emerald-900 leading-relaxed">{demandMessage(demand, trade, pc)}</p>
    </div>
  ) : null

  return (
    // Bottom padding on small screens keeps the window clear of the mobile bottom nav.
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/45 backdrop-blur-[3px] p-3 pb-[calc(env(safe-area-inset-bottom,0px)+76px)] sm:px-4 sm:pt-4 lg:pb-4"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}
      // Clicking the dimmed map around the window closes it.
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="relative flex w-full max-w-xl lg:max-w-[1200px] lg:w-[70vw] lg:min-h-[70vh] max-h-full lg:max-h-[90vh] overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl shadow-black/40 outline-none"
      >
        {/* Left: brand panel with the guide's progress (desktop only) */}
        <BrandPanel headline={isTradeFlow ? <>Put your business <span className="ojm-glow-text">on the map.</span></> : <>Local trades, <span className="ojm-glow-text">fast.</span></>}>
          {isTradeFlow ? (
            <ol className="space-y-4">
              {TRADE_STEPS.map((s, i) => (
                <li key={s.step} className={`flex items-center gap-3 text-lg ${i === tradeIndex ? "text-white font-semibold" : i < tradeIndex ? "text-emerald-200" : "text-white/50"}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${i < tradeIndex ? "bg-emerald-400 border-emerald-400 text-emerald-950" : i === tradeIndex ? "border-emerald-300 text-emerald-200" : "border-white/30"}`}>
                    {i < tradeIndex ? <Check className="w-4 h-4" /> : i + 1}
                  </span>
                  {s.label}
                </li>
              ))}
            </ol>
          ) : undefined}
        </BrandPanel>

        {/* Right: the current step */}
        <div className="relative flex-1 min-w-0 flex flex-col overflow-y-auto p-6 sm:p-8 lg:px-12 lg:py-8">
          <div className="flex items-center justify-between gap-3 min-h-[40px] lg:-mb-2">
            {back ? (
              <button onClick={() => setStep(back)} className="inline-flex items-center gap-1.5 text-sm lg:text-base font-medium text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" /> Back
              </button>
            ) : <span />}
            <button onClick={dismiss} aria-label="Close" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100">
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>

          {isTradeFlow && (
            <div className="mt-2 lg:hidden">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-700">{TRADE_STEPS[tradeIndex].label}</span>
                <span className="text-slate-400">Step {tradeIndex + 1} of {TRADE_STEPS.length}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((tradeIndex + 1) / TRADE_STEPS.length) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center py-4 lg:py-2">
            {step === "welcome" && (
              <>
                <h2 id="welcome-title" className="text-3xl lg:text-[42px] lg:leading-tight font-bold tracking-tight">Welcome to Open Job Market</h2>
                <p className="mt-2 lg:mt-3 text-base lg:text-xl text-slate-600">Find work. Find tradespeople. Get jobs done.</p>
                <p className="mt-6 lg:mt-8 text-sm lg:text-base font-semibold text-slate-500">What are you looking for?</p>
                <div className="mt-3 space-y-2.5">
                  <LookingForRow icon={<Users className="w-6 h-6 lg:w-7 lg:h-7" />} tone="emerald" title="Available tradespeople"
                    text="Post a job or contact local trades directly." onClick={() => choose("homeowner")} />
                  <LookingForRow icon={<Hammer className="w-6 h-6 lg:w-7 lg:h-7" />} tone="orange" title="Trade jobs"
                    text="Find work and new customers for your trade business." onClick={() => choose("tradesperson")} />
                  <LookingForRow icon={<Building2 className="w-6 h-6 lg:w-7 lg:h-7" />} tone="sky" title="Job vacancies"
                    text="Find a job with a local business." onClick={() => choose("jobseeker")} />
                  <LookingForRow icon={<UserPlus className="w-6 h-6 lg:w-7 lg:h-7" />} tone="violet" title="Staff for my business"
                    text="Post a vacancy for free and hear from local people." onClick={() => choose("employer")} />
                </div>
                <div className="mt-6 lg:mt-8 flex flex-wrap items-center justify-between gap-3 text-sm lg:text-base">
                  <a href="/home" className="font-medium text-emerald-700 hover:underline underline-offset-4">What is Open Job Market?</a>
                  <button onClick={dismiss} className="text-slate-500 hover:text-slate-900">Just let me look around</button>
                </div>
              </>
            )}

            {step === "homeowner" && (
              <>
                <h2 id="welcome-title" className="text-3xl lg:text-[42px] lg:leading-tight font-bold tracking-tight">What would you like to do?</h2>
                <div className="mt-6 lg:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-5">
                  <RoleCard icon={<Briefcase className="w-7 h-7 lg:w-9 lg:h-9" />} tone="emerald" title="Post a job"
                    text="Describe what needs doing and get replies from local tradespeople." onClick={postJob} />
                  <RoleCard icon={<Search className="w-7 h-7 lg:w-9 lg:h-9" />} tone="sky" title="Find tradespeople"
                    text="Browse the map and contact tradespeople directly." onClick={() => goTo("trades")} />
                </div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 lg:px-5 lg:py-4">
                  <div className="flex items-center gap-3">
                    <img src="/Van2.png" alt="Green van" className="flex-shrink-0 w-16 h-8 lg:w-20 lg:h-10 object-contain" />
                    <p className="text-sm lg:text-base text-slate-700"><span className="font-semibold text-emerald-700">Green van:</span> available now</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src="/Van1.png" alt="Grey van" className="flex-shrink-0 w-16 h-8 lg:w-20 lg:h-10 object-contain" />
                    <p className="text-sm lg:text-base text-slate-700"><span className="font-semibold text-slate-900">Grey van:</span> may be busy, you can still contact them</p>
                  </div>
                </div>
                <p className="mt-5 text-sm lg:text-base text-slate-500">Free for homeowners. No fees to post jobs.</p>
              </>
            )}

            {step === "t-postcode" && (
              <form onSubmit={e => { e.preventDefault(); if (isPostcode(pc) && geoState !== "loading") setStep("t-trades") }}>
                <h2 id="welcome-title" className="text-3xl lg:text-[42px] lg:leading-tight font-bold tracking-tight">Where are you based?</h2>
                <p className="mt-2 lg:mt-3 text-base lg:text-xl text-slate-600">We&apos;ll show you to homeowners nearby.</p>
                <div className="relative mt-6 lg:mt-10">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-6 lg:h-6 text-emerald-600" />
                  <input
                    autoFocus
                    value={postcode}
                    onChange={e => setPostcode(e.target.value.toUpperCase())}
                    placeholder={zipMode ? "Your ZIP code, e.g. 10001" : "Your postcode, e.g. PO1 2AB"}
                    autoComplete="postal-code"
                    aria-label={zipMode ? "ZIP code" : "Postcode"}
                    className="w-full rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none bg-white pl-12 lg:pl-14 pr-12 py-4 lg:py-5 text-lg lg:text-2xl font-medium placeholder:text-slate-400 placeholder:font-normal"
                  />
                  {geoState === "loading" && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />}
                  {coords && <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600" />}
                </div>
                {geoState === "notfound" && <p className="mt-2 text-sm text-orange-600">We couldn&apos;t find that {zipMode ? "ZIP code" : "postcode"}, but you can still continue.</p>}
                <PrimaryButton disabled={!isPostcode(pc) || geoState === "loading"}>Continue</PrimaryButton>
              </form>
            )}

            {step === "t-trades" && (
              <>
                <h2 id="welcome-title" className="text-3xl lg:text-[42px] lg:leading-tight font-bold tracking-tight">What work do you do?</h2>
                <p className="mt-2 lg:mt-3 text-base lg:text-xl text-slate-600">Pick all that apply.</p>
                <div className="mt-5 lg:mt-6 flex flex-wrap gap-2">
                  {TRADES.map(t => {
                    const on = industries.includes(t.title)
                    return (
                      <button key={t.title} onClick={() => toggleIndustry(t.title)} aria-pressed={on}
                        className={`rounded-full border-2 px-3.5 py-2 lg:py-2 text-sm lg:text-[15px] font-medium transition-colors ${on
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400"}`}>
                        {on && <Check className="inline w-4 h-4 mr-1 -mt-0.5" />}{t.title}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-5 min-h-[56px]" aria-live="polite">
                  {demandBox ?? (demandLoading
                    ? <p className="text-sm lg:text-base text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking demand near {pc}…</p>
                    : industries.length === 0 && <p className="text-sm lg:text-base text-slate-500">Choose a trade to see demand near {pc}.</p>)}
                </div>
                <PrimaryButton disabled={industries.length === 0} onClick={() => setStep("t-name")}>Continue</PrimaryButton>
              </>
            )}

            {step === "t-name" && (
              <form onSubmit={e => { e.preventDefault(); setStep("t-join") }}>
                <h2 id="welcome-title" className="text-3xl lg:text-[42px] lg:leading-tight font-bold tracking-tight">What&apos;s your business called?</h2>
                <p className="mt-2 lg:mt-3 text-base lg:text-xl text-slate-600">Sole trader? Just use your own name.</p>
                <div className="relative mt-6 lg:mt-10">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-6 lg:h-6 text-emerald-600" />
                  <input
                    autoFocus
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Smith Plumbing"
                    autoComplete="organization"
                    aria-label="Business name"
                    className="w-full rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none bg-white pl-12 lg:pl-14 pr-4 py-4 lg:py-5 text-lg lg:text-2xl font-medium placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
                {listedMatches.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-3">
                    <p className="px-1 pb-1.5 text-sm lg:text-base font-medium text-sky-900">Is this your business? It&apos;s already listed. Claim it for free:</p>
                    {listedMatches.map(s => (
                      <a key={s.id} href={`/seeded/${s.id}/claim`}
                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm lg:text-base text-slate-900 hover:bg-white">
                        <span className="truncate">{s.name}</span>
                        <span className="flex-shrink-0 text-sky-700 font-semibold">Claim →</span>
                      </a>
                    ))}
                  </div>
                )}
                <PrimaryButton>{businessName.trim() ? "Continue" : "Skip for now"}</PrimaryButton>
              </form>
            )}

            {step === "t-join" && (
              <>
                <h2 id="welcome-title" className="text-3xl lg:text-[42px] lg:leading-tight font-bold tracking-tight">
                  {businessName.trim() ? `Put ${businessName.trim()} on the map, free` : "Get your free business profile"}
                </h2>
                <p className="mt-2 lg:mt-3 text-base lg:text-xl text-slate-600">One free account gives you both: new customers and new jobs.</p>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Benefit icon={<MapPin />} title="Get found locally" text="Homeowners nearby find you on the map." />
                  <Benefit icon={<MessagesSquare />} title="Direct enquiries" text="Homeowners message you directly." />
                  <Benefit icon={<Bell />} title="New job alerts" text="Jobs in your trades and area." />
                  <Benefit icon={<ToggleRight />} title="You're in control" text="Show if you're available or busy." />
                </ul>
                {demandBox && <div className="mt-4">{demandBox}</div>}
                <p className="mt-4 text-sm lg:text-base font-semibold text-emerald-700">No subscription · No pay-per-lead · No hidden fees</p>
                <PrimaryButton onClick={createProfile}>Create my free business profile</PrimaryButton>
                <button onClick={browseJobs} className="mt-2 w-full rounded-2xl py-3 text-base lg:text-lg font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                  No thanks, I just want to browse jobs
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const ROW_TONES = {
  emerald: "bg-emerald-100 text-emerald-700",
  orange:  "bg-orange-100 text-orange-700",
  sky:     "bg-sky-100 text-sky-700",
  violet:  "bg-violet-100 text-violet-700",
}

function LookingForRow({ icon, tone, title, text, onClick }: { icon: React.ReactNode; tone: keyof typeof ROW_TONES; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="group w-full flex items-center gap-4 text-left rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 lg:py-3.5 transition-all hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-900/10">
      <span className={`flex-shrink-0 w-11 h-11 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center ${ROW_TONES[tone]}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg lg:text-xl font-bold text-slate-900">{title}</span>
        <span className="block text-sm lg:text-base text-slate-600">{text}</span>
      </span>
      <ArrowRight className="flex-shrink-0 w-5 h-5 lg:w-6 lg:h-6 text-slate-300 group-hover:text-emerald-600 transition-colors" />
    </button>
  )
}

function RoleCard({ icon, tone, title, text, onClick }: { icon: React.ReactNode; tone: "emerald" | "sky"; title: string; text: string; onClick: () => void }) {
  const toneCls = tone === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
  return (
    <button onClick={onClick}
      className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-5 lg:p-7 transition-all hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-900/10 hover:-translate-y-0.5">
      <span className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center ${toneCls}`}>{icon}</span>
      <span className="mt-4 lg:mt-5 flex items-center justify-between gap-2 text-xl lg:text-2xl xl:text-[26px] font-bold text-slate-900">
        {title}
        <ArrowRight className="flex-shrink-0 w-5 h-5 lg:w-7 lg:h-7 text-slate-300 group-hover:text-emerald-600 transition-colors" />
      </span>
      <span className="mt-1 lg:mt-2 block text-base lg:text-lg text-slate-600">{text}</span>
    </button>
  )
}

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type={onClick ? "button" : "submit"} onClick={onClick} disabled={disabled}
      className="mt-5 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-4 text-base lg:text-xl font-bold text-white shadow-lg shadow-emerald-600/30 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-2">
      {children} <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
    </button>
  )
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3 lg:gap-4 rounded-2xl bg-slate-50 p-4">
      <span className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 lg:[&>svg]:w-6 lg:[&>svg]:h-6">{icon}</span>
      <span>
        <span className="block text-base lg:text-lg font-bold text-slate-900">{title}</span>
        <span className="block text-sm lg:text-base text-slate-600">{text}</span>
      </span>
    </li>
  )
}
