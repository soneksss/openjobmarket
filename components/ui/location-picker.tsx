"use client"

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, X, Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

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
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  onLocationClear,
  disabled = false,
  className,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange
}: LocationPickerProps) {
  const { toast } = useToast()
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalOnOpenChange || setInternalIsOpen
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

      // Build a SHORT address: street, postcode, country
      const address = data.address
      const parts: string[] = []

      // Street name (road or suburb/neighbourhood as fallback)
      if (address.road) {
        parts.push(address.road)
      } else if (address.suburb) {
        parts.push(address.suburb)
      } else if (address.neighbourhood) {
        parts.push(address.neighbourhood)
      } else if (address.hamlet || address.village || address.town || address.city) {
        parts.push(address.hamlet || address.village || address.town || address.city)
      }

      // Postcode
      if (address.postcode) {
        parts.push(address.postcode)
      }

      // Country (short form preferred)
      if (address.country_code) {
        // Use country code in uppercase for brevity (UK, US, DE, etc.)
        parts.push(address.country_code.toUpperCase())
      } else if (address.country) {
        parts.push(address.country)
      }

      return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`
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
        toast({
          title: "Location Access Denied",
          description: "Unable to get your location. Please ensure location permissions are enabled in your browser settings.",
          variant: "destructive",
          duration: 5000,
        })
      } finally {
        setIsLocating(false)
      }
    } else {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation. Please enter your location manually or use a modern browser.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const hasLocation = latitude && longitude

  // If controlled externally, don't render the trigger button
  const isControlled = externalIsOpen !== undefined

  return (
    <div className={className}>
      {!isControlled && hasLocation ? (
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
                <DialogContent className="max-w-5xl w-[95vw] h-[85vh] sm:h-[75vh] flex flex-col overflow-hidden p-4 sm:p-6">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-xl">Choose your location</DialogTitle>
                    <DialogDescription className="pt-2">
                      Click on the map to select your location, or use the "Locate Me" button
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 relative min-h-[300px] sm:min-h-[400px] overflow-hidden rounded-lg border">
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
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-4 pb-2 flex-shrink-0 bg-background border-t">
                    <Button variant="outline" onClick={handleCancel} className="order-2 sm:order-1">
                      Cancel
                    </Button>
                    <div className="flex gap-2 order-1 sm:order-2">
                      <Button
                        variant="outline"
                        onClick={onLocationClear}
                        className="text-destructive hover:text-destructive flex-1 sm:flex-none"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                      <Button onClick={handleSave} disabled={!tempLocation || isGettingAddress} className="flex-1 sm:flex-none">
                        {isGettingAddress ? 'Getting address...' : 'Save Location'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      ) : !isControlled ? (
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
          <DialogContent className="max-w-5xl w-[95vw] h-[85vh] sm:h-[75vh] flex flex-col overflow-hidden p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl">Choose your location</DialogTitle>
              <DialogDescription className="pt-2">
                Click on the map to select your location, or use the "Locate Me" button
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 relative min-h-[300px] sm:min-h-[400px] overflow-hidden rounded-lg border">
              <LocationMap
                ref={mapRef}
                onLocationSelect={handleLocationSelect}
                initialLat={50.8058} // Default to Portsmouth
                initialLng={-1.0872}
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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-4 pb-2 flex-shrink-0 bg-background border-t">
              <Button variant="outline" onClick={handleCancel} className="order-2 sm:order-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!tempLocation || isGettingAddress} className="flex-1 sm:flex-none order-1 sm:order-2">
                {isGettingAddress ? 'Getting address...' : 'Save Location'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Controlled dialog (no trigger button) */}
      {isControlled && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-5xl w-[95vw] h-[85vh] sm:h-[75vh] flex flex-col overflow-hidden p-4 sm:p-6">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl">Choose your location</DialogTitle>
              <DialogDescription className="pt-2">
                Click on the map to select your location, or use the "Locate Me" button
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 relative min-h-[300px] sm:min-h-[400px] overflow-hidden rounded-lg border">
              <LocationMap
                ref={mapRef}
                onLocationSelect={handleLocationSelect}
                initialLat={latitude || 51.5074}
                initialLng={longitude || -0.1278}
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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-4 pb-2 flex-shrink-0 bg-background border-t">
              <Button variant="outline" onClick={handleCancel} className="order-2 sm:order-1">
                Cancel
              </Button>
              <div className="flex gap-2 order-1 sm:order-2">
                {hasLocation && (
                  <Button
                    variant="outline"
                    onClick={onLocationClear}
                    className="text-destructive hover:text-destructive flex-1 sm:flex-none"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
                <Button onClick={handleSave} disabled={!tempLocation || isGettingAddress} className="flex-1 sm:flex-none">
                  {isGettingAddress ? 'Getting address...' : 'Save Location'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}