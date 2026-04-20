import { generateSEO } from "@/lib/seo"
import { createClient } from "@/lib/server"
import Link from "next/link"
import Image from "next/image"
import { MapPin, Zap, MessageSquare, Star, Wrench, Home } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = generateSEO({
  title: "About Open Job Market — Find Trusted Local Tradespeople Fast",
  description:
    "Open Job Market connects homeowners with trusted local tradespeople in minutes. Post a job, get matched, and hire with confidence.",
  path: "/about",
})

const HOW_IT_WORKS = [
  { step: 1, title: "Post your job",            text: "Choose the job type and describe what you need.",                              img: "/Post_job_1.jpg" },
  { step: 2, title: "Set urgency",              text: "Select how quickly you need the job done.",                                    img: "/Post_job_2.jpg" },
  { step: 3, title: "Choose location & publish",text: "Set your location and publish your job.",                                      img: "/Post_job_3.jpg" },
  { step: 4, title: "Get applications",         text: "Nearby tradespeople receive notifications and apply.",                         img: "/Tradesperson_get_notification.jpeg" },
  { step: 5, title: "Compare & choose",         text: "See up to 3 applicants in a simple, Uber-style interface.",                   img: "/Find_tradespeople.jpg" },
  { step: 6, title: "Complete & review",        text: "Confirm the job, arrange the visit, and leave a review after completion.",     img: "/completed.jpg" },
]

export default async function AboutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSignedIn = !!user

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 max-w-4xl py-8 space-y-8">

        {/* ── About description ──────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
          <h1 className="text-xs font-bold text-white mb-2">About Open Job Market</h1>
          <div className="space-y-1.5 text-[8px] text-slate-400 leading-relaxed">
            <p>
              Open Job Market connects homeowners with nearby tradespeople in real time — no waiting, no lead selling, no spam calls.
            </p>
            <div className="hidden sm:block space-y-1.5">
              <p>
                Users post a job and instantly reach professionals in their area. Tradespeople receive notifications based on location and job type, and apply directly through the app.
              </p>
              <p>
                Homeowners compare a small number of relevant applicants, review profiles, and communicate without unwanted calls or intermediaries.
              </p>
            </div>
            <p className="text-slate-300 font-medium">Two ways to work:</p>
            <ul className="space-y-1 pl-2">
              <li className="flex items-start gap-1.5">
                <Zap className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span><span className="text-slate-200 font-medium">Urgent jobs</span> — ride-hailing style, nearby tradespeople respond quickly.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Star className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                <span><span className="text-slate-200 font-medium">Flexible work</span> — review options and choose the right person over time.</span>
              </li>
            </ul>
            <p className="text-emerald-400 font-medium">Fast, fair, and reliable — whatever the job.</p>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {isSignedIn ? (
              <>
                <Link href="/post-job" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">
                  Post a Job
                </Link>
                <Link href="/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">
                  Find Tradespeople
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/sign-up" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">
                  Get Started Free
                </Link>
                <Link href="/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">
                  Browse Tradespeople
                </Link>
              </>
            )}
          </div>
        </section>

        {/* ── Comparison ───────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
            Why choose Open Job Market?
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Other platforms</p>
              <ul className="space-y-2">
                {["Sell your job as paid leads", "Multiple unwanted sales calls", "Often matched with non-local companies", "Slow quote process"].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-red-400 font-bold flex-shrink-0">✕</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-950/40 rounded-2xl border border-emerald-500/25 p-4">
              <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-widest mb-3">Open Job Market</p>
              <ul className="space-y-2">
                {["No lead selling — fair pricing", "Connect directly with nearby tradespeople", "Messaging only — no spam calls", "Fast matching (Uber-style for urgent jobs)"].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── For each audience ────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-3">
          <div className="bg-slate-800/60 rounded-2xl border border-orange-500/25 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600/80 to-orange-700/80 px-4 py-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-100 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white leading-none">For Tradespeople</p>
                <p className="text-orange-200 text-xs mt-0.5">More local jobs without paying for leads.</p>
              </div>
            </div>
            <ul className="px-4 py-3 space-y-1.5">
              {["See nearby jobs on a live map", "Apply instantly", "Get discovered by homeowners", "Fill gaps in your schedule"].map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800/60 rounded-2xl border border-blue-500/25 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700/80 to-blue-800/80 px-4 py-3 flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-100 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white leading-none">For Homeowners</p>
                <p className="text-blue-200 text-xs mt-0.5">Find the right person, fast and locally.</p>
              </div>
            </div>
            <ul className="px-4 py-3 space-y-1.5">
              {["Post jobs with photos & budget", "Reach nearby tradespeople instantly", "Compare applications easily", "Hire with confidence using reviews"].map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
            How it works
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {HOW_IT_WORKS.map(({ step, title, text, img }) => (
              <div key={step} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
                <div className="relative w-full aspect-[9/16] bg-slate-800">
                  <Image
                    src={img}
                    alt={title}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                </div>
                <div className="px-2.5 py-2 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-400 flex-shrink-0">
                      {step}
                    </span>
                    <p className="text-[11px] font-semibold text-slate-100 leading-tight">{title}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug pl-5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust badges ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: MapPin,         label: "Hyper-local",    sub: "Jobs near you" },
            { icon: Zap,            label: "On-demand",      sub: "ASAP or scheduled" },
            { icon: MessageSquare,  label: "No cold calls",  sub: "Chat in-app" },
            { icon: Star,           label: "Reviewed",       sub: "Real ratings" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-slate-100">{label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-emerald-700/25 rounded-2xl p-5 text-center">
          {isSignedIn ? (
            <>
              <p className="text-sm font-bold text-white mb-1">Ready to post your next job?</p>
              <p className="text-xs text-slate-500 mb-4">Reach verified local tradespeople in seconds.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/post-job" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">Post a Job</Link>
                <Link href="/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">Find Tradespeople</Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-white mb-1">Ready to get started?</p>
              <p className="text-xs text-slate-500 mb-4">Join thousands already using Open Job Market.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/auth/sign-up" className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors">Create Free Account</Link>
                <Link href="/?tab=traders&autoSearch=true" className="inline-flex items-center px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-xs transition-colors">Browse Tradespeople</Link>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  )
}
