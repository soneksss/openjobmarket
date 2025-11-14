"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Check, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { getLocationData, LocationData, isValidLocationForMapping } from "@/lib/location-service"

interface AddressAutoCompleteProps {
  value: string
  onChange: (value: string) => void
  onLocationChange?: (locationData: LocationData | null) => void
  placeholder?: string
  className?: string
  id?: string
}

// Country-specific address suggestions organized by region
const ADDRESS_BY_COUNTRY: Record<string, string[]> = {
  // United States
  US: [
    // San Francisco Bay Area
    "101 California Street, San Francisco, CA 94111, USA",
    "1 Market Street, San Francisco, CA 94105, USA",
    "555 Market Street, San Francisco, CA 94105, USA",
    "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA", // Google
    "One Apple Park Way, Cupertino, CA 95014, USA", // Apple

    // New York
    "1 World Trade Center, New York, NY 10007, USA",
    "350 5th Avenue, New York, NY 10118, USA", // Empire State Building
    "200 Park Avenue, New York, NY 10166, USA",
    "11 Times Square, New York, NY 10036, USA",

    // Seattle
    "410 Terry Avenue North, Seattle, WA 98109, USA", // Amazon
    "1 Microsoft Way, Redmond, WA 98052, USA", // Microsoft

    // Other major cities
    "233 S Wacker Drive, Chicago, IL 60606, USA",
    "100 Congress Avenue, Austin, TX 78701, USA",
    "633 W 5th Street, Los Angeles, CA 90071, USA",
    "200 Clarendon Street, Boston, MA 02116, USA",
  ],

  // United Kingdom
  UK: [
    "1 Canada Square, London E14 5AB, UK", // Canary Wharf
    "30 St Mary Axe, London EC3A 8EP, UK", // The Gherkin
    "122 Leadenhall Street, London EC3V 4AB, UK",
    "25 Bank Street, London E14 5JP, UK",
    "40 Bank Street, London E14 5NR, UK",
    "1 Spinningfields, Manchester M3 3EB, UK",
    "120 Holborn, London EC1N 2TD, UK",
    "2 New Street Square, London EC4A 3BZ, UK",
    "33 King William Street, London EC4R 9AS, UK",
    "1 Angel Court, London EC2R 7HJ, UK",
  ],

  // Germany
  DE: [
    "Potsdamer Platz 1, 10785 Berlin, Germany",
    "Unter den Linden 1, 10117 Berlin, Germany",
    "Alexanderplatz 1, 10178 Berlin, Germany",
    "Friedrichstraße 95, 10117 Berlin, Germany",
    "Maximilianstraße 35, 80539 München, Germany",
    "Königsallee 92, 40212 Düsseldorf, Germany",
    "Neuer Wall 46, 20354 Hamburg, Germany",
    "Eschenheimer Anlage 1, 60316 Frankfurt am Main, Germany",
  ],

  // France
  FR: [
    "1 Avenue des Champs-Élysées, 75008 Paris, France",
    "4 Place Vendôme, 75001 Paris, France",
    "42 Avenue Montaigne, 75008 Paris, France",
    "1 Rue de Rivoli, 75001 Paris, France",
    "25 Place Dauphine, 75001 Paris, France",
    "Tour First, 1 Place des Saisons, 92400 Courbevoie, France",
    "22 Avenue Kléber, 75116 Paris, France",
  ],

  // Netherlands
  NL: [
    "Gustav Mahlerlaan 1, 1082 MM Amsterdam, Netherlands",
    "Zuidas, Amsterdam, Netherlands",
    "Damrak 1, 1012 LG Amsterdam, Netherlands",
    "Herengracht 1, 1015 BA Amsterdam, Netherlands",
    "Coolsingel 6, 3011 AD Rotterdam, Netherlands",
    "Lange Voorhout 1, 2514 EA Den Haag, Netherlands",
  ],

  // Canada
  CA: [
    "100 King Street West, Toronto, ON M5X 1C7, Canada",
    "181 Bay Street, Toronto, ON M5J 2T3, Canada",
    "1 First Canadian Place, Toronto, ON M5X 1A4, Canada",
    "1055 West Georgia Street, Vancouver, BC V6E 3P3, Canada",
    "700 West Georgia Street, Vancouver, BC V7Y 1A1, Canada",
    "1800 McGill College Avenue, Montreal, QC H3A 3J6, Canada",
  ],

  // Australia
  AU: [
    "Level 1, 1 Martin Place, Sydney NSW 2000, Australia",
    "Governor Phillip Tower, 1 Farrer Place, Sydney NSW 2000, Australia",
    "Australia Square, 264-278 George Street, Sydney NSW 2000, Australia",
    "101 Collins Street, Melbourne VIC 3000, Australia",
    "480 Queen Street, Brisbane QLD 4000, Australia",
    "108 St Georges Terrace, Perth WA 6000, Australia",
  ],

  // Japan
  JP: [
    "1-1-1 Otemachi, Chiyoda City, Tokyo 100-0004, Japan",
    "2-7-1 Nishishinjuku, Shinjuku City, Tokyo 163-0590, Japan",
    "1-6-1 Marunouchi, Chiyoda City, Tokyo 100-6390, Japan",
    "3-1-1 Roppongi, Minato City, Tokyo 106-6108, Japan",
  ],

  // Singapore
  SG: [
    "1 Raffles Place, Singapore 048616",
    "8 Marina Boulevard, Singapore 018981",
    "1 George Street, Singapore 049145",
    "6 Battery Road, Singapore 049909",
  ],

  // India
  IN: [
    "Bandra Kurla Complex, Mumbai, Maharashtra 400051, India",
    "Connaught Place, New Delhi, Delhi 110001, India",
    "MG Road, Bangalore, Karnataka 560001, India",
    "Park Street, Kolkata, West Bengal 700016, India",
  ],
}

