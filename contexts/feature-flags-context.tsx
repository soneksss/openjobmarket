"use client"

import React, { createContext, useContext } from 'react'
import type { FeatureFlags } from '@/lib/bootstrap'

// ─── Context ──────────────────────────────────────────────────────────────────

const FeatureFlagsContext = createContext<FeatureFlags | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Mount this once in the root layout, passing the server-fetched featureFlags.
 * The flags flow down to all client components without any extra fetches.
 *
 * Usage (app/layout.tsx):
 *   <FeatureFlagsProvider flags={featureFlags}>
 *     <LayoutContent ...>
 */
export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlags
  children: React.ReactNode
}) {
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the full FeatureFlags object.
 * Returns all-false defaults if called outside the provider (safe for SSR).
 */
export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagsContext) ?? {
    aiJobMatching:  false,
    videoQuotes:    false,
    instantBooking: false,
  }
}

/**
 * Primary API for component authors.
 * Returns the boolean value of a single feature flag.
 *
 * Example:
 *   const aiEnabled = useFeatureFlag('aiJobMatching')
 *   if (!aiEnabled) return null
 */
export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return useFeatureFlags()[flag]
}
