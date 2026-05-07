"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function BrowseTradespeopleButton({ className }: { className?: string }) {
  const router = useRouter()
  const [showPostcode, setShowPostcode] = useState(false)
  const [postcode, setPostcode] = useState("")

  const handleClick = () => {
    if (!navigator.geolocation) { setShowPostcode(true); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => router.push(`/find?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`),
      () => setShowPostcode(true)
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = postcode.trim()
    if (trimmed) router.push(`/find?postcode=${encodeURIComponent(trimmed)}`)
  }

  if (showPostcode) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="Enter postcode"
          className="px-3 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 w-36"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
        >
          Go
        </button>
      </form>
    )
  }

  return (
    <button onClick={handleClick} className={className}>
      Browse Tradespeople
    </button>
  )
}
