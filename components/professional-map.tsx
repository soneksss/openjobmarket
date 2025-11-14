"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, MessageCircle } from "lucide-react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false })

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

const MapUpdater = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMap } = mod

      function MapUpdaterComponent({ center, zoom }: { center: [number, number]; zoom: number }) {
        const map = useMap()

        useEffect(() => {
          if (map && map.setView) {
            map.setView(center, zoom)
          }
        }, [map, center, zoom])

        // Fix map size after initial render (for resizable panels)
        useEffect(() => {
          const timer = setTimeout(() => {
            if (map) {
              console.log("[PROFESSIONAL-MAP] Invalidating map size to fix tiles")
              map.invalidateSize()
            }
          }, 300)
          return () => clearTimeout(timer)
        }, [map])

        // Watch for container size changes
        useEffect(() => {
          if (!map) return

          const container = map.getContainer()
          const resizeObserver = new ResizeObserver(() => {
            console.log("[PROFESSIONAL-MAP] Container resized, invalidating map size")
            map.invalidateSize()
          })

          resizeObserver.observe(container)

          return () => {
            resizeObserver.disconnect()
          }
        }, [map])

        return null
      }

      return MapUpdaterComponent
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
  center = { lat: 39.8283, lon: -98.5795 },
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
  const [isClient, setIsClient] = useState(false)
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const [mapKey, setMapKey] = useState(0) // Added key to force map re-render
  const router = useRouter()
  const supabase = createClient()

  const handleSendInquiry = (id: string, name: string) => {
    if (onSendInquiry) {
      onSendInquiry(id, name)
    } else {
      // Fallback: Redirect to sign-up page if no handler provided
      router.push("/auth/sign-up")
      console.log(`[v0] Redirecting to sign-up for contact with ${name} (ID: ${id})`)
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    setMapKey((prev) => prev + 1)
    console.log(`[v0] Map center updated to: [${center.lat}, ${center.lon}] zoom: ${zoom}`)
  }, [center.lat, center.lon, zoom])

  // Convert center object to array for Leaflet
  const centerArray: [number, number] = [center.lat, center.lon]

  // Filter professionals that have coordinates
  const professionalsWithCoordinates = professionals.filter((prof) => prof.coordinates?.lat && prof.coordinates?.lon)

  console.log(
    `[v0] ProfessionalMap rendering with ${professionalsWithCoordinates.length} professionals at center [${center.lat}, ${center.lon}]`,
  )

  if (!isClient) {
    return (
      <div className="w-full bg-muted rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading interactive map...</p>
          <p className="text-xs text-muted-foreground mt-1">
            {professionalsWithCoordinates.length} professionals with location data
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <MapContainer
        key={mapKey}
        center={centerArray}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
        {...({} as any)}
      >
        <MapUpdater center={centerArray} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
