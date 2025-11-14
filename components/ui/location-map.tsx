"use client"

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet-images/marker-icon-2x.png',
  iconUrl: '/leaflet-images/marker-icon.png',
  shadowUrl: '/leaflet-images/marker-shadow.png',
})

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
  zoom?: number
  height?: string
}

export interface LocationMapRef {
  flyToLocation: (lat: number, lng: number, zoom?: number) => void
}

function LocationMarker({ onLocationSelect, initialLat, initialLng, position, setPosition }: {
  onLocationSelect: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
  position: L.LatLng | null
  setPosition: (pos: L.LatLng) => void
}) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })

  useEffect(() => {
    if (initialLat && initialLng && !position) {
      const pos = L.latLng(initialLat, initialLng)
      setPosition(pos)
      map.setView(pos, map.getZoom())
    }
  }, [initialLat, initialLng, map, position, setPosition])

  return position === null ? null : (
    <Marker position={position} />
  )
}

function MapController({
  mapRef,
  position,
  setPosition,
  onLocationSelect
}: {
  mapRef: React.RefObject<LocationMapRef>
  position: L.LatLng | null
  setPosition: (pos: L.LatLng) => void
  onLocationSelect: (lat: number, lng: number) => void
}) {
  const map = useMap()

  useImperativeHandle(mapRef, () => ({
    flyToLocation: (lat: number, lng: number, zoom: number = 14) => {
      const newPos = L.latLng(lat, lng)
      setPosition(newPos)
      onLocationSelect(lat, lng)
      map.flyTo([lat, lng], zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      })
    }
  }))

  return null
}

const LocationMapComponent = forwardRef<LocationMapRef, LocationMapProps>(({
  onLocationSelect,
  initialLat = 51.5074, // Default to London
  initialLng = -0.1278,
  zoom = 10,
  height = "100%" // Changed to 100% to fill the container
}, ref) => {
  const [isMounted, setIsMounted] = useState(false)
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLat && initialLng ? L.latLng(initialLat, initialLng) : null
  )
  const mapRef = useRef<LocationMapRef>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (ref && typeof ref !== 'function') {
      (ref as React.MutableRefObject<LocationMapRef | null>).current = mapRef.current
    }
  }, [ref])

  if (!isMounted) {
    return <div style={{ height, width: '100%' }} className="bg-muted rounded-md flex items-center justify-center">Loading map...</div>
  }

  return (
    <div style={{ height, width: '100%' }} className="rounded-md overflow-hidden border">
      <MapContainer
        center={[initialLat, initialLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          onLocationSelect={onLocationSelect}
          initialLat={initialLat}
          initialLng={initialLng}
          position={position}
          setPosition={setPosition}
        />
        <MapController
          mapRef={mapRef as any}
          position={position}
          setPosition={setPosition}
          onLocationSelect={onLocationSelect}
        />
      </MapContainer>
    </div>
  )
})

LocationMapComponent.displayName = 'LocationMap'

export default LocationMapComponent