"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface ActiveSearch {
  jobId: string
  jobTitle: string
  tradesCount: number
  phase: string
  startedAt: number   // Date.now() when the job was posted — survives page reload
  notifiedCount: number
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
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setActiveSearchState(JSON.parse(raw))
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
