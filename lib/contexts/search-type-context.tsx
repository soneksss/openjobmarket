"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export type SearchType = "traders" | "jobs_tasks" | "vacancies" | "talents"

interface SearchTypeContextType {
  searchType: SearchType
  setSearchType: (type: SearchType) => void
}

const SearchTypeContext = createContext<SearchTypeContextType | undefined>(undefined)

export function SearchTypeProvider({ children }: { children: ReactNode }) {
  // Default to "traders" (Tradespeople) for unregistered users
  const [searchType, setSearchType] = useState<SearchType>("traders")

  return (
    <SearchTypeContext.Provider value={{ searchType, setSearchType }}>
      {children}
    </SearchTypeContext.Provider>
  )
}

export function useSearchType() {
  const context = useContext(SearchTypeContext)
  if (!context) {
    throw new Error("useSearchType must be used within SearchTypeProvider")
  }
  return context
}
