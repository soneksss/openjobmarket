"use client"

import { useRouter } from "next/navigation"
import {
  CheckCircle2, MessageCircle, ChevronRight,
  Bell, Clock, Users, Info, X,
} from "lucide-react"
import Link from "next/link"

interface FlexibleJobConfirmBannerProps {
  jobId: string
  jobTitle: string
}

export function FlexibleJobConfirmBanner({ jobId, jobTitle }: FlexibleJobConfirmBannerProps) {
  const router = useRouter()

  const dismiss = () => {
    // Remove the ?posted= param without a full reload
    router.replace("/dashboard/homeowner/jobs")
  }

  return (
    <div className="mx-4 mt-5 mb-1 space-y-3">

      {/* ── Main confirmation card ── */}
      <div className="relative bg-gradient-to-br from-emerald-950/70 to-slate-800/80 border border-emerald-500/25 rounded-2xl overflow-hidden">
        {/* Top accent stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-5 pb-4">
          {/* Icon + headline */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white leading-tight">Your job is now live</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug max-w-xs">
                Available tradespeople can review your job and message you with availability or arrange a visit.
              </p>
            </div>
          </div>

          {/* Expectations */}
          <div className="mt-4 space-y-2">
            {[
              { icon: Clock,    text: "Most replies arrive within a few hours" },
              { icon: Users,    text: "Trades may message first before giving an exact quote" },
              { icon: Bell,     text: "You'll be notified when someone responds" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-emerald-400/80 flex-shrink-0" />
                <span className="text-xs text-slate-400 leading-snug">{text}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-4 flex gap-2">
            <Link
              href="/messages"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              View Messages
            </Link>
            <Link
              href={`/dashboard/homeowner/jobs/${jobId}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-semibold text-sm transition-colors"
            >
              View Job
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trust booster ── */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/40">
        <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          For accurate quotes, many tradespeople will arrange a short visit first before committing to a final price.
        </p>
      </div>

    </div>
  )
}
