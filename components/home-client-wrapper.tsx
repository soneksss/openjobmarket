"use client"

import { ReactNode } from "react"
import { SearchTypeProvider } from "@/lib/contexts/search-type-context"
import { SearchLocationProvider } from "@/lib/contexts/search-location-context"
import { HomePageWrapper } from "@/components/home-page-wrapper"

interface HomeClientWrapperProps {
  children: ReactNode
}

export function HomeClientWrapper({ children }: HomeClientWrapperProps) {
  return (
    <SearchTypeProvider>
      <SearchLocationProvider>
        <HomePageWrapper>
          {children}
        </HomePageWrapper>
      </SearchLocationProvider>
    </SearchTypeProvider>
  )
}
