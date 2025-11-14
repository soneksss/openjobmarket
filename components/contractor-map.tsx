"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Building, User, Target, X, Globe, Clock } from "lucide-react"

interface Contractor {
  id: string
  user_id: string
  type: 'professional' | 'company'
  name: string
  display_name: string
  description: string
  location: string
  latitude?: number
  longitude?: number
  photo_url?: string
  spoken_languages?: string[]
  skills?: string[]
  // Professional specific
  title?: string
  is_self_employed?: boolean
  // Company specific
  company_name?: string
  industry?: string
  service_24_7?: boolean
}

interface ContractorMapProps {
  contractors: Contractor[]
  center: [number, number]
  selectedContractor: Contractor | null
  onContractorSelect: (contractor: Contractor | null) => void
  showMapPicker?: boolean
  onMapPick?: (lat: number, lon: number) => void
  mapPickerLocation?: { lat: number; lon: number; name: string } | null
  onConfirmLocation?: () => void
  onCancelMapPicker?: () => void
  hidePickerControls?: boolean
  showRadius?: boolean
  radiusKm?: number
}

declare global {
  interface Window {
    L: any
  }
}

export default function ContractorMap({
  contractors,
  center,
  selectedContractor,
  onContractorSelect,
  showMapPicker = false,
  onMapPick,
  mapPickerLocation,
  onConfirmLocation,
  onCancelMapPicker,
  hidePickerControls = false,
  showRadius = false,
  radiusKm = 16.0934, // Default 10 miles in km
}: ContractorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const mapPickerMarkerRef = useRef<any>(null)
  const radiusCircleRef = useRef<any>(null)
  const showMapPickerRef = useRef(showMapPicker)
  const [isLoading, setIsLoading] = useState(true)

  // Keep ref in sync with prop
  useEffect(() => {
    showMapPickerRef.current = showMapPicker
  }, [showMapPicker])

  useEffect(() => {
    console.log('[CONTRACTOR-MAP] useEffect triggered, mapRef.current:', !!mapRef.current)

    // Wait for mapRef to be available
    let attempts = 0
    const maxAttempts = 50

    const checkMapRef = () => {
      attempts++
      console.log('[CONTRACTOR-MAP] Checking mapRef, attempt:', attempts, 'mapRef.current:', !!mapRef.current)

      if (!mapRef.current) {
        if (attempts >= maxAttempts) {
          console.error('[CONTRACTOR-MAP] mapRef never became available')
          setIsLoading(false)
          return
        }
        setTimeout(checkMapRef, 100)
        return
      }

      console.log('[CONTRACTOR-MAP] mapRef is ready, loading Leaflet')
      loadLeaflet()
    }

    // Start checking after a brief delay
    const timer = setTimeout(checkMapRef, 100)

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      console.log('[CONTRACTOR-MAP] Loading Leaflet, window.L exists:', !!window.L)

      if (typeof window !== 'undefined' && !window.L) {
        console.log('[CONTRACTOR-MAP] Leaflet not loaded, loading now...')
        // Load Leaflet CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)

        // Load Leaflet JS
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => {
          console.log('[CONTRACTOR-MAP] Leaflet script loaded')
          setIsLoading(false)
          initializeMap()
        }
        document.head.appendChild(script)
      } else if (window.L) {
        console.log('[CONTRACTOR-MAP] Leaflet already loaded, initializing map')
        setIsLoading(false)
        initializeMap()
      }
    }

    const initializeMap = () => {
      console.log('[CONTRACTOR-MAP] initializeMap called, mapRef.current:', !!mapRef.current, 'mapInstanceRef.current:', !!mapInstanceRef.current)

      if (!mapRef.current) {
        console.error('[CONTRACTOR-MAP] mapRef.current is null in initializeMap')
        return
      }

      if (mapInstanceRef.current) {
        console.log('[CONTRACTOR-MAP] Map instance already exists, skipping')
        return
      }

      const L = window.L
      console.log('[CONTRACTOR-MAP] Initializing map with center:', center)

      try {
        // Remove any existing Leaflet container class (from previous instances)
        if ((mapRef.current as any)._leaflet_id) {
          console.log('[CONTRACTOR-MAP] Removing existing leaflet_id')
          delete (mapRef.current as any)._leaflet_id
        }

        // Initialize map
        mapInstanceRef.current = L.map(mapRef.current).setView(center, 10)
        console.log('[CONTRACTOR-MAP] Map initialized successfully')
      } catch (error) {
        console.error('[CONTRACTOR-MAP] Error initializing map:', error)
        return
      }

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current)

      // Add map click handler for map picker (will be toggled dynamically)
      mapInstanceRef.current.on('click', (e: any) => {
        // Only handle click if map picker is active (using ref to avoid stale closure)
        if (showMapPickerRef.current && onMapPick) {
          const { lat, lng } = e.latlng
          onMapPick(lat, lng)
        }
      })

      // Add contractors to map
      updateMarkers()
    }

    return () => {
      console.log('[CONTRACTOR-MAP] Cleanup called')
      clearTimeout(timer)

      // Clean up all markers
      markersRef.current.forEach(marker => {
        try {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(marker)
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
      })
      markersRef.current = []

      // Clean up map picker marker
      if (mapPickerMarkerRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(mapPickerMarkerRef.current)
        } catch (e) {
          // Ignore errors during cleanup
        }
        mapPickerMarkerRef.current = null
      }

      // Clean up radius circle
      if (radiusCircleRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(radiusCircleRef.current)
        } catch (e) {
          // Ignore errors during cleanup
        }
        radiusCircleRef.current = null
      }

      // Clean up map instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          console.error('Error removing map:', e)
        }
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Fix map size after initial render (for resizable panels)
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    // Multiple invalidations at different intervals to ensure map renders correctly
    timers.push(setTimeout(() => {
      if (mapInstanceRef.current) {
        console.log('[CONTRACTOR-MAP] First invalidation - 100ms')
        mapInstanceRef.current.invalidateSize()
      }
    }, 100))

    timers.push(setTimeout(() => {
      if (mapInstanceRef.current) {
        console.log('[CONTRACTOR-MAP] Second invalidation - 300ms')
        mapInstanceRef.current.invalidateSize()
      }
    }, 300))

    timers.push(setTimeout(() => {
      if (mapInstanceRef.current) {
        console.log('[CONTRACTOR-MAP] Third invalidation - 600ms')
        mapInstanceRef.current.invalidateSize()
      }
    }, 600))

    timers.push(setTimeout(() => {
      if (mapInstanceRef.current) {
        console.log('[CONTRACTOR-MAP] Fourth invalidation - 1000ms')
        mapInstanceRef.current.invalidateSize()
      }
    }, 1000))

    return () => timers.forEach(timer => clearTimeout(timer))
  }, [])

  // Watch for container size changes and invalidate map size
  useEffect(() => {
    if (!mapRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        console.log('[CONTRACTOR-MAP] Container resized, invalidating map size')
        mapInstanceRef.current.invalidateSize()
      }
    })

    resizeObserver.observe(mapRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      updateMarkers()
    }
  }, [contractors, selectedContractor, isLoading])

  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      mapInstanceRef.current.setView(center, 10)
    }
  }, [center, isLoading])

  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      // Update map picker functionality
      if (showMapPicker) {
        mapInstanceRef.current.getContainer().style.cursor = 'crosshair'
      } else {
        mapInstanceRef.current.getContainer().style.cursor = ''
      }
    }
  }, [showMapPicker, isLoading])

  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      const L = window.L
      console.log('[CONTRACTOR-MAP] Updating marker/radius, radiusKm:', radiusKm, 'showRadius:', showRadius, 'location:', mapPickerLocation)

      // Remove existing map picker marker
      if (mapPickerMarkerRef.current) {
        mapInstanceRef.current.removeLayer(mapPickerMarkerRef.current)
        mapPickerMarkerRef.current = null
      }

      // Remove existing radius circle
      if (radiusCircleRef.current) {
        mapInstanceRef.current.removeLayer(radiusCircleRef.current)
        radiusCircleRef.current = null
      }

      // Add new map picker marker and radius circle
      if (mapPickerLocation) {
        const icon = L.divIcon({
          html: `<div style="background: #ef4444; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                   <div style="color: white; font-size: 10px;">📍</div>
                 </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })

        mapPickerMarkerRef.current = L.marker([mapPickerLocation.lat, mapPickerLocation.lon], { icon })
          .addTo(mapInstanceRef.current)

        // Add radius circle if showRadius is true
        if (showRadius) {
          radiusCircleRef.current = L.circle([mapPickerLocation.lat, mapPickerLocation.lon], {
            radius: radiusKm * 1000, // Convert km to meters
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2
          }).addTo(mapInstanceRef.current)
        }
      }
    }
  }, [mapPickerLocation, isLoading, showRadius, radiusKm])

  const updateMarkers = () => {
    if (!mapInstanceRef.current || isLoading) return

    const L = window.L

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = []

    // Add contractor markers
    contractors.forEach((contractor) => {
      if (!contractor.latitude || !contractor.longitude) return

      const isSelected = selectedContractor?.id === contractor.id

      // Create custom marker icon - bigger and highlighted when selected
      const markerHtml = `
        <div style="
          position: relative;
          transform: ${isSelected ? 'scale(1.5)' : 'scale(1)'};
          transition: transform 0.2s ease;
        ">
          <div style="
            background: ${isSelected ? '#f97316' : '#3b82f6'};
            border: 3px solid white;
            border-radius: 50%;
            width: ${isSelected ? '32px' : '24px'};
            height: ${isSelected ? '32px' : '24px'};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <div style="
              color: white;
              font-size: ${isSelected ? '18px' : '14px'};
              font-weight: bold;
            ">📍</div>
          </div>
          ${isSelected ? `
            <div style="
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid #f97316;
            "></div>
          ` : ''}
        </div>
      `

      const icon = L.divIcon({
        html: markerHtml,
        iconSize: isSelected ? [48, 48] : [24, 24],
        iconAnchor: isSelected ? [24, 24] : [12, 12],
        className: 'custom-marker-icon'
      })

      const marker = L.marker([contractor.latitude, contractor.longitude], { icon })
        .addTo(mapInstanceRef.current)
        .on('click', () => {
          onContractorSelect(contractor)
        })

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="font-weight: 600; font-size: 14px;">${contractor.display_name}</div>
          </div>

          ${contractor.type === 'professional' && contractor.title ?
            `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${contractor.title}</div>` :
            ''
          }

          ${contractor.type === 'company' && contractor.industry ?
            `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${contractor.industry}</div>` :
            ''
          }

          <div style="display: flex; align-items: center; gap: 4px; color: #6b7280; font-size: 12px; margin-bottom: 8px;">
            <span>📍</span>
            <span>${contractor.location}</span>
          </div>

          <div style="display: flex; flex-wrap: gap: 4px; margin-bottom: 8px;">
            <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
              ${contractor.type === 'professional' ? 'Individual' : 'Company'}
            </span>

            ${contractor.type === 'professional' && contractor.is_self_employed ?
              '<span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Self-Employed</span>' :
              ''
            }

            ${contractor.type === 'company' && contractor.service_24_7 ?
              '<span style="background: #dbeafe; padding: 2px 6px; border-radius: 4px; font-size: 10px;">24/7</span>' :
              ''
            }

            ${contractor.spoken_languages && contractor.spoken_languages.length > 0 ?
              `<span style="background: #f0f9ff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${contractor.spoken_languages.length} Languages</span>` :
              ''
            }
          </div>

          ${contractor.description ?
            `<div style="color: #374151; font-size: 12px; margin-bottom: 8px; max-height: 60px; overflow: hidden;">${contractor.description.substring(0, 150)}${contractor.description.length > 150 ? '...' : ''}</div>` :
            ''
          }
        </div>
      `

      marker.bindPopup(popupContent)

      markersRef.current.push(marker)

      // Open popup if this contractor is selected
      if (isSelected) {
        marker.openPopup()
      }
    })
  }

  return (
    <div className="relative h-full">
      {/* Map container - always rendered so ref is available */}
      <div ref={mapRef} className="h-full w-full rounded-lg" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-[998]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Picker Controls */}
      {showMapPicker && !hidePickerControls && (
        <div className="absolute top-4 left-4 z-[1000]">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Pick Location</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelMapPicker}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Click on the map to select a location
                </p>

                {mapPickerLocation && (
                  <div className="space-y-2">
                    <p className="text-xs">
                      Selected: {mapPickerLocation.lat.toFixed(4)}, {mapPickerLocation.lon.toFixed(4)}
                    </p>
                    <Button
                      size="sm"
                      onClick={onConfirmLocation}
                      className="w-full"
                    >
                      Use This Location
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}