"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"

interface LocationSuggestion {
  id: string
  display: string
  country: string
  city?: string
  fullAddress: string
}

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}

// Sample location data - in a real app, this would come from a geocoding API
const SAMPLE_LOCATIONS: LocationSuggestion[] = [
  {
    id: "1",
    display: "London, United Kingdom",
    country: "United Kingdom",
    city: "London",
    fullAddress: "London, United Kingdom",
  },
  {
    id: "2",
    display: "New York, United States",
    country: "United States",
    city: "New York",
    fullAddress: "New York, NY, United States",
  },
  { id: "3", display: "Paris, France", country: "France", city: "Paris", fullAddress: "Paris, France" },
  { id: "4", display: "Berlin, Germany", country: "Germany", city: "Berlin", fullAddress: "Berlin, Germany" },
  { id: "5", display: "Tokyo, Japan", country: "Japan", city: "Tokyo", fullAddress: "Tokyo, Japan" },
  {
    id: "6",
    display: "Sydney, Australia",
    country: "Australia",
    city: "Sydney",
    fullAddress: "Sydney, NSW, Australia",
  },
  { id: "7", display: "Toronto, Canada", country: "Canada", city: "Toronto", fullAddress: "Toronto, ON, Canada" },
  {
    id: "8",
    display: "Amsterdam, Netherlands",
    country: "Netherlands",
    city: "Amsterdam",
    fullAddress: "Amsterdam, Netherlands",
  },
  { id: "9", display: "Stockholm, Sweden", country: "Sweden", city: "Stockholm", fullAddress: "Stockholm, Sweden" },
  { id: "10", display: "Dublin, Ireland", country: "Ireland", city: "Dublin", fullAddress: "Dublin, Ireland" },
  { id: "11", display: "Barcelona, Spain", country: "Spain", city: "Barcelona", fullAddress: "Barcelona, Spain" },
  { id: "12", display: "Milan, Italy", country: "Italy", city: "Milan", fullAddress: "Milan, Italy" },
  {
    id: "13",
    display: "Zurich, Switzerland",
    country: "Switzerland",
    city: "Zurich",
    fullAddress: "Zurich, Switzerland",
  },
  { id: "14", display: "Vienna, Austria", country: "Austria", city: "Vienna", fullAddress: "Vienna, Austria" },
  {
    id: "15",
    display: "Copenhagen, Denmark",
    country: "Denmark",
    city: "Copenhagen",
    fullAddress: "Copenhagen, Denmark",
  },
  { id: "16", display: "Helsinki, Finland", country: "Finland", city: "Helsinki", fullAddress: "Helsinki, Finland" },
  { id: "17", display: "Oslo, Norway", country: "Norway", city: "Oslo", fullAddress: "Oslo, Norway" },
  { id: "18", display: "Brussels, Belgium", country: "Belgium", city: "Brussels", fullAddress: "Brussels, Belgium" },
  {
    id: "19",
    display: "Prague, Czech Republic",
    country: "Czech Republic",
    city: "Prague",
    fullAddress: "Prague, Czech Republic",
  },
  { id: "20", display: "Warsaw, Poland", country: "Poland", city: "Warsaw", fullAddress: "Warsaw, Poland" },
]

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Enter location...",
  id,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.length > 0) {
      const filtered = SAMPLE_LOCATIONS.filter(
        (location) =>
          location.display.toLowerCase().includes(value.toLowerCase()) ||
          location.country.toLowerCase().includes(value.toLowerCase()) ||
          location.city?.toLowerCase().includes(value.toLowerCase()),
      ).slice(0, 8) // Limit to 8 suggestions

      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
    setSelectedIndex(-1)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    onChange(suggestion.fullAddress)
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }, 200)
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => value.length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        autoComplete="off"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`px-3 py-2 cursor-pointer hover:bg-accent flex items-center space-x-2 ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{suggestion.display}</div>
                <div className="text-xs text-muted-foreground truncate">{suggestion.fullAddress}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
