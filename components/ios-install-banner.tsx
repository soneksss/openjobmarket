"use client"

import { useState, useEffect } from "react"
import { X, Share, PlusSquare } from "lucide-react"
import { isIos } from "@/lib/is-ios"
import { isPwaInstalled } from "@/lib/is-pwa-installed"

const DISMISSED_KEY = "iosInstallDismissed"

export function IOSInstallBanner() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!isIos()) return
    if (isPwaInstalled()) return
    if (localStorage.getItem(DISMISSED_KEY) === "true") return

    const timer = setTimeout(() => setVisible(true), 8000)
    return () => clearTimeout(timer)
  }, [mounted])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true")
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 pb-safe">
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 max-w-sm mx-auto">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Favicon/apple-touch-icon.png"
            alt="Open Job Market"
            width={44}
            height={44}
            className="rounded-xl flex-shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-slate-100 leading-tight">Install Open Job Market</p>
            <p className="text-[11px] text-slate-400 leading-tight">Get the app on your Home Screen</p>
          </div>
        </div>

        <p className="text-[12px] text-slate-300 leading-snug mb-3">
          Tap the <Share className="inline w-3 h-3 text-blue-400 mx-0.5 align-middle" /> Share button in Safari, then choose <span className="font-medium text-slate-200">"Add to Home Screen"</span>.
        </p>

        <ol className="space-y-1.5">
          <li className="flex items-center gap-2 text-[12px] text-slate-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
            Tap the
            <Share className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="font-medium text-slate-200">Share</span> button in Safari
          </li>
          <li className="flex items-center gap-2 text-[12px] text-slate-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
            <PlusSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            Choose <span className="font-medium text-slate-200 ml-0.5">"Add to Home Screen"</span>
          </li>
          <li className="flex items-center gap-2 text-[12px] text-slate-300">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
            Tap <span className="font-medium text-slate-200 ml-0.5">"Add"</span> to install
          </li>
        </ol>

        <div className="flex justify-center mt-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-400 animate-bounce">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
