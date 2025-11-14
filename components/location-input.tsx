"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MapPin, AlertCircle } from "lucide-react"

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
function formatShortAddress(suggestion: LocationSuggestion): string {
  if (!suggestion.address) {
    // Fallback to display_name if address details not available
    return suggestion.display_name
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

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  onLocationSelect: (location: string, lat: number, lon: number) => void
  placeholder?: string
  error?: string
  className?: string
}

export function LocationInput({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter postcode or address",
  error,
  className = "",
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    setValidationError(null)

    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=gb,us,de,fr&addressdetails=1`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch location suggestions")
      }

      const data: LocationSuggestion[] = await response.json()
      setSuggestions(data)

      if (data.length === 0) {
        setValidationError("No locations found. Please check your postcode or address.")
      }
    } catch (error) {
      console.error("Geocoding error:", error)
      setValidationError("Unable to validate location. Please try again.")
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setShowSuggestions(true)
    setValidationError(null)

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(newValue)
    }, 300)
  }

  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const lat = Number.parseFloat(suggestion.lat)
    const lon = Number.parseFloat(suggestion.lon)
    const shortAddress = formatShortAddress(suggestion)

    onChange(shortAddress)
    onLocationSelect(shortAddress, lat, lon)
    setSuggestions([])
    setShowSuggestions(false)
    setValidationError(null)
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
    }, 200)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`h-8 sm:h-10 md:h-12 text-sm md:text-base px-3 md:px-4 bg-white border-0 focus:ring-2 focus:ring-emerald-500/30 rounded-md md:rounded-lg font-medium placeholder:text-gray-500 shadow-md w-full ${
            error || validationError ? "ring-2 ring-red-500" : ""
          } ${className}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 md:pr-4 pointer-events-none">
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-emerald-600 rounded-full" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Error message */}
      {(error || validationError) && (
        <div className="flex items-center mt-2 text-sm text-red-400 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error || validationError}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-emerald-500 mt-1 mr-3 flex-shrink-0" />
                <span className="text-sm text-gray-900 truncate font-medium">{formatShortAddress(suggestion)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