// Detect country from input text
const detectCountry = (input: string): string => {
  const lowerInput = input.toLowerCase()

  if (lowerInput.includes('usa') || lowerInput.includes('united states') ||
      /\b(ca|ny|tx|fl|il|wa|ma|ga|nc|nj|va|pa|oh|mi|tn|az|in|mo|md|wi|co|mn|sc|al|la|ky|or|ok|ct|ut|ar|nv|ks|nm|ne|wv|id|nh|hi|me|ri|mt|de|sd|nd|ak|vt|wy|dc)\b/.test(lowerInput)) {
    return 'US'
  }

  if (lowerInput.includes('uk') || lowerInput.includes('united kingdom') || lowerInput.includes('london') ||
      lowerInput.includes('manchester') || lowerInput.includes('birmingham') || lowerInput.includes('edinburgh')) {
    return 'UK'
  }

  if (lowerInput.includes('germany') || lowerInput.includes('deutschland') || lowerInput.includes('berlin') ||
      lowerInput.includes('münchen') || lowerInput.includes('hamburg') || lowerInput.includes('frankfurt')) {
    return 'DE'
  }

  if (lowerInput.includes('france') || lowerInput.includes('paris') || lowerInput.includes('marseille') ||
      lowerInput.includes('lyon') || lowerInput.includes('toulouse')) {
    return 'FR'
  }

  if (lowerInput.includes('netherlands') || lowerInput.includes('holland') || lowerInput.includes('amsterdam') ||
      lowerInput.includes('rotterdam') || lowerInput.includes('den haag')) {
    return 'NL'
  }

  if (lowerInput.includes('canada') || lowerInput.includes('toronto') || lowerInput.includes('vancouver') ||
      lowerInput.includes('montreal') || lowerInput.includes('calgary')) {
    return 'CA'
  }

  if (lowerInput.includes('australia') || lowerInput.includes('sydney') || lowerInput.includes('melbourne') ||
      lowerInput.includes('brisbane') || lowerInput.includes('perth')) {
    return 'AU'
  }

  if (lowerInput.includes('japan') || lowerInput.includes('tokyo') || lowerInput.includes('osaka') ||
      lowerInput.includes('kyoto') || lowerInput.includes('yokohama')) {
    return 'JP'
  }

  if (lowerInput.includes('singapore')) {
    return 'SG'
  }

  if (lowerInput.includes('india') || lowerInput.includes('mumbai') || lowerInput.includes('delhi') ||
      lowerInput.includes('bangalore') || lowerInput.includes('kolkata')) {
    return 'IN'
  }

  // Default to US if no country detected
  return 'US'
}

// Get all suggested addresses with country-specific prioritization
const getSuggestedAddresses = (input: string): string[] => {
  const detectedCountry = detectCountry(input)
  const countryAddresses = ADDRESS_BY_COUNTRY[detectedCountry] || ADDRESS_BY_COUNTRY.US

  // Start with country-specific addresses
  let allAddresses = [...countryAddresses]

  // Add other countries' addresses for variety, but prioritize detected country
  Object.keys(ADDRESS_BY_COUNTRY).forEach(country => {
    if (country !== detectedCountry) {
      allAddresses = [...allAddresses, ...ADDRESS_BY_COUNTRY[country].slice(0, 3)]
    }
  })

  return allAddresses
}

export default function AddressAutoComplete({
  value,
  onChange,
  onLocationChange,
  placeholder = "e.g. 1600 Amphitheatre Parkway, Mountain View, CA",
  className,
  id
}: AddressAutoCompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [isGeocodingValid, setIsGeocodingValid] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.length > 0) {
      const allAddresses = getSuggestedAddresses(value)
      const filtered = allAddresses.filter(address =>
        address.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8) // Limit to 8 suggestions

      setFilteredSuggestions(filtered)
      setIsOpen(filtered.length > 0 && value.length > 1)
    } else {
      setFilteredSuggestions([])
      setIsOpen(false)
    }
    setHighlightedIndex(-1)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        dropdownRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Clear location data when user types manually
    if (newValue !== value) {
      setLocationData(null)
      setIsGeocodingValid(false)
      if (onLocationChange) {
        onLocationChange(null)
      }
    }
  }

  const handleSuggestionClick = async (suggestion: string) => {
    onChange(suggestion)
    setIsOpen(false)
    setHighlightedIndex(-1)

    // Get location data for the selected address
    try {
      const locationData = await getLocationData(suggestion)
      setLocationData(locationData)
      setIsGeocodingValid(isValidLocationForMapping(locationData))

      // Call onLocationChange if provided
      if (onLocationChange) {
        onLocationChange(locationData)
      }
    } catch (error) {
      console.error('Error getting location data:', error)
      // Continue without location data if there's an error
      if (onLocationChange) {
        onLocationChange(null)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredSuggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const handleInputFocus = () => {
    if (value.length > 1 && filteredSuggestions.length > 0) {
      setIsOpen(true)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn("pl-10 pr-10", className)}
          autoComplete="off"
        />
        {isGeocodingValid && (
          <div className="absolute right-3 top-3">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}
        {locationData && !isGeocodingValid && (
          <div className="absolute right-3 top-3">
            <Globe className="h-4 w-4 text-orange-500" />
          </div>
        )}
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={cn(
                "px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between",
                highlightedIndex === index && "bg-blue-50 text-blue-900"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{suggestion}</span>
              </div>
              {suggestion.toLowerCase() === value.toLowerCase() && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </div>
          ))}

          {value.length > 1 && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
              💡 Suggestions prioritized by detected country/region - all addresses work with mapping services
            </div>
          )}
        </div>
      )}
    </div>
  )
}