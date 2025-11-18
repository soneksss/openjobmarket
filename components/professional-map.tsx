"use client"

import { useEffect, useState } from "react"
import { MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import ProfessionalMapContainer from "./professional-map-container"

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
      <div key={`professional-map-wrapper-${center.lat}-${center.lon}-${zoom}`} style={{ height: "100%", width: "100%" }}>
        <ProfessionalMapContainer
          professionals={professionalsWithCoordinates}
          center={centerArray}
          zoom={zoom}
          onMapClick={onMapClick}
          selectedLocation={selectedLocation}
          showRadius={showRadius}
          radiusCenter={radiusCenter}
          radiusKm={radiusKm}
          onProfileSelect={onProfileSelect}
          selectedProfessionalId={selectedProfessionalId}
        />
      </div>
    </div>
  )
}

export default ProfessionalMap
