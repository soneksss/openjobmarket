"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export interface SearchLocation {
  lat: number
  lon: number
  name: string
}

interface SearchLocationContextType {
  location: SearchLocation | null
  setLocation: (location: SearchLocation | null) => void
}

const SearchLocationContext = createContext<SearchLocationContextType | undefined>(undefined)

export function SearchLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<SearchLocation | null>(null)

  return (
    <SearchLocationContext.Provider value={{ location, setLocation }}>
      {children}
    </SearchLocationContext.Provider>
  )
}

export function useSearchLocation() {
  const context = useContext(SearchLocationContext)
  if (!context) {
    throw new Error("useSearchLocation must be used within SearchLocationProvider")
  }
  return context
}
