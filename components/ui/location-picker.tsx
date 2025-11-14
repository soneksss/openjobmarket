"use client"

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, X, Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'

// Dynamically import the map component to avoid SSR issues
const LocationMap = dynamic(() => import('./location-map'), {
  ssr: false,
  loading: () => <div className="h-full bg-muted rounded-md flex items-center justify-center">Loading map...</div>
})

interface LocationMapRef {
  flyToLocation: (lat: number, lng: number, zoom?: number) => void
}

interface LocationPickerProps {
  latitude?: number
  longitude?: number
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  onLocationClear: () => void
  disabled?: boolean
  className?: string
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  onLocationClear,
  disabled = false,
  className
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(
    latitude && longitude ? {lat: latitude, lng: longitude} : null
  )
  const [isGettingAddress, setIsGettingAddress] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const mapRef = useRef<LocationMapRef>(null)

  const handleLocationSelect = (lat: number, lng: number) => {
    setTempLocation({lat, lng})
  }

  // Function to get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      setIsGettingAddress(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch address')
      }

      const data = await response.json()

      // Build a nice address from the response
      const address = data.address
      let formattedAddress = ''

      if (address.house_number && address.road) {
        formattedAddress = `${address.house_number} ${address.road}`
      } else if (address.road) {
        formattedAddress = address.road
      } else if (address.hamlet || address.village || address.town || address.city) {
        formattedAddress = address.hamlet || address.village || address.town || address.city
      }

      if (address.city && !formattedAddress.includes(address.city)) {
        formattedAddress += formattedAddress ? `, ${address.city}` : address.city
      } else if (address.town && !formattedAddress.includes(address.town)) {
        formattedAddress += formattedAddress ? `, ${address.town}` : address.town
      }

      if (address.county && !formattedAddress.includes(address.county)) {
        formattedAddress += formattedAddress ? `, ${address.county}` : address.county
      }

      if (address.country && !formattedAddress.includes(address.country)) {
        formattedAddress += formattedAddress ? `, ${address.country}` : address.country
      }

      return formattedAddress || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (error) {
      console.error('Error getting address:', error)
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } finally {
      setIsGettingAddress(false)
    }
  }

  const handleSave = async () => {
    if (tempLocation) {
      const address = await getAddressFromCoordinates(tempLocation.lat, tempLocation.lng)
      onLocationSelect(tempLocation.lat, tempLocation.lng, address)
      setIsOpen(false)
    }
  }

  const handleCancel = () => {
    setTempLocation(latitude && longitude ? {lat: latitude, lng: longitude} : null)
    setIsOpen(false)
  }

  const handleLocateMe = async () => {
    if ("geolocation" in navigator) {
      setIsLocating(true)
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          })
        })
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setTempLocation({ lat, lng })

        // Use the map ref to fly to the location with zoom 14 (town visibility)
        if (mapRef.current) {
          mapRef.current.flyToLocation(lat, lng, 14)
        }
      } catch (error) {
        console.error("Error getting location:", error)
        alert("Unable to get your location. Please ensure location permissions are enabled.")
      } finally {
        setIsLocating(false)
      }
    } else {
      alert("Geolocation is not supported by your browser")
    }
  }

  const hasLocation = latitude && longitude

  return (
    <div className={className}>
      {hasLocation ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <div className="text-sm">
                <div className="font-medium">Location set</div>
                <div className="text-muted-foreground">
                  Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={disabled}>
                    <MapPin className="h-3 w-3 mr-1" />
                    Change
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-xl">Choose your location</DialogTitle>
                    <DialogDescription className="pt-2">
                      Click on the map to select your location, or use the "Locate Me" button
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 relative min-h-0">
                    <LocationMap
                      ref={mapRef}
                      onLocationSelect={handleLocationSelect}
                      initialLat={latitude}
                      initialLng={longitude}
                    />
                    {/* Locate Me button overlay on map */}
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleLocateMe}
                        disabled={isLocating}
                        className="shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLocating ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                            Locating...
                          </>
                        ) : (
                          <>
                            <Crosshair className="h-4 w-4 mr-2" />
                            Locate Me
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 flex-shrink-0">
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={onLocationClear}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear Location
                      </Button>
                      <Button onClick={handleSave} disabled={!tempLocation || isGettingAddress}>
                        {isGettingAddress ? 'Getting address...' : 'Save Location'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      ) : (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
              disabled={disabled}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Choose location on map
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl">Choose your location</DialogTitle>
              <DialogDescription className="pt-2">
                Click on the map to select your location, or use the "Locate Me" button
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 relative min-h-0">
              <LocationMap
                ref={mapRef}
                onLocationSelect={handleLocationSelect}
                initialLat={51.5074} // Default to London
                initialLng={-0.1278}
              />
              {/* Locate Me button overlay on map */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLocating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Locating...
                    </>
                  ) : (
                    <>
                      <Crosshair className="h-4 w-4 mr-2" />
                      Locate Me
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 flex-shrink-0">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!tempLocation || isGettingAddress}>
                {isGettingAddress ? 'Getting address...' : 'Save Location'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}