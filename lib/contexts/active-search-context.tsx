"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface ActiveSearch {
  jobId: string
  jobTitle: string
  tradesCount: number
  phase: string
  startedAt: number   // Date.now() when the job was posted — survives page reload
  notifiedCount: number
  userId?: string     // homeowner who started the search — used to clear on account switch
  expiresAt?: number  // Date.now() + TTL — bar auto-hides after this timestamp
}

interface ActiveSearchContextType {
  activeSearch: ActiveSearch | null
  setActiveSearch: (s: ActiveSearch) => void
  clearActiveSearch: () => void
}

const ActiveSearchContext = createContext<ActiveSearchContextType>({
  activeSearch: null,
  setActiveSearch: () => {},
  clearActiveSearch: () => {},
})

const STORAGE_KEY = "ojm_active_search"

export function ActiveSearchProvider({ children }: { children: ReactNode }) {
  const [activeSearch, setActiveSearchState] = useState<ActiveSearch | null>(null)

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  // Auto-discard if the job has already expired
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved: ActiveSearch = JSON.parse(raw)
      // If expiresAt is set and in the past, wipe it so the bar never re-appears
      // Fallback: if expiresAt is missing, use startedAt + 4 h as the max TTL
      const effectiveExpiry = saved.expiresAt ?? (saved.startedAt ? saved.startedAt + 4 * 60 * 60 * 1000 : null)
      if (effectiveExpiry && Date.now() > effectiveExpiry) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      setActiveSearchState(saved)
    } catch {}
  }, [])

  const setActiveSearch = (s: ActiveSearch) => {
    setActiveSearchState(s)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
  }

  const clearActiveSearch = () => {
    setActiveSearchState(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <ActiveSearchContext.Provider value={{ activeSearch, setActiveSearch, clearActiveSearch }}>
      {children}
    </ActiveSearchContext.Provider>
  )
}

export const useActiveSearch = () => useContext(ActiveSearchContext)
