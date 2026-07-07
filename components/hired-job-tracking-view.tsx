"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, MapPin, CheckCircle2, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const HiredJobTrackingMap = dynamic(() => import("./hired-job-tracking-map"), { ssr: false })

interface HiredJobTrackingViewProps {
  job: {
    id: string
    title: string
    location: string
    latitude: number | null
    longitude: number | null
    status: string | null
  }
  trade: {
    id: string
    userId: string
    name: string
    logoUrl: string | null
    latitude: number | null
    longitude: number | null
  }
  conversationId: string | null
}

export function HiredJobTrackingView({ job, trade, conversationId }: HiredJobTrackingViewProps) {
  const jobLat = job.latitude  ?? 50.8198
  const jobLon = job.longitude ?? -1.0879

  const messageHref = conversationId
    ? `/messages/${conversationId}`
    : `/messages/${trade.userId}`

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-3 pb-3 bg-slate-900/95 border-b border-slate-700/40 backdrop-blur-sm z-10">
        <Link
          href="/dashboard/homeowner/jobs"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/70 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/70 transition-colors"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-none mb-0.5">
            Job Tracking
          </p>
          <h1 className="text-sm font-bold text-white truncate leading-tight">
            {job.title}
          </h1>
        </div>

        {/* Status chip */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">Hired</span>
        </div>
      </div>

      {/* ── Map (fills remaining height) ── */}
      <div className="flex-1 relative">
        <HiredJobTrackingMap
          jobLat={jobLat}
          jobLon={jobLon}
          tradeLat={trade.latitude}
          tradeLon={trade.longitude}
          tradeName={trade.name}
        />

        {/* ── Tradesperson card overlaid at the bottom ── */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl p-4">

            {/* Trade info row */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-12 h-12 border-2 border-emerald-500/40 flex-shrink-0">
                <AvatarImage src={trade.logoUrl ?? undefined} />
                <AvatarFallback className="bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                  {trade.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Hired tradesperson</p>
                <p className="text-sm font-bold text-white truncate">{trade.name}</p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">Confirmed</span>
              </div>
            </div>

            {/* Location row */}
            <div className="flex items-center gap-1.5 mb-3 px-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-400 truncate">{job.location}</p>
            </div>

            {/* Message button */}
            <Link
              href={messageHref}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Message {trade.name}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
