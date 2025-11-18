'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const JobMapClient = dynamic(() => import('./JobMapClient'), { ssr: false })

interface JobMapProps {
  jobs: any[]
  center?: [number, number]
  zoom?: number
  height?: string
  selectedLocation?: [number, number]
  showRadius?: boolean
  radiusCenter?: [number, number]
  radiusKm?: number
  onMapClick?: (lat: number, lon: number) => void
  onJobSelect?: (job: any | null) => void
  selectedJobId?: string | null
  onProfileSelect?: (profile: any) => void
}

export default function JobMap(props: JobMapProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div style={{ height: props.height || '500px', width: '100%' }}>Loading map...</div>

  return <JobMapClient {...props} />
}
