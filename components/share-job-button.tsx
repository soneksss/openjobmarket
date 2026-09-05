"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"

/**
 * Share button for public job pages. Uses the native share sheet
 * (navigator.share) on mobile / supported browsers, and falls back to copying
 * the link to the clipboard elsewhere. Shares the canonical page URL with any
 * tracking query params stripped.
 */
export function ShareJobButton({
  title,
  className = "",
}: {
  title?: string | null
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}${window.location.pathname}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Job on Open Job Market",
          text: title ? `Check out this job: ${title}` : "Check out this job on Open Job Market",
          url,
        })
        return
      } catch (err: any) {
        if (err?.name === "AbortError") return // user dismissed the sheet
        // otherwise fall through to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      flashCopied()
    } catch {
      // insecure context / old browser
      const ta = document.createElement("textarea")
      ta.value = url
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

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this job"
      title={copied ? "Link copied" : "Share this job"}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${className}`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
    </button>
  )
}
