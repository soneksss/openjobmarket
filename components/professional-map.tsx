"use client"

import { useEffect, useRef, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/client"
import { useRouter, usePathname } from "next/navigation"
import { useLanguageRegion } from "@/contexts/language-region-context"
import { getDefaultMapCenter } from "@/lib/i18n/language-region"

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false })
const ZoomControl = dynamic(() => import("react-leaflet").then((mod) => mod.ZoomControl), { ssr: false })

// Helper function to create custom marker icon with default Leaflet appearance
function createCustomIcon(isSelected: boolean) {
  if (typeof window === 'undefined') return undefined

  const L = (window as any).L
  if (!L) return undefined

  // Use standard Leaflet marker icon with scaling
  const scale = isSelected ? 1.5 : 1
  const iconSize: [number, number] = [25 * scale, 41 * scale]
  const iconAnchor: [number, number] = [12 * scale, 41 * scale]
  const popupAnchor: [number, number] = [1 * scale, -34 * scale]

  return L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: iconSize,
    iconAnchor: iconAnchor,
    popupAnchor: popupAnchor,
    shadowSize: [41 * scale, 41 * scale]
  })
}

const MapSizeHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMap } = mod

      function MapSizeHandlerComponent() {
        const map = useMap()

        // Invalidate size once the map is fully initialized (more reliable than a fixed timeout)
        useEffect(() => {
          if (!map) return
          map.whenReady(() => map.invalidateSize({ pan: false }))
        }, [map])

        // Watch for container size changes
        useEffect(() => {
          if (!map) return

          const container = map.getContainer()
          const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize()
          })

          resizeObserver.observe(container)

          return () => {
            resizeObserver.disconnect()
          }
        }, [map])

        return null
      }

      return MapSizeHandlerComponent
    }),
  { ssr: false },
)

const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod

      function MapClickHandlerComponent({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
        useMapEvents({
          click: (e: any) => {
            onMapClick(e.latlng.lat, e.latlng.lng)
          },
        })
        return null
      }

      return MapClickHandlerComponent
    }),
  { ssr: false },
)

// Component to center map on selected professional
const ProfessionalCenterer = dynamic(
  () =>
    Promise.all([
      import("react-leaflet"),
      import("react")
    ]).then(([leafletMod, reactMod]) => {
      const { useMap } = leafletMod
      const { useEffect } = reactMod

      function ProfessionalCentererComponent({ selectedProfessional }: { selectedProfessional: any }) {
        const map = useMap()

        useEffect(() => {
          if (map && selectedProfessional && selectedProfessional.coordinates?.lat && selectedProfessional.coordinates?.lon) {
            const profLocation: [number, number] = [selectedProfessional.coordinates.lat, selectedProfessional.coordinates.lon]

            // Check if professional location is visible in current map bounds
            const bounds = map.getBounds()
            const isVisible = bounds.contains(profLocation)

            // Only pan if professional is not visible, keep current zoom
            if (!isVisible) {
              console.log("[ProfessionalMap] Panning to professional location:", profLocation)
              map.panTo(profLocation, { animate: true, duration: 0.5 })
            } else {
              console.log("[ProfessionalMap] Professional already visible, no pan needed")
            }
          }
        }, [map, selectedProfessional])

        return null
      }

      return ProfessionalCentererComponent
    }),
  { ssr: false },
)

interface Professional {
  id: string
  name: string
  title: string
  location: string
  coordinates: { lat: number; lon: number }
  skills: string[]
  experience: string
  avatar: string
  isAvailable: boolean
  minimumSalary?: number
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  salary_min?: number
  salary_max?: number
  profile_photo_url?: string
  experience_level?: string
}

interface ProfessionalMapProps {
  professionals: Professional[]
  center?: { lat: number; lon: number }
  zoom?: number
  height?: string
  user?: any
  onMapClick?: (lat: number, lon: number) => void
  selectedLocation?: [number, number]
  showRadius?: boolean
  radiusCenter?: [number, number]
  radiusKm?: number
  onSendInquiry?: (id: string, name: string) => void
  onProfileSelect?: (profile: any) => void
  selectedProfessionalId?: string | null
}

