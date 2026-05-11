"use client"

import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  MapPin, ArrowLeft, Phone, Mail, PhoneCall, Eye, Building2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { getIndustryStyle, normaliseCategory } from "@/lib/data/industry-styles"

export interface SeededTrade {
  id: string
  company_name: string
  trade_category: string | null
  email: string | null
  phone: string | null
  address: string | null
  postcode: string | null
  created_at: string
  claim_token: string
}

export default function SeededDetailView({ trade }: { trade: SeededTrade }) {
  const router = useRouter()
  const [phoneRevealed, setPhoneRevealed] = useState(false)
  const [emailRevealed, setEmailRevealed] = useState(false)

  const initials = trade.company_name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  const styleKey = normaliseCategory(trade.trade_category)
  const style = getIndustryStyle(styleKey)
  const Icon = style.icon
  const location = [trade.address, trade.postcode].filter(Boolean).join(", ")

  const handleBack = () => {
    if (window.history.length > 1) router.back()
    else router.push("/find")
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Sticky back bar */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>

      {/* Hero banner */}
      <div className="bg-gradient-to-b from-blue-950 via-slate-800/80 to-slate-900 border-b border-slate-700/40">
        <div className="container mx-auto px-4 pt-7 pb-6 max-w-4xl">
          <div className="flex gap-4 items-start">
            {/* Avatar */}
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-amber-500/30 flex-shrink-0 rounded-2xl">
              <AvatarFallback className={`${style.iconBg} rounded-2xl text-2xl font-bold`}>
                <Icon className={`w-8 h-8 ${style.iconColor}`} />
              </AvatarFallback>
            </Avatar>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{trade.company_name}</h1>
              {trade.trade_category && (
                <p className="text-sm text-blue-300 mt-0.5 font-medium">{trade.trade_category}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-slate-500" />
                    {location}
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Building2 className="h-2.5 w-2.5" />Local business
                </span>
                <span className="text-xs bg-slate-700/60 text-slate-400 border border-slate-600/50 px-2 py-0.5 rounded-full">
                  Not yet on OpenJobMarket
                </span>
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="flex gap-2 mt-5 lg:hidden">
            <button
              onClick={() => router.push(`/claim/${trade.claim_token}`)}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-amber-500/20"
            >
              <Building2 className="h-4 w-4" />
              Claim this business
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Details card — mobile */}
            {(trade.phone || trade.email || location) && (
              <section className="lg:hidden bg-slate-800 rounded-2xl border border-slate-700/50 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Details</p>
                <ContactFields
                  phone={trade.phone}
                  email={trade.email}
                  phoneRevealed={phoneRevealed}
                  emailRevealed={emailRevealed}
                  onRevealPhone={() => setPhoneRevealed(true)}
                  onRevealEmail={() => setEmailRevealed(true)}
                />
                {location && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    {location}
                  </div>
                )}
              </section>
            )}

            {/* Notice */}
            <section className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-amber-300 mb-1.5">Is this your business?</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                This listing was imported from public sources. If you own{" "}
                <span className="text-white font-medium">{trade.company_name}</span>, you can claim it
                to manage your profile, toggle your availability, and receive trade job notifications.
              </p>
              <button
                onClick={() => router.push(`/claim/${trade.claim_token}`)}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Claim this business →
              </button>
            </section>

            {/* Industry card */}
            {trade.trade_category && (
              <section className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${style.iconColor}`} />Industry
                </h2>
                <span className="text-xs bg-slate-700 text-slate-200 border border-slate-600/80 px-2.5 py-1 rounded-lg">
                  {trade.trade_category}
                </span>
              </section>
            )}
          </div>

          {/* ── Sidebar (desktop only) ── */}
          <div className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">

            {/* CTA */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5">
              <button
                onClick={() => router.push(`/claim/${trade.claim_token}`)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-amber-500/20"
              >
                <Building2 className="h-4 w-4" />
                Claim this business
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-2.5 leading-relaxed">
                Own this business? Claim it to manage your profile and connect with customers.
              </p>
            </div>

            {/* Quick info */}
            {(trade.phone || trade.email || location) && (
              <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Details</p>
                <ContactFields
                  phone={trade.phone}
                  email={trade.email}
                  phoneRevealed={phoneRevealed}
                  emailRevealed={emailRevealed}
                  onRevealPhone={() => setPhoneRevealed(true)}
                  onRevealEmail={() => setEmailRevealed(true)}
                />
                {location && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    {location}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactFields({
  phone, email, phoneRevealed, emailRevealed, onRevealPhone, onRevealEmail,
}: {
  phone: string | null; email: string | null
  phoneRevealed: boolean; emailRevealed: boolean
  onRevealPhone: () => void; onRevealEmail: () => void
}) {
  return (
    <>
      {phone && (
        phoneRevealed ? (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <a href={`tel:${phone}`} className="text-sm text-white font-medium hover:text-emerald-300 transition-colors flex-1 min-w-0 truncate">
              {phone}
            </a>
            <a href={`tel:${phone}`}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex-shrink-0"
            >
              <PhoneCall className="h-3 w-3" />Call
            </a>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRevealPhone}
            className="flex items-center gap-2 w-full text-sm px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all"
          >
            <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span>Show Phone Number</span>
            <Eye className="h-3.5 w-3.5 text-slate-500 ml-auto" />
          </button>
        )
      )}

      {email && (
        emailRevealed ? (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <a href={`mailto:${email}`} className="text-sm text-white font-medium hover:text-emerald-300 transition-colors truncate">
              {email}
            </a>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRevealEmail}
            className="flex items-center gap-2 w-full text-sm px-3 py-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span>Show Email Address</span>
            <Eye className="h-3.5 w-3.5 text-slate-500 ml-auto" />
          </button>
        )
      )}
    </>
  )
}
