"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Search, RotateCcw, CheckCircle } from "lucide-react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })

// Custom hook for click to place marker
const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod

      function MapClickHandlerComponent({
        onLocationSelect
      }: {
        onLocationSelect: (lat: number, lng: number) => void
      }) {
        useMapEvents({
          click(e: any) {
            const { lat, lng } = e.latlng
            onLocationSelect(lat, lng)
          },
        })
        return null
      }

      return MapClickHandlerComponent
    }),
  { ssr: false },
)

interface LocationSuggestion {
  display_name: string
  lat: string
  lon: string
  place_id: number
  address?: {
    road?: string
    house_number?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    postcode?: string
    country?: string
  }
}

// Utility function to format address in short format: Street, Town, postcode, country
function formatShortAddress(suggestion: any): string {
  if (!suggestion.address) {
    return suggestion.display_name || `${suggestion.lat}, ${suggestion.lon}`
  }

  const parts: string[] = []
  const addr = suggestion.address

  // Add street (road + house number)
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${addr.road}`)
  } else if (addr.road) {
    parts.push(addr.road)
  }

  // Add town/city
  const locality = addr.city || addr.town || addr.village || addr.suburb
  if (locality) {
    parts.push(locality)
  }

  // Add postcode
  if (addr.postcode) {
    parts.push(addr.postcode)
  }

  // Add country
  if (addr.country) {
    parts.push(addr.country)
  }

  return parts.length > 0 ? parts.join(", ") : suggestion.display_name
}

interface MapLocationPickerProps {
  value?: {
    latitude: number
    longitude: number
    address: string
  } | null
  onChange: (location: { latitude: number; longitude: number; address: string } | null) => void
  height?: string
  placeholder?: string
}

export function MapLocationPicker({
  value,
  onChange,
  height = "400px",
  placeholder = "Click on the map to select a location or search for an address"
}: MapLocationPickerProps) {
  const [isClient, setIsClient] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.5074, -0.1278]) // London default
  const [mapZoom, setMapZoom] = useState(6)
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGeocodingClick, setIsGeocodingClick] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // If there's an initial value, center the map on it
    if (value) {
      setMapCenter([value.latitude, value.longitude])
      setMapZoom(14)
    }
  }, [value])

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=gb,us,de,fr&addressdetails=1`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch location suggestions")
      }

      const data: LocationSuggestion[] = await response.json()
      setSuggestions(data)
    } catch (error) {
      console.error("Geocoding error:", error)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocodingClick(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      )

      if (!response.ok) {
        throw new Error("Failed to reverse geocode")
      }

      const data = await response.json()
      return formatShortAddress(data)
    } catch (error) {
      console.error("Reverse geocoding error:", error)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } finally {
      setIsGeocodingClick(false)
    }
  }

  const handleMapClick = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng)
    const location = {
      latitude: lat,
      longitude: lng,
      address
    }
    onChange(location)
    setMapCenter([lat, lng])
    setMapZoom(14)
  }

  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)

    const location = {
      latitude: lat,
      longitude: lng,
      address: formatShortAddress(suggestion)
    }

    onChange(location)
    setMapCenter([lat, lng])
    setMapZoom(14)
    setSearchQuery("")
    setSuggestions([])
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchLocations(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  const resetLocation = () => {
    onChange(null)
    setMapCenter([51.5074, -0.1278])
    setMapZoom(6)
    setSearchQuery("")
    setSuggestions([])
  }

  if (!isClient) {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Job Location
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {placeholder}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search for a location (e.g., 123 Main St, London)"
              className="pl-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
              </div>
            )}
          </div>

          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-blue-500 mt-1 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate font-medium">{formatShortAddress(suggestion)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected location display */}
        {value && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Location Selected</p>
                <p className="text-xs text-green-600">{value.address}</p>
                <p className="text-xs text-green-500">
                  {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetLocation}
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Map container */}
        <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
          />

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
            {...({} as any)}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              {...({} as any)}
            />

            <MapClickHandler onLocationSelect={handleMapClick} />

            {value && (
              <Marker position={[value.latitude, value.longitude]} {...({} as any)}>
                <Popup {...({} as any)}>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 mb-1">Selected Location</div>
                    <div className="text-sm text-gray-600 mb-2">{value.address}</div>
                    <div className="text-xs text-gray-500">
                      {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Loading overlay for geocoding */}
          {isGeocodingClick && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                <span className="text-sm text-gray-600">Getting address...</span>
              </div>
            </div>
          )}

          {/* Instructions overlay */}
          {!value && (
            <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3 border">
                <p className="text-sm text-gray-700 text-center">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Click anywhere on the map to select a job location
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MapLocationPicker