export function ProfessionalMap({
  professionals,
  center,
  zoom = 4,
  height = "500px",
  user,
  onMapClick,
  selectedLocation,
  showRadius = false,
  radiusCenter,
  radiusKm = 16.0934, // Default 10 miles in km
  onSendInquiry,
  onProfileSelect,
  selectedProfessionalId = null,
}: ProfessionalMapProps) {
  // Get language/region context for default map center
  const { state: languageRegionState } = useLanguageRegion()
  const defaultCenter = getDefaultMapCenter(languageRegionState.country)

  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [tilesReady, setTilesReady] = useState(false)
  const tileLoadCount = useRef(0)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSendInquiry = (id: string, name: string) => {
    if (onSendInquiry) {
      onSendInquiry(id, name)
    } else {
      // Fallback: Redirect to sign-up page if no handler provided
      // Preserve locale when redirecting
      const isOnBrRoute = pathname?.startsWith('/br')
      const signUpUrl = isOnBrRoute
        ? `/auth/sign-up?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
        : '/auth/sign-up'
      router.push(signUpUrl)
      console.log(`[v0] Redirecting to sign-up for contact with ${name} (ID: ${id})`)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadCSS = (): Promise<void> => {
      if ((window as any).__leafletCssLoaded) return Promise.resolve()
      return new Promise((resolve) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        link.onload = () => { ;(window as any).__leafletCssLoaded = true; resolve() }
        link.onerror = () => resolve()
        document.head.appendChild(link)
      })
    }

    const loadJS = (): Promise<void> => {
      if ((window as any).L) return Promise.resolve()
      if ((window as any).__leafletLoading) {
        return new Promise((resolve) => {
          const poll = setInterval(() => {
            if ((window as any).L) { clearInterval(poll); resolve() }
          }, 50)
        })
      }
      ;(window as any).__leafletLoading = true
      return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
        script.crossOrigin = ''
        script.onload = () => { ;(window as any).__leafletLoading = false; resolve() }
        script.onerror = () => { ;(window as any).__leafletLoading = false; resolve() }
        document.head.appendChild(script)
      })
    }

    Promise.all([loadCSS(), loadJS()]).then(() => setLeafletLoaded(true))
  }, [])

  // Use provided center or fallback to region-specific default
  const finalCenter = center || { lat: defaultCenter[0], lon: defaultCenter[1] }

  // Convert center object to array for Leaflet
  const centerArray: [number, number] = [finalCenter.lat, finalCenter.lon]

  // Filter professionals that have coordinates
  const professionalsWithCoordinates = professionals.filter((prof) => prof.coordinates?.lat && prof.coordinates?.lon)

  if (!leafletLoaded) {
    return <Skeleton className="w-full rounded-lg" style={{ height }} />
  }

  return (
    <div className="w-full relative" style={{ height }}>
      {/* Solid cover — hides the map (including any blue ocean tiles) until enough tiles have painted */}
      {!tilesReady && (
        <div className="absolute inset-0 rounded-lg bg-slate-200 z-[1000]" />
      )}
      <MapContainer
        center={centerArray}
        zoom={zoom}
        style={{ height: "100%", width: "100%", background: "#e2e8f0" }}
        className="rounded-lg"
        zoomControl={false}
        {...({} as any)}
      >
        <ZoomControl position="bottomleft" {...({} as any)} />
        <MapSizeHandler />
        <ProfessionalCenterer selectedProfessional={selectedProfessionalId ? professionals.find(p => p.id === selectedProfessionalId) : null} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            load: () => { if (!tilesReady) setTilesReady(true) },
            tileload: () => {
              tileLoadCount.current += 1
              if (!tilesReady && tileLoadCount.current >= 12) setTilesReady(true)
            },
          }}
          {...({} as any)}
        />
        {professionalsWithCoordinates.map((professional) => {
          const firstName = professional.first_name || professional.firstName || professional.name.split(' ')[0] || 'User'
          const lastName = professional.last_name || professional.lastName || professional.name.split(' ')[1] || 'Name'
          const isSelected = selectedProfessionalId === professional.id
          const customIcon = createCustomIcon(isSelected)

          // Only render marker if icon is available
          if (!customIcon) return null

          return (
            <Marker
              key={professional.id}
              position={[professional.coordinates.lat, professional.coordinates.lon]}
              icon={customIcon}
              eventHandlers={{
                click: () => {
                  if (onProfileSelect) {
                    // Toggle selection: if already selected, deselect; otherwise select
                    onProfileSelect(isSelected ? null : professional)
                  }
                }
              }}
              {...({} as any)}
            />
          )
        })}

        {/* Radius circle */}
        {showRadius && radiusCenter && (
          <Circle
            center={radiusCenter}
            radius={radiusKm * 1000} // Convert km to meters
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 2,
            }}
            {...({} as any)}
          />
        )}

        {/* Selected location marker for map picker */}
        {selectedLocation && (
          <Marker position={selectedLocation} {...({} as any)} />
        )}

        {/* Map click handler component */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      </MapContainer>
    </div>
  )
}

export default ProfessionalMap
