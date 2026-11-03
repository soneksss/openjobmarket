"use client"

// The part of the marketing page below "Who is it for?" for tradespeople,
// businesses and jobseekers (homeowners keep the page's original sections).
// Each group gets its own "how it works" and "why Open Job Market".

import { Check, X } from "lucide-react"
import type { AudienceId } from "@/components/audience-explorer"

type Copy = {
  howTitle: string
  howIntro: string
  steps: { title: string; text: string }[]
  whyTitle: string
  others: string[]
  ours: string[]
}

const COPY: Record<Exclude<AudienceId, "homeowners">, Copy> = {
  tradespeople: {
    howTitle: "How it works for tradespeople",
    howIntro: "Set up once, then local work comes to you.",
    steps: [
      { title: "Create your free profile", text: "Pick your trades, your area and your business name. It takes about a minute." },
      { title: "Get found and get alerts", text: "Homeowners nearby see you on the map, and you're told about new jobs in your trades and area." },
      { title: "Reply and win the work", text: "Message homeowners directly, send a quote in the chat and agree the job." },
    ],
    whyTitle: "Why tradespeople choose Open Job Market",
    others: ["Pay for every lead", "Monthly subscriptions", "The same lead sold to several trades", "Customers can't see who's free"],
    ours: ["No lead fees", "No subscription", "Homeowners contact you directly", "Show when you're available, or busy"],
  },
  businesses: {
    howTitle: "How posting a vacancy works",
    howIntro: "From sign-up to your first applicant, without a recruiter.",
    steps: [
      { title: "Sign up free as a business", text: "A short form, then a code by email. No card details." },
      { title: "Post your vacancy", text: "Add the role, pay and location. It appears on the vacancies map for people nearby." },
      { title: "Hear from local people", text: "Applications arrive in your Messages, often with a CV. Reply right there." },
    ],
    whyTitle: "Why businesses hire through Open Job Market",
    others: ["Fees to post a job", "Recruiter commission", "Applicants from far away", "Applications spread across email"],
    ours: ["Free to post a vacancy", "Talk to applicants directly", "Shown to people who live nearby", "Every application in one inbox"],
  },
  jobseekers: {
    howTitle: "How finding a job works",
    howIntro: "No long forms. Just find a job near you and say hello.",
    steps: [
      { title: "Browse the vacancies map", text: "See jobs with local businesses, how far they are and what they pay." },
      { title: "Create a quick free account", text: "Your name, email and postcode. No long profile to fill in." },
      { title: "Apply with a message and CV", text: "The employer replies in your messages, and you can chat from there." },
    ],
    whyTitle: "Why jobseekers use Open Job Market",
    others: ["Long application forms", "Jobs far from home", "No reply from big job boards", "Your CV passed around agencies"],
    ours: ["Apply in a couple of minutes", "Jobs close to home, on a map", "Talk to the employer directly", "Only that employer sees your CV"],
  },
}

export function AudienceSections({ audience }: { audience: Exclude<AudienceId, "homeowners"> }) {
  const c = COPY[audience]
  return (
    <div key={audience} className="ojm-panel-in">
      {/* id="sec-how" so the hero's "How it works ↓" link lands here */}
      <section id="sec-how" className="py-12 border-t border-slate-800/60">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/70 mb-1">Three simple steps</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">{c.howTitle}</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">{c.howIntro}</p>
          </div>
          <ol className="grid md:grid-cols-3 gap-4 lg:gap-5">
            {c.steps.map((s, i) => (
              <li key={s.title} className="flex flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 ring-1 ring-inset ring-emerald-500/25 text-lg font-bold text-emerald-300">
                  {i + 1}
                </span>
                <h3 className="font-bold text-white text-base mb-1.5">{s.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-12 border-t border-slate-800/60">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-8">{c.whyTitle}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-center text-xs sm:text-sm font-bold text-slate-400 mb-4 pb-3 border-b border-slate-700">Usual way</p>
              <ul className="space-y-3">
                {c.others.map(text => (
                  <li key={text} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-500/15">
                      <X className="h-2.5 w-2.5 text-red-400" strokeWidth={3} />
                    </span>
                    <span className="text-slate-400 text-xs sm:text-sm leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-5">
              <p className="text-center text-xs sm:text-sm font-bold text-emerald-400 mb-4 pb-3 border-b border-emerald-800/50">Open Job Market</p>
              <ul className="space-y-3">
                {c.ours.map(text => (
                  <li key={text} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                      <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={3} />
                    </span>
                    <span className="text-slate-100 text-xs sm:text-sm font-medium leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
