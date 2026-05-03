"use client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug = (...args: any[]) => { if (process.env.NODE_ENV === "development") console.log(...args) }

import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react"
import { useDeferredMount } from "@/hooks/use-deferred-mount"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import { useLanguageRegion } from "@/contexts/language-region-context"
import { getDefaultMapCenter } from "@/lib/i18n/language-region"
import { createClient } from "@/lib/client"
import { isLocationGranted } from "@/hooks/use-location-permission"

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false })
const ZoomControl = dynamic(() => import("react-leaflet").then((mod) => mod.ZoomControl), { ssr: false })

// Helper function to create custom marker icon with scaling for selection
function createCustomIcon(isSelected: boolean, urgent = false) {
  if (typeof window === 'undefined') return undefined

  const L = (window as any).L
  if (!L) return undefined

  if (urgent) {
    // Red SVG pin for urgent (asap/today) jobs with optional pulsing ring when selected
    const size = isSelected ? 36 : 28
    const html = `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${isSelected ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(239,68,68,0.25);animation:pulse 1.4s infinite;"></div>` : ''}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="#ef4444" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `
    return L.divIcon({
      html,
      className: '',
      iconSize: [size, size] as [number, number],
      iconAnchor: [size / 2, size] as [number, number],
      popupAnchor: [0, -size] as [number, number],
    })
  }

  // Standard Leaflet blue marker for normal jobs
  const scale = isSelected ? 1.5 : 1
  const iconSize: [number, number] = [25 * scale, 41 * scale]
  const iconAnchor: [number, number] = [12 * scale, 41 * scale]
  const popupAnchor: [number, number] = [1 * scale, -34 * scale]

  return L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: iconSize,
    iconAnchor: iconAnchor,
    popupAnchor: popupAnchor,
    shadowSize: [41 * scale, 41 * scale]
  })
}

const MapSizeHandler = dynamic(
  () =>
    Promise.all([
      import("react-leaflet"),
      import("react")
    ]).then(([leafletMod, reactMod]) => {
      const { useMap } = leafletMod
      const { useEffect } = reactMod

      function MapSizeHandlerComponent() {
        const map = useMap()

        // Invalidate size once the map is fully initialized (more reliable than a fixed timeout)
        useEffect(() => {
          if (!map) return
          map.whenReady(() => {
            debug("[JobMap] Invalidating map size on ready")
            map.invalidateSize({ pan: false })
          })
        }, [map])

        // Watch for container size changes
        useEffect(() => {
          if (!map) return

          const container = map.getContainer()
          const resizeObserver = new ResizeObserver(() => {
            debug("[JobMap] Container resized, invalidating map size")
            map.invalidateSize()
          })

          resizeObserver.observe(container)

          return () => {
            resizeObserver.disconnect()
          }
        }, [map])

        return null
      }

      return MapSizeHandlerComponent
    }),
  { ssr: false },
)

const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod

      function MapClickHandlerComponent({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
        useMapEvents({
          click: (e: any) => {
            onMapClick(e.latlng.lat, e.latlng.lng)
          },
        })
        return null
      }

      return MapClickHandlerComponent
    }),
  { ssr: false },
)

interface ViewportBounds {
  north: number
  south: number
  east: number
  west: number
}

// Listens to moveend + zoomend, debounces 300ms, emits viewport bounds.
// Defined outside JobMap so the dynamic import runs once, not on every render.
const ViewportHandler = dynamic(
  () =>
    Promise.all([import("react-leaflet"), import("react")]).then(([leafletMod, reactMod]) => {
      const { useMapEvents } = leafletMod
      const { useEffect, useRef } = reactMod

      function boundsChangedSignificantly(prev: ViewportBounds, next: ViewportBounds): boolean {
        const latDiff = Math.abs(prev.north - next.north) + Math.abs(prev.south - next.south)
        const lngDiff = Math.abs(prev.east  - next.east)  + Math.abs(prev.west  - next.west)
        return latDiff + lngDiff > 0.02
      }

      function ViewportHandlerComponent({
        onViewportChange,
      }: {
        onViewportChange: (bounds: ViewportBounds) => void
      }) {
        const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
        const prevBoundsRef = useRef<ViewportBounds | null>(null)

        const emit = (map: any) => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            const b = map.getBounds()
            const bounds: ViewportBounds = {
              north: b.getNorth(),
              south: b.getSouth(),
              east:  b.getEast(),
              west:  b.getWest(),
            }
            if (!prevBoundsRef.current || boundsChangedSignificantly(prevBoundsRef.current, bounds)) {
              prevBoundsRef.current = bounds
              onViewportChange(bounds)
            }
          }, 300)
        }

        const map = useMapEvents({
          moveend: () => emit(map),
          zoomend: () => emit(map),
        })

        // Fire once immediately after map is ready (initial load)
        useEffect(() => {
          map.whenReady(() => emit(map))
          return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
          }
        }, []) // eslint-disable-line react-hooks/exhaustive-deps

        return null
      }

      return ViewportHandlerComponent
    }),
  { ssr: false },
)

// Blue "you are here" dot + re-center logic — rendered inside MapContainer
const UserLocationDot = dynamic(
  () =>
    Promise.all([import("react-leaflet"), import("react")]).then(([leafletMod, reactMod]) => {
      const { CircleMarker, Popup, useMap } = leafletMod
      const { useEffect } = reactMod

      function UserLocationDotComponent({
        location,
        recenterTrigger,
      }: {
        location: [number, number]
        recenterTrigger: number
      }) {
        const map = useMap()

        useEffect(() => {
          if (recenterTrigger === 0) return
          map.setView(location, Math.max(map.getZoom(), 14), { animate: true })
        }, [recenterTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

        return (
          <>
            {/* Outer translucent halo */}
            <CircleMarker
              center={location}
              radius={11}
              pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.15, weight: 1, opacity: 0.35 }}
              {...({} as any)}
            />
            {/* Inner solid dot */}
            <CircleMarker
              center={location}
              radius={6}
              pathOptions={{ color: "#fff", fillColor: "#2563eb", fillOpacity: 1, weight: 2.5 }}
              {...({} as any)}
            >
              <Popup {...({} as any)}>Your location</Popup>
            </CircleMarker>
          </>
        )
      }

      return UserLocationDotComponent
    }),
  { ssr: false },
)

// Fly to a new center whenever the `center` prop changes (MapContainer ignores prop updates after mount)
const MapViewUpdater = dynamic(
  () =>
    Promise.all([import("react-leaflet"), import("react")]).then(([leafletMod, reactMod]) => {
      const { useMap } = leafletMod
      const { useEffect, useRef } = reactMod

      function MapViewUpdaterComponent({ center }: { center: [number, number] }) {
        const map = useMap()
        const prevCenter = useRef<[number, number]>(center)

        useEffect(() => {
          const [prevLat, prevLon] = prevCenter.current
          const [lat, lon] = center
          if (Math.abs(lat - prevLat) > 0.0001 || Math.abs(lon - prevLon) > 0.0001) {
            prevCenter.current = center
            map.flyTo(center, map.getZoom(), { animate: true, duration: 0.6 })
          }
        }, [map, center])

        return null
      }

      return MapViewUpdaterComponent
    }),
  { ssr: false },
)

// Component to center map on selected job
const JobCenterer = dynamic(
  () =>
    Promise.all([
      import("react-leaflet"),
      import("react")
    ]).then(([leafletMod, reactMod]) => {
      const { useMap } = leafletMod
      const { useEffect } = reactMod

      function JobCentererComponent({ selectedJob }: { selectedJob: any }) {
        const map = useMap()

        useEffect(() => {
          if (map && selectedJob && selectedJob.latitude && selectedJob.longitude) {
            const jobLocation: [number, number] = [selectedJob.latitude, selectedJob.longitude]

            // Check if job location is visible in current map bounds
            const bounds = map.getBounds()
            const isVisible = bounds.contains(jobLocation)

            // Only pan if job is not visible, keep current zoom
            if (!isVisible) {
              debug("[JobMap] Panning to job location:", jobLocation)
              map.panTo(jobLocation, { animate: true, duration: 0.5 })
            } else {
              debug("[JobMap] Job already visible, no pan needed")
            }
          }
        }, [map, selectedJob])

        return null
      }

      return JobCentererComponent
    }),
  { ssr: false },
)

interface Job {
  id: string
  title: string
  description: string
  job_type: string
  experience_level: string
  work_location: string
  location: string
  latitude?: number
  longitude?: number
  salary_min?: number
  salary_max?: number
  skills_required: string[]
  applications_count: number
  created_at: string
  urgency_type?: "asap" | "today" | "flexible" | null
  company_profiles?: {
    company_name: string
    location: string
    industry: string
  }
}

interface JobMapProps {
  jobs?: Job[]
  /** When true, ignores the jobs prop after first render and re-fetches on every
   *  map moveend/zoomend via get_jobs_in_viewport RPC (debounced 300ms). */
  enableViewportSearch?: boolean
  center?: [number, number]
  zoom?: number
  height?: string
  showRadius?: boolean
  radiusCenter?: [number, number]
  radiusKm?: number
  selectedLocation?: [number, number]
  onProfileSelect?: (profile: any) => void
  onMapClick?: (lat: number, lon: number) => void
  selectedJobId?: string | null
  onJobSelect?: (job: Job) => void
}

export function JobMap({
  jobs = [],
  enableViewportSearch = false,
  center,
  zoom = 6,
  height = "500px",
  showRadius = false,
  radiusCenter,
  radiusKm = 40.234, // Default 25 miles in km
  selectedLocation,
  onProfileSelect,
  onMapClick,
  selectedJobId = null,
  onJobSelect,
}: JobMapProps) {
  const mounted = useDeferredMount(150)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [recenterTrigger, setRecenterTrigger] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined" || !navigator?.geolocation || !isLocationGranted()) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  // Viewport search state — populated after first moveend/zoomend when enabled
  const [viewportJobs, setViewportJobs] = useState<Job[]>([])
  const [viewportFetched, setViewportFetched] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const requestIdRef = useRef(0)

  const handleViewportChange = useCallback(async (bounds: ViewportBounds) => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    try {
      const { data, error } = await supabase.rpc('get_jobs_in_viewport', bounds)
      if (requestId !== requestIdRef.current) return // superseded by a newer request
      if (error) {
        debug('[JOB-MAP] Viewport RPC error:', error.message)
        return
      }
      setViewportJobs((data as Job[]) ?? [])
      setViewportFetched(true)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      debug('[JOB-MAP] Viewport fetch failed:', err)
    }
  }, [supabase])

  // Get language/region context for default map center
  const { state: languageRegionState } = useLanguageRegion()
  const defaultCenter = getDefaultMapCenter(languageRegionState.country)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load Leaflet CSS programmatically so it's confirmed ready before the map renders.
    // Inserting the <link> inline in JSX causes a flash: the map container mounts first,
    // then the browser fetches + applies the stylesheet — resulting in a brief unstyled state.
    const loadCSS = (): Promise<void> => {
      if ((window as any).__leafletCssLoaded) return Promise.resolve()
      return new Promise((resolve) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        link.onload = () => { ;(window as any).__leafletCssLoaded = true; resolve() }
        link.onerror = () => resolve() // fail gracefully — map will still render
        document.head.appendChild(link)
      })
    }

    const loadJS = (): Promise<void> => {
      if ((window as any).L) return Promise.resolve()

      if ((window as any).__leafletLoading) {
        // Another instance is mid-load — poll until done
        return new Promise((resolve) => {
          const poll = setInterval(() => {
            if ((window as any).L) { clearInterval(poll); resolve() }
          }, 50)
        })
      }

      // First instance — guard against concurrent loads
      ;(window as any).__leafletLoading = true
      debug('[JOB-MAP] Leaflet not loaded, loading now...')

      return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
        script.crossOrigin = ''
        script.onload = () => {
          ;(window as any).__leafletLoading = false
          debug('[JOB-MAP] Leaflet script loaded successfully')
          resolve()
        }
        script.onerror = () => {
          ;(window as any).__leafletLoading = false
          console.error('[JOB-MAP] Failed to load Leaflet script')
          resolve() // resolve anyway so Promise.all doesn't hang
        }
        document.head.appendChild(script)
      })
    }

    // Both CSS and JS must be ready before we render the map container
    Promise.all([loadCSS(), loadJS()]).then(() => setLeafletLoaded(true))
  }, [])

  const validCenter: [number, number] =
    center && center[0] && center[1] && !isNaN(center[0]) && !isNaN(center[1]) ? center : defaultCenter

  // After the first viewport fetch completes, use live results; otherwise fall back to
  // the prop (server-rendered initial data or empty array).
  const displayJobs = enableViewportSearch && viewportFetched ? viewportJobs : jobs

  const jobsWithCoordinates = useMemo(
    () => displayJobs.filter((job) => job.latitude && job.longitude && !isNaN(job.latitude) && !isNaN(job.longitude)),
    [displayJobs],
  )

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not specified"
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()}`
    if (min) return `${min.toLocaleString()}+`
    return `Up to ${max?.toLocaleString()}`
  }

  return (
    <div className="w-full h-full relative">
      {/* Plain dark placeholder shown only until Leaflet JS is ready.
          Tiles then appear progressively — no overlay blocking them. */}
      {!(mounted && leafletLoaded) && (
        <div className="absolute inset-0 rounded-lg bg-slate-800" />
      )}
      {(mounted && leafletLoaded) && <MapContainer center={validCenter} zoom={zoom} style={{ height: "100%", width: "100%", background: "#1e293b" }} className="rounded-lg" zoomControl={false} {...({} as any)}>
        <ZoomControl position="bottomleft" {...({} as any)} />
        <MapSizeHandler />
        <MapViewUpdater center={validCenter} />
        <JobCenterer selectedJob={selectedJobId ? displayJobs.find(j => j.id === selectedJobId) : null} />
        {enableViewportSearch && (
          <ViewportHandler onViewportChange={handleViewportChange} />
        )}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          {...({} as any)}
        />
        {showRadius && radiusCenter && (
          <Circle
            center={radiusCenter}
            radius={radiusKm * 1000} // Convert km to meters
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 2,
              dashArray: "5, 5",
            }}
            {...({} as any)}
          />
        )}
        {jobsWithCoordinates.map((job) => {
          const isSelected = selectedJobId === job.id
          const isUrgent = job.urgency_type === "asap" || job.urgency_type === "today"
          const customIcon = createCustomIcon(isSelected, isUrgent)

          // Skip rendering if icon is not ready yet
          if (!customIcon) return null

          return (
            <Marker
              key={job.id}
              position={[job.latitude!, job.longitude!]}
              icon={customIcon}
              eventHandlers={{
                click: (e: any) => {
                  // Prevent default popup opening
                  e.target.closePopup()
                  if (onJobSelect) {
                    // Toggle selection: if already selected, deselect; otherwise select
                    onJobSelect(isSelected ? null as any : job)
                  }
                },
              }}
              {...({} as any)}
            >
              {/* Empty popup to satisfy react-leaflet, but won't open due to closePopup */}
              <Popup autoClose={false} closeOnClick={false} closeButton={false} {...({} as any)}>
                <div></div>
              </Popup>
            </Marker>
          )
        })}

        {/* Selected location marker for map picker */}
        {selectedLocation && (() => {
          const locationIcon = createCustomIcon(true)
          if (!locationIcon) return null

          return (
            <Marker position={selectedLocation} icon={locationIcon} {...({} as any)}>
              <Popup {...({} as any)}>
                <div className="text-center">
                  <p className="font-medium">Selected Location</p>
                  <p className="text-sm text-gray-600">
                    {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })()}

        {/* Map click handler component */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* User location dot */}
        {userLocation && (
          <UserLocationDot location={userLocation} recenterTrigger={recenterTrigger} />
        )}
      </MapContainer>}

      {/* My location button — only shown when we have GPS */}
      {userLocation && (
        <button
          onClick={() => setRecenterTrigger((t) => t + 1)}
          title="Centre map on my location"
          className="absolute bottom-14 right-3 z-[1000] bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-md border border-slate-200 flex items-center gap-1 transition-colors"
        >
          <span style={{ fontSize: "12px" }}>📍</span> My location
        </button>
      )}
    </div>
  )
}

export default memo(JobMap)
