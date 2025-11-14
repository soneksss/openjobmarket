"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"

interface MapPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  center: [number, number]
  onConfirm: (lat: number, lon: number, name: string) => void
}

declare global {
  interface Window {
    L: any
  }
}

export default function MapPickerDialog({
  open,
  onOpenChange,
  center,
  onConfirm,
}: MapPickerDialogProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    console.log('[MAP-PICKER] useEffect triggered, open:', open, 'mapRef.current:', !!mapRef.current)

    if (!open) {
      console.log('[MAP-PICKER] Dialog closed, cleaning up')
      // Clean up when dialog closes
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          console.error('[MAP-PICKER] Error removing map:', e)
        }
        mapInstanceRef.current = null
        markerRef.current = null
      }
      setSelectedLocation(null)
      setIsLoading(true)
      return
    }

    // Wait for the dialog content to render and mapRef to be available
    let attempts = 0
    const maxAttempts = 50 // Max 5 seconds

    const checkMapRef = () => {
      attempts++
      console.log('[MAP-PICKER] Checking mapRef, attempt:', attempts, 'mapRef.current:', !!mapRef.current)

      if (!mapRef.current) {
        if (attempts >= maxAttempts) {
          console.error('[MAP-PICKER] mapRef never became available after', maxAttempts, 'attempts')
          setIsLoading(false)
          return
        }
        setTimeout(checkMapRef, 100)
        return
      }

      console.log('[MAP-PICKER] mapRef is ready, starting initialization')
      loadLeaflet()
    }

    // Wait for dialog to be fully rendered
    const initTimer = setTimeout(() => {
      checkMapRef()
    }, 150)

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      console.log('[MAP-PICKER] Loading Leaflet, window.L exists:', !!window.L)

      if (typeof window !== 'undefined' && !window.L) {
        console.log('[MAP-PICKER] Leaflet not loaded, loading now...')
        // Load Leaflet CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)

        // Load Leaflet JS
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => {
          console.log('[MAP-PICKER] Leaflet script loaded')
          setTimeout(() => {
            setIsLoading(false)
            initializeMap()
          }, 200)
        }
        document.head.appendChild(script)
      } else if (window.L) {
        console.log('[MAP-PICKER] Leaflet already loaded, initializing map')
        setIsLoading(false)
        setTimeout(() => {
          initializeMap()
        }, 200)
      } else {
        console.error('[MAP-PICKER] Unexpected state - no window or Leaflet')
        setIsLoading(false)
      }
    }

    const initializeMap = () => {
      console.log('[MAP-PICKER] initializeMap called, mapRef.current:', !!mapRef.current, 'mapInstanceRef.current:', !!mapInstanceRef.current)

      if (!mapRef.current) {
        console.error('[MAP-PICKER] mapRef.current is null')
        return
      }

      if (mapInstanceRef.current) {
        console.log('[MAP-PICKER] Map instance already exists, skipping')
        return
      }

      const L = window.L
      console.log('[MAP-PICKER] Initializing map with center:', center)

      try {
        // Remove any existing Leaflet container class
        if ((mapRef.current as any)._leaflet_id) {
          console.log('[MAP-PICKER] Removing existing leaflet_id')
          delete (mapRef.current as any)._leaflet_id
        }

        // Initialize map
        mapInstanceRef.current = L.map(mapRef.current).setView(center, 10)
        console.log('[MAP-PICKER] Map initialized successfully')
      } catch (error) {
        console.error('[MAP-PICKER] Error initializing map:', error)
        return
      }

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current)

      // Set cursor to crosshair
      mapInstanceRef.current.getContainer().style.cursor = 'crosshair'

      // Add map click handler
      mapInstanceRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        setSelectedLocation({ lat, lon: lng })

        // Remove existing marker
        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current)
        }

        // Add new marker
        const icon = L.divIcon({
          html: `<div style="background: #ef4444; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                   <div style="color: white; font-size: 12px;">📍</div>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })

        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current)
      })

      // Fix map size after dialog animation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }, 300)
    }

    return () => {
      clearTimeout(initTimer)
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [open, center])

  const handleConfirm = () => {
    if (selectedLocation) {
      const name = `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lon.toFixed(4)}`
      onConfirm(selectedLocation.lat, selectedLocation.lon, name)
      setSelectedLocation(null)
    }
  }

  const handleCancel = () => {
    setSelectedLocation(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Pick a Location</DialogTitle>
          <DialogDescription>
            Click anywhere on the map to select your location
          </DialogDescription>
        </DialogHeader>
        <div className="h-[500px] relative p-6 pt-4">
          {/* Map container - always rendered so ref is available */}
          <div ref={mapRef} className="h-full w-full rounded-lg" />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 m-6 mt-4 flex items-center justify-center bg-white rounded-lg z-[999]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {/* Location Picker Card Overlay - Compact version at top center */}
          {!isLoading && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
              <Card className="shadow-xl border-2 border-orange-500">
                  <CardContent className="py-0.5 px-2">
                    {selectedLocation ? (
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold whitespace-nowrap">
                          Location: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
                        </p>
                        <Button
                          size="sm"
                          onClick={handleConfirm}
                          className="h-8 text-sm font-semibold bg-orange-500 hover:bg-orange-600 whitespace-nowrap px-3"
                        >
                          Use This Location
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancel}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <p className="text-base font-bold leading-tight">Click on the map to select a location</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancel}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
