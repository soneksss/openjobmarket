"use client"

import React, { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, X, Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useLocationPermission } from '@/hooks/use-location-permission'
import { LocationPermissionModal } from '@/components/location-permission-modal'

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
  address?: string
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
  address,
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
  const { permState, showModal, requestLocation, confirmModal, dismissModal } = useLocationPermission()

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

  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation. Please enter your location manually or use a modern browser.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }
    setIsLocating(true)
    requestLocation(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setTempLocation({ lat, lng })
        if (mapRef.current) mapRef.current.flyToLocation(lat, lng, 14)
        setIsLocating(false)
      },
      () => {
        toast({
          title: "Location Access Denied",
          description: "Unable to get your location. Please ensure location permissions are enabled in your browser settings.",
          variant: "destructive",
          duration: 5000,
        })
        setIsLocating(false)
      },
    )
  }

  const hasLocation = latitude && longitude

  // Shared map + footer content (used in all three dialog variants)
  const dialogBody = (initialLat: number, initialLng: number, showClear: boolean) => (
    <>
      <div className="relative rounded-lg border overflow-hidden" style={{ height: 'clamp(280px, 50vh, 520px)' }}>
        <LocationMap
          ref={mapRef}
          onLocationSelect={handleLocationSelect}
          initialLat={initialLat}
          initialLng={initialLng}
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

      {/* Footer — always visible, never inside a flex-1 area */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-4 border-t border-slate-700">
        <Button variant="outline" onClick={handleCancel} className="order-2 sm:order-1 border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white">
          Cancel
        </Button>
        <div className="flex gap-2 order-1 sm:order-2">
          {showClear && (
            <Button
              variant="outline"
              onClick={onLocationClear}
              className="text-red-400 hover:text-red-300 border-slate-600 bg-slate-700/50 hover:bg-slate-700 flex-1 sm:flex-none"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button onClick={handleSave} disabled={!tempLocation || isGettingAddress} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white border-0">
            {isGettingAddress ? 'Getting address...' : 'Save Location'}
          </Button>
        </div>
      </div>
    </>
  )

  // If controlled externally, don't render the trigger button
  const isControlled = externalIsOpen !== undefined

  return (
    <div className={className}>
      <LocationPermissionModal
        open={showModal}
        reason="to pin your exact location on the map"
        permState={permState}
        onAllow={confirmModal}
        onDeny={dismissModal}
      />
      {!isControlled && hasLocation ? (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-300 leading-none mb-0.5">Location pinned</p>
              <p className="text-xs text-slate-400 truncate">
                {address || `${latitude!.toFixed(2)}, ${longitude!.toFixed(2)}`}
              </p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="flex-shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 rounded-md px-2.5 py-1 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                Change
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-[95vw] p-4 sm:p-6">
              <DialogHeader className="mb-3">
                <DialogTitle className="text-xl">Choose your location</DialogTitle>
                <DialogDescription>
                  Click on the map to select your location, or use the "Locate Me" button
                </DialogDescription>
              </DialogHeader>
              {dialogBody(latitude!, longitude!, true)}
            </DialogContent>
          </Dialog>
        </div>
      ) : !isControlled ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white text-sm font-medium py-2.5 transition-all disabled:opacity-50"
            >
              <MapPin className="h-4 w-4 text-emerald-400" />
              Pin location on map
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl w-[95vw] p-4 sm:p-6">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-xl">Choose your location</DialogTitle>
              <DialogDescription>
                Click on the map to select your location, or use the "Locate Me" button
              </DialogDescription>
            </DialogHeader>
            {dialogBody(50.8058, -1.0872, false)}
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Controlled dialog (no trigger button) */}
      {isControlled && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-3xl w-[95vw] p-4 sm:p-6">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-xl">Choose your location</DialogTitle>
              <DialogDescription>
                Click on the map to select your location, or use the "Locate Me" button
              </DialogDescription>
            </DialogHeader>
            {dialogBody(latitude || 51.5074, longitude || -0.1278, !!hasLocation)}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
