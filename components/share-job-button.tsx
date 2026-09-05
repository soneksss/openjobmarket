"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"

/**
 * Share button for a job. Uses the native share sheet (navigator.share) where
 * available — WhatsApp, Messenger, SMS, email, etc. — and falls back to copying
 * the link. The share message frames the job as "Can you do this job?" (the job
 * is the reason for the share), not a pitch for the app.
 *
 * Reused in three places:
 *  - the public job page (subtle button, shares the clean canonical URL)
 *  - the post-job confirmation screen (prominent orange CTA)
 *  - anywhere else a homeowner might want to send a job to someone they know
 */

// UK postcode (full or outward code) — dropped from a shared location so we
// share a town, not a doorstep.
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{2})?$/i

/** "12 High Street, Portsmouth, PO1 2AB" → "Portsmouth". Never a street/postcode. */
function townFromLocation(location?: string | null): string | null {
  if (!location) return null
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean)
  const named = parts.filter((p) => !POSTCODE_RE.test(p))
  if (named.length === 0) return null
  // First segment is usually the street line — prefer the next one if we have it.
  return (named.length > 1 ? named[1] : named[0]) || null
}

export function ShareJobButton({
  url,
  title,
  category,
  location,
  shareSource,
  label = "Share",
  prominent = false,
  className = "",
}: {
  /** Explicit URL to share. May be absolute or root-relative ("/jobs/123").
   *  Falls back to the current page's canonical URL when omitted. */
  url?: string
  /** Job title — native-share `title` + text fallback. */
  title?: string | null
  /** Trade category / industry, e.g. "Plumbing & Heating". */
  category?: string | null
  /** Raw job location — sanitised to a town before it goes in the message. */
  location?: string | null
  /** Optional attribution marker, appended as `?src=<value>`, so a later
   *  referral system can tell a visitor arrived via a shared job. Omit to
   *  share the clean canonical URL unchanged. */
  shareSource?: string
  label?: string
  /** true → filled orange CTA · false → subtle outline button. */
  prominent?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const buildUrl = () => {
    if (typeof window === "undefined") return ""
    let base = url || `${window.location.origin}${window.location.pathname}`
    if (base.startsWith("/")) base = `${window.location.origin}${base}`
    if (!shareSource) return base
    return base + (base.includes("?") ? "&" : "?") + `src=${encodeURIComponent(shareSource)}`
  }

  const buildText = (link: string) => {
    const town = townFromLocation(location)
    const where = town ? ` in ${town}` : ""
    const what = category ? `${category.toLowerCase()} job` : title ? `job (${title})` : "job"
    return (
      `Can you do this job?\n\n` +
      `I posted a ${what}${where} on Open Job Market. You can see the full details here:\n${link}\n\n` +
      `It's free for tradespeople to join.`
    )
  }

  const handleShare = async () => {
    const link = buildUrl()
    if (!link) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Job on Open Job Market",
          text: buildText(link),
          url: link,
        })
        return
      } catch (err: any) {
        if (err?.name === "AbortError") return // user dismissed the sheet
      }
    }

    try {
      await navigator.clipboard.writeText(link)
      flashCopied()
    } catch {
      const ta = document.createElement("textarea")
      ta.value = link
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
        flashCopied()
      } catch {
        /* nothing else we can do */
      }
      document.body.removeChild(ta)
    }
  }

  const styles = prominent
    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 font-bold"
    : "border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white font-medium"

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this job"
      title={copied ? "Link copied" : "Share this job"}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${styles} ${className}`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      <span>{copied ? "Copied!" : label}</span>
    </button>
  )
}
