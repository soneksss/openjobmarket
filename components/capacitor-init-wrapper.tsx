"use client"

import dynamic from "next/dynamic"

const CapacitorInit = dynamic(
  () => import("./capacitor-init").then(m => ({ default: m.CapacitorInit })),
  { ssr: false }
)

export default function CapacitorInitWrapper() {
  return <CapacitorInit />
}
