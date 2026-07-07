"use client"

import { useEffect, useState, useCallback } from "react"
import { MapPin, Search, RotateCcw, CheckCircle2, Crosshair } from "lucide-react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { useLanguageRegion } from "@/contexts/language-region-context"
import { getDefaultMapCenter } from "@/lib/i18n/language-region"
import { useTranslation } from "@/lib/i18n/context"

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })

const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod
      return function MapClickHandlerComponent({
        onLocationSelect,
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
    }),
  { ssr: false }
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

function formatShortAddress(suggestion: any): string {
  if (!suggestion.address) return suggestion.display_name || `${suggestion.lat}, ${suggestion.lon}`
  const parts: string[] = []
  const addr = suggestion.address

  if (addr.house_number && addr.road) parts.push(`${addr.house_number} ${addr.road}`)
  else if (addr.road) parts.push(addr.road)

  const locality = addr.city || addr.town || addr.village || addr.suburb
  if (locality) parts.push(locality)
  if (addr.postcode) parts.push(addr.postcode)
  if (addr.country) parts.push(addr.country)

  return parts.length > 0 ? parts.join(", ") : suggestion.display_name
}

interface MapLocationPickerProps {
  value?: { latitude: number; longitude: number; address: string } | null
  onChange: (location: { latitude: number; longitude: number; address: string } | null) => void
  height?: string
  placeholder?: string
  /** Show the address search bar inside the map card. Default: false */
  showSearch?: boolean
  /** Override the default center (e.g. user's GPS location). Zooms to 13 when provided. */
  defaultCenter?: [number, number]
}

export function MapLocationPicker({
  value,
  onChange,
  height = "400px",
  placeholder,
  showSearch = false,
  defaultCenter: propDefaultCenter,
}: MapLocationPickerProps) {
  const { state: languageRegionState } = useLanguageRegion()
  const countryCenter = getDefaultMapCenter(languageRegionState.country)
  const defaultCenter = countryCenter
  const { t } = useTranslation()

  const effectiveInitialCenter = propDefaultCenter ?? countryCenter
  // Zoom 12 ≈ 10-mile radius; zoom 6 = whole-country fallback
  const effectiveInitialZoom = propDefaultCenter ? 12 : 6

  const [isClient, setIsClient] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>(effectiveInitialCenter)
  const [mapZoom, setMapZoom] = useState(effectiveInitialZoom)
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGeocodingClick, setIsGeocodingClick] = useState(false)

  useEffect(() => {
    setIsClient(true)
    if (value) {
      setMapCenter([value.latitude, value.longitude])
      setMapZoom(14)
    }

    if (typeof window !== "undefined") {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      link.crossOrigin = ""
      document.head.appendChild(link)
    }
  }, [value])

  useEffect(() => {
    if (!value) {
      const newCenter = propDefaultCenter ?? getDefaultMapCenter(languageRegionState.country)
      const newZoom = propDefaultCenter ? 12 : 6
      setMapCenter(newCenter)
      setMapZoom(newZoom)
    }
  }, [languageRegionState.country, value, propDefaultCenter?.[0], propDefaultCenter?.[1]])

  const searchLocations = async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return }
    setIsSearching(true)
    try {
      const countryCodes = languageRegionState.country === 'BR' ? 'br,pt,us' : 'gb,us,de,fr,br'
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=${countryCodes}&addressdetails=1`
      )
      if (!res.ok) throw new Error("Failed to fetch location suggestions")
      const data: LocationSuggestion[] = await res.json()
      setSuggestions(data)
    } catch (err) {
      console.error(err)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocodingClick(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )
      if (!res.ok) throw new Error("Failed to reverse geocode")
      const data = await res.json()
      return formatShortAddress(data)
    } catch (err) {
      console.error(err)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } finally {
      setIsGeocodingClick(false)
    }
  }

  const handleMapClick = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng)
    onChange({ latitude: lat, longitude: lng, address })
    setMapCenter([lat, lng])
    setMapZoom(14)
  }

  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)
    onChange({ latitude: lat, longitude: lng, address: formatShortAddress(suggestion) })
    setMapCenter([lat, lng])
    setMapZoom(14)
    setSearchQuery("")
    setSuggestions([])
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    const timeoutId = setTimeout(() => searchLocations(query), 300)
    return () => clearTimeout(timeoutId)
  }

  const resetLocation = () => {
    onChange(null)
    setMapCenter(propDefaultCenter ?? defaultCenter)
    setMapZoom(propDefaultCenter ? 12 : 6)
    setSearchQuery("")
    setSuggestions([])
  }

  const handleMyLocation = useCallback(() => {
    if (!navigator?.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setMapCenter([lat, lng])
        setMapZoom(12)
        const address = await reverseGeocode(lat, lng)
        onChange({ latitude: lat, longitude: lng, address })
      },
      () => {},
      { timeout: 10_000, maximumAge: 60_000 }
    )
  }, [reverseGeocode, onChange])

  if (!isClient) {
    return (
      <div
        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-emerald-400 rounded-full" />
          Loading map…
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-0">
      {/* Optional search bar */}
      {showSearch && (
        <div className="relative mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search for an address…"
              className="pl-10 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-emerald-400 rounded-full" />
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-auto">
              {suggestions.map((s) => (
                <button
                  key={s.place_id}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-slate-700/60 focus:bg-slate-700/60 focus:outline-none border-b border-slate-700/50 last:border-b-0 transition-colors"
                  onClick={() => handleSuggestionSelect(s)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-white truncate">{formatShortAddress(s)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden" style={{ height }}>
        {/* Hint label — only shown when no location set */}
        {!value && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 shadow-lg backdrop-blur-sm">
              <MapPin className="h-3 w-3 text-emerald-400" />
              {placeholder || "Tap map to drop pin"}
            </span>
          </div>
        )}

        {/* Geocoding overlay */}
        {isGeocodingClick && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-[1001] backdrop-blur-[2px]">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 shadow-lg">
              <div className="animate-spin h-4 w-4 border-2 border-slate-600 border-t-emerald-400 rounded-full" />
              <span className="text-xs text-slate-300">Confirming location…</span>
            </div>
          </div>
        )}

        <MapContainer
          key={`map-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          {value && (
            <Marker position={[value.latitude, value.longitude]}>
              <Popup>
                <div className="text-center text-xs">
                  <div className="font-semibold text-gray-800 mb-0.5">Location pinned</div>
                  <div className="text-gray-500">{value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* My Location button */}
        <button
          type="button"
          onClick={handleMyLocation}
          className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-[11px] font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-slate-800/90 active:scale-95 transition-all"
        >
          <Crosshair className="h-3.5 w-3.5 text-emerald-400" />
          My Location
        </button>

        {/* Compact confirmation bar — shown at bottom of map when location is set */}
        {value && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000] px-2.5 py-2 bg-slate-900/85 backdrop-blur-sm border-t border-slate-700/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-300">Location pinned</span>
              <span className="text-[11px] text-slate-400 truncate ml-1">
                {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
              </span>
            </div>
            <button
              type="button"
              onClick={resetLocation}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MapLocationPicker
