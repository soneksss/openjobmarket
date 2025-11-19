"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, PoundSterlingIcon } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false })

// Helper function to create custom marker icon with scaling for selection
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
    Promise.all([
      import("react-leaflet"),
      import("react")
    ]).then(([leafletMod, reactMod]) => {
      const { useMap } = leafletMod
      const { useEffect } = reactMod

      function MapUpdaterComponent({ center, zoom }: { center: [number, number]; zoom: number }) {
        const map = useMap()

        // Set view on mount
        useEffect(() => {
          if (map && map.setView) {
            console.log("[v0] Setting map view to:", center, "zoom:", zoom)
            map.setView(center, zoom)
          }
        }, [map, center, zoom])

        // Fix map size after initial render (for resizable panels)
        useEffect(() => {
          const timer = setTimeout(() => {
            if (map) {
              console.log("[v0] Invalidating map size to fix tiles")
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
            console.log("[v0] Container resized, invalidating map size")
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

interface Job {
  id: string
  title: string
  description: string
  job_type: string
  experience_level: string
  work_location: string
  location: string
  latitude?: number
  longitude?: number
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  applications_count: number
  created_at: string
  company_profiles?: {
    company_name: string
    location: string
    industry: string
  }
}

interface JobMapProps {
  jobs: Job[]
  center?: [number, number]
  zoom?: number
  height?: string
  showRadius?: boolean
  radiusCenter?: [number, number]
  radiusKm?: number
  selectedLocation?: [number, number]
  onProfileSelect?: (profile: any) => void
  onMapClick?: (lat: number, lon: number) => void
  selectedJobId?: string | null
  onJobSelect?: (job: Job) => void
}

export function JobMap({
  jobs,
  center = [51.5074, -0.1278],
  zoom = 6,
  height = "500px",
  showRadius = false,
  radiusCenter,
  radiusKm = 40.234, // Default 25 miles in km
  selectedLocation,
  onProfileSelect,
  onMapClick,
  selectedJobId = null,
  onJobSelect,
}: JobMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Check if Leaflet is loaded
    const checkLeaflet = () => {
      if (typeof window !== 'undefined' && (window as any).L) {
        setLeafletLoaded(true)
      } else {
        // Retry after a short delay
        setTimeout(checkLeaflet, 100)
      }
    }

    checkLeaflet()
  }, [])

  const validCenter: [number, number] =
    center && center[0] && center[1] && !isNaN(center[0]) && !isNaN(center[1]) ? center : [51.5074, -0.1278] // London fallback

  console.log("[v0] JobMap using center coordinates:", validCenter)

  const jobsWithCoordinates = jobs.filter(
    (job) => job.latitude && job.longitude && !isNaN(job.latitude) && !isNaN(job.longitude),
  )

  console.log("[v0] Jobs with valid coordinates:", jobsWithCoordinates.length, "out of", jobs.length)

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified"
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()}`
    if (min) return `${min.toLocaleString()}+`
    return `Up to ${max?.toLocaleString()}`
  }

  if (!isClient || !leafletLoaded) {
    return (
      <div className="w-full bg-muted rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loading map...</p>
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
      <MapContainer center={validCenter} zoom={zoom} style={{ height: "100%", width: "100%" }} className="rounded-lg" {...({} as any)}>
        <MapUpdater center={validCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          {...({} as any)}
        />
        {showRadius && radiusCenter && (
          <Circle
            center={radiusCenter}
            radius={radiusKm * 1000} // Convert km to meters
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "5, 5",
            }}
            {...({} as any)}
          />
        )}
        {jobsWithCoordinates.map((job) => {
          const isSelected = selectedJobId === job.id
          const customIcon = createCustomIcon(isSelected)

          // Skip rendering if icon is not ready yet
          if (!customIcon) return null

          return (
            <Marker
              key={job.id}
              position={[job.latitude!, job.longitude!]}
              icon={customIcon}
              eventHandlers={{
                click: (e: any) => {
                  // Prevent default popup opening
                  e.target.closePopup()
                  if (onJobSelect) {
                    // Toggle selection: if already selected, deselect; otherwise select
                    onJobSelect(isSelected ? null as any : job)
                  }
                },
              }}
              {...({} as any)}
            >
              {/* Empty popup to satisfy react-leaflet, but won't open due to closePopup */}
              <Popup autoClose={false} closeOnClick={false} closeButton={false} {...({} as any)}>
                <div></div>
              </Popup>
            </Marker>
          )
        })}

        {/* Selected location marker for map picker */}
        {selectedLocation && (() => {
          const locationIcon = createCustomIcon(true)
          if (!locationIcon) return null

          return (
            <Marker position={selectedLocation} icon={locationIcon} {...({} as any)}>
              <Popup {...({} as any)}>
                <div className="text-center">
                  <p className="font-medium">Selected Location</p>
                  <p className="text-sm text-gray-600">
                    {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })()}

        {/* Map click handler component */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
      </MapContainer>
    </div>
  )
}

export default JobMap
