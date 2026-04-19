"use client"

import { useEffect, useState } from 'react'

/**
 * AppVersionGate — blocks the app with an "Update Required" screen when:
 *   1. forceUpdate === true  (set via admin panel or DB)
 *   2. Running inside Capacitor (not in a regular browser tab)
 *   3. The installed native app version is below minAppVersion
 *
 * In all other cases, children are rendered immediately with zero overhead.
 * The version check is async — there is no flash because we only show the gate
 * AFTER confirming all three conditions.
 */

interface AppVersionGateProps {
  children: React.ReactNode
  minAppVersion: string
  forceUpdate: boolean
}

/** Pure semver less-than comparison for three-part version strings (no deps). */
function semverLt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va < vb) return true
    if (va > vb) return false
  }
  return false
}

export function AppVersionGate({ children, minAppVersion, forceUpdate }: AppVersionGateProps) {
  const [updateRequired, setUpdateRequired] = useState(false)

  useEffect(() => {
    // Only check when forceUpdate is enabled — no-op for most users
    if (!forceUpdate) return
    // Only run inside a Capacitor native app
    if (!(window as any).Capacitor?.isNativePlatform?.()) return

    import('@capacitor/app')
      .then(({ App }) =>
        App.getInfo().then(({ version }) => {
          if (semverLt(version, minAppVersion)) {
            setUpdateRequired(true)
          }
        })
      )
      .catch(() => {
        // Plugin not installed or not in native context — never block the user
      })
  }, [minAppVersion, forceUpdate])

  if (updateRequired) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 z-[9999]">
        <div className="max-w-sm w-full text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Update Required</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              This version of Open Job Market is no longer supported.
              Please update to continue using the app.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="https://play.google.com/store/apps/details?id=com.openjobmarket.app"
              className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Update on Google Play
            </a>
            <a
              href="https://apps.apple.com/app/open-job-market/id0000000000"
              className="block w-full bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Update on App Store
            </a>
          </div>

          <p className="text-xs text-slate-600">
            Required version: {minAppVersion}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
