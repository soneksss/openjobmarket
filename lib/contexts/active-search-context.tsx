"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface ActiveSearch {
  jobId: string
  jobTitle: string
  tradesCount: number
  phase: string
  startedAt: number          // epoch ms when search was started — survives reload
  notifiedCount: number
  userId?: string            // homeowner who started — cleared on account switch
  expiresAt?: number         // epoch ms hard deadline (from DB expires_at)
  urgencyType?: "asap" | "today"
  initialDurationSeconds?: number  // allows timer restoration on restart
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

  // Hydrate from localStorage — auto-discard expired entries
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved: ActiveSearch = JSON.parse(raw)
      const effectiveExpiry =
        saved.expiresAt ??
        (saved.startedAt ? saved.startedAt + 4 * 60 * 60 * 1000 : null)
      if (effectiveExpiry && Date.now() > effectiveExpiry) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      setActiveSearchState(saved)
    } catch {}
  }, [])

  // Sync writes to localStorage and broadcast to other tabs
  const setActiveSearch = (s: ActiveSearch) => {
    setActiveSearchState(s)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
  }

  const clearActiveSearch = () => {
    setActiveSearchState(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  // Cross-tab sync: another tab cleared the search (e.g. job confirmed)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      if (!e.newValue) {
        setActiveSearchState(null)
      } else {
        try { setActiveSearchState(JSON.parse(e.newValue)) } catch {}
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  return (
    <ActiveSearchContext.Provider value={{ activeSearch, setActiveSearch, clearActiveSearch }}>
      {children}
    </ActiveSearchContext.Provider>
  )
}

export const useActiveSearch = () => useContext(ActiveSearchContext)
