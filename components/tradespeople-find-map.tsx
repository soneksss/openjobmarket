"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { TRADE_INDUSTRIES } from "@/lib/data/trade-industries"
import { helpItems } from "@/lib/data/help-items"
import { getIndustryStyle, getIndustryPinColor, getIndustryPinSvg, normaliseCategory } from "@/lib/data/industry-styles"
import { ArrowLeft, MapPin, Star, MessageSquare, User, SlidersHorizontal, X, Check, ChevronLeft, ChevronRight, Search, Building2, Languages, Briefcase, Users, Home, LocateFixed, Loader2 } from "lucide-react"
import { MapSearchBar } from "@/components/map-search-bar"
import { getPosition, describeGeoError } from "@/lib/native-geolocation"
import JobWizardModal from "@/components/job-wizard-modal"
import { useToast } from "@/hooks/use-toast"

// ── Leaflet dynamic imports ────────────────────────────────────────────────────
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false })
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false })
const ZoomControl  = dynamic(() => import("react-leaflet").then(m => m.ZoomControl),  { ssr: false })

// Invalidates map size after mount and on container resize
const MapSizeHandler = dynamic(
  () => import("react-leaflet").then(mod => {
    const { useMap } = mod
    function Comp() {
      const map = useMap()
      useEffect(() => {
        if (!map) return
        map.whenReady(() => map.invalidateSize({ pan: false }))
        const obs = new ResizeObserver(() => map.invalidateSize())
        obs.observe(map.getContainer())
        return () => obs.disconnect()
      }, [map])
      return null
    }
    return Comp
  }),
  { ssr: false }
)

const MapViewUpdater = dynamic(
  () => Promise.all([import("react-leaflet"), import("react")]).then(([lm, rm]) => {
    const { useMap } = lm
    const { useEffect, useRef } = rm
    function Comp({ center, forceSeq }: { center: [number, number]; forceSeq?: number }) {
      const map      = useMap()
      const prev     = useRef(center)
      const prevSeq  = useRef(forceSeq ?? 0)
      useEffect(() => {
        const [pLat, pLon] = prev.current
        const [lat, lon]   = center
        // "forced" = locate-me button was pressed (seq bumped), always fly even if coords unchanged
        const forced = forceSeq !== undefined && forceSeq !== prevSeq.current
        if (forced || Math.abs(lat - pLat) > 0.001 || Math.abs(lon - pLon) > 0.001) {
          prev.current    = center
          prevSeq.current = forceSeq ?? 0
          const TARGET_ZOOM = 13
          // On mobile the bottom sheet covers ~216px; shift the projected centre
          // south so the target appears above the panel (centred in visible area).
          const mapH    = map.getSize().y
          const panelPx = mapH < 800 ? 110 : 0
          const pt       = map.project(center as any, TARGET_ZOOM)
          const adjusted = map.unproject((pt as any).add([0, panelPx]) as any, TARGET_ZOOM)
          map.flyTo(adjusted as any, TARGET_ZOOM, { animate: true, duration: 1.0 })
        }
      }, [map, center, forceSeq])
      return null
    }
    return Comp
  }),
  { ssr: false }
)

// Smoothly flies the map to a target point covering ~radiusMiles radius
const MapFlyTo = dynamic(
  () => Promise.all([import("react-leaflet"), import("react")]).then(([lm, rm]) => {
    const { useMap } = lm
    const { useEffect, useRef } = rm
    function Comp({ target, radiusMiles = 10 }: { target: { lat: number; lng: number } | null; radiusMiles?: number }) {
      const map = useMap()
      const prev = useRef<{ lat: number; lng: number } | null>(null)
      useEffect(() => {
        if (!target) return
        if (prev.current?.lat === target.lat && prev.current?.lng === target.lng) return
        prev.current = target
        // flyToBounds gives a ~radiusMiles-mile radius view regardless of screen size
        const R = radiusMiles / 69 // ~69 miles per degree latitude
        const RL = R / Math.cos(target.lat * Math.PI / 180)
        // On mobile the bottom sheet covers ~110px; pad the bottom so the
        // pin isn't hidden behind it.
        const mapH    = map.getSize().y
        const panelPx = mapH < 800 ? 110 : 0
        ;(map as any).flyToBounds(
          [[target.lat - R, target.lng - RL], [target.lat + R, target.lng + RL]],
          { animate: true, duration: 1.5, paddingTopLeft: [20, 20], paddingBottomRight: [20, 20 + panelPx] }
        )
      }, [map, target, radiusMiles])
      return null
    }
    return Comp
  }),
  { ssr: false }
)

type BBox = { north: number; south: number; east: number; west: number }

// Desktop width, OR a phone rotated to landscape (short viewport) — both use
// the side-panel layout instead of the mobile bottom sheet.
const WIDE_LAYOUT_QUERY = "(min-width: 1024px), (orientation: landscape) and (max-height: 500px)"

// Fires onBoundsChange once on mount and again after every pan/zoom
const ViewportLoader = dynamic(
  () => Promise.all([import("react-leaflet"), import("react")]).then(([lm, rm]) => {
    const { useMap, useMapEvents } = lm
    const { useEffect }            = rm
    function Comp({ onBoundsChange }: { onBoundsChange: (b: BBox) => void }) {
      const map = useMap()
      const emit = () => {
        const b = map.getBounds()
        onBoundsChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() })
      }
      useEffect(() => { emit() }, []) // eslint-disable-line react-hooks/exhaustive-deps
      useMapEvents({ moveend: emit, zoomend: emit })
      return null
    }
    return Comp
  }),
  { ssr: false }
)

// ── Custom van pin ─────────────────────────────────────────────────────────────

// Cheap string hash → deterministic pseudo-random per trader ID.
// Keeps the same delay/direction on every re-render so icons don't flicker.
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0
  return h
}

function createTraderIcon(L: any, isSelected: boolean, industryTitle?: string | null, isBusy?: boolean, isSeeded?: boolean, traderId?: string) {
  const isGrey = isBusy || isSeeded
  const vanW   = isSelected ? 56 : 45        // 20% smaller than before
  const vanH   = Math.round(vanW * 0.5)      // 2:1 aspect ratio matches the PNG
  const iconSz = 12

  const mappedTitle = isSeeded ? normaliseCategory(industryTitle) : industryTitle
  const iconClr     = isGrey ? "#94a3b8" : "#ffffff"
  const svg         = getIndustryPinSvg(mappedTitle, iconClr, iconSz)

  const vanSrc      = isGrey ? "/Van1.png" : "/Van2.png"
  const badgeBg     = isGrey ? "rgba(15,23,42,0.82)" : "rgba(21,128,61,0.88)"
  const badgeBorder = isGrey ? "rgba(100,116,139,0.55)" : "rgba(134,239,172,0.5)"
  const glow        = isSelected
    ? `filter:drop-shadow(0 0 6px ${isGrey ? "#64748b" : "#22c55e"});`
    : ""

  // Per-van stagger: negative delay = jump into the animation mid-cycle,
  // so all vans are already spinning (no cold-start sync).
  // ~1 in 3 vans gets reverse direction (anti-clockwise, like Uber idle).
  // CSS transform animations run on the GPU compositor — zero JS/layout cost.
  const h         = hashStr(traderId ?? Math.random().toString())
  const DELAYS    = [0, -1.5, -3, -5, -2, -4, -6.5, -7, -8.5, -9]
  const delay     = DELAYS[h % DELAYS.length]
  const direction = h % 3 === 0 ? "reverse" : "normal"
  const anim      = `vanIdle 10s ease-in-out ${delay}s infinite ${direction}`

  const html = `<div style="position:relative;width:${vanW}px;height:${vanH}px;animation:${anim};transform-origin:center center;will-change:transform;${glow}">` +
    `<img src="${vanSrc}" style="width:${vanW}px;height:${vanH}px;object-fit:contain;display:block;" />` +
    `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${iconSz+4}px;height:${iconSz+4}px;background:${badgeBg};border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid ${badgeBorder};">${svg}</div>` +
    `</div>`

  return L.divIcon({
    className: "",
    html,
    iconSize:    [vanW, vanH],
    iconAnchor:  [vanW / 2, vanH / 2],
    popupAnchor: [0, -(vanH / 2 + 4)],
  })
}

// ── Static data ────────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [
  { label: "5 mi", value: "5" }, { label: "10 mi", value: "10" },
  { label: "25 mi", value: "25" }, { label: "50 mi", value: "50" },
]
// First 7 are shown by default; rest revealed by "More"
const LANGUAGE_OPTIONS = [
  // default visible (7)
  "English","Polish","Ukrainian","Romanian","Spanish","Portuguese","Arabic",
  // revealed on "More" (19)
  "French","German","Italian","Russian","Hindi","Urdu","Bengali",
  "Punjabi","Gujarati","Turkish","Tagalog","Somali","Mandarin","Chinese","Cantonese",
  "Czech","Slovak","Lithuanian","Latvian","Estonian","Bulgarian","Kurdish",
]
const LANG_DEFAULT_VISIBLE = 7

// ── Types ──────────────────────────────────────────────────────────────────────
type Trader = {
  id: string; name: string; industry: string | null; location: string | null
  latitude: number | null; longitude: number | null; logo_url: string | null
  rating: number | null; reviews_count: number | null; user_id: string | null
  profile_type: string; services: string[] | null
  open_for_business?: boolean; service_24_7?: boolean
  claim_token?: string | null
  phone_number?: string | null
  normalised_categories?: string[] | null
  spoken_languages?: string[] | null
}
type SheetState = "collapsed" | "peek" | "expanded"
type Filters = { industry: string | null; subcategories: string[]; radius: string; language: string; available: boolean; h24: boolean }
const DEFAULT_FILTERS: Filters = { industry: null, subcategories: [], radius: "10", language: "", available: false, h24: false }

// Initialise filters from URL search params — same on server and client, zero hydration risk.
function filtersFromSearchParams(sp: URLSearchParams, fallbackIndustry: string | undefined): Filters {
  const industry = sp.get("industry") ?? fallbackIndustry ?? null
  const subcats  = sp.get("subcats")
  return {
    industry,
    subcategories: subcats ? subcats.split(",").filter(Boolean) : [],
    radius:        sp.get("radius")    ?? "10",
    language:      sp.get("lang")      ?? "",
    available:     sp.get("available") === "true",
    h24:           sp.get("h24")       === "true",
  }
}

type Props = {
  initialTraders: Trader[]; initialCoords: [number, number]
  initialPostcode?: string; initialIndustry?: string
  coordsAreDefault?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TradespeopleFindMap({ initialTraders, initialCoords, initialPostcode, initialIndustry, coordsAreDefault }: Props) {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const supabase      = createClient()
  const { toast }     = useToast()

  const [traders,          setTraders]          = useState<Trader[]>(initialTraders)
  const [filters,          setFilters]          = useState<Filters>(() => filtersFromSearchParams(searchParams, initialIndustry))
  const [draftFilters,     setDraftFilters]     = useState<Filters>(() => filtersFromSearchParams(searchParams, initialIndustry))
  const [sheetState,       setSheetState]       = useState<SheetState>("peek")
  const [selectedTrader,   setSelectedTrader]   = useState<Trader | null>(null)
  const [profilePhotos,    setProfilePhotos]    = useState<{ id: string; photo_url: string }[]>([])
  const [loadingProfile,   setLoadingProfile]   = useState(false)
  const [lightboxIndex,    setLightboxIndex]    = useState<number | null>(null)
  const [showJobWizard,    setShowJobWizard]    = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [wizardIndustry,   setWizardIndustry]   = useState<string | undefined>(undefined)
  const [wizardService,    setWizardService]    = useState<string | undefined>(undefined)
  const [showFilters,      setShowFilters]      = useState(!!initialPostcode)
  const [showAllIndustries, setShowAllIndustries] = useState(false)
  const [showAllLanguages,  setShowAllLanguages]  = useState(false)
  const [showSubcatPicker, setShowSubcatPicker] = useState(false)
  const [pickerIndustry,   setPickerIndustry]   = useState<string | null>(null)
  const [pickerSubcats,    setPickerSubcats]     = useState<string[]>([])
  const [loading,          setLoading]          = useState(false)
  const [mounted,          setMounted]          = useState(false)
  const [leafletL,         setLeafletL]         = useState<any>(null)
  const [user,             setUser]             = useState<any>(null)
  const [homeownerProfile, setHomeownerProfile] = useState<any>(null)
  // The wizard needs to know who's actually posting — a tradesperson (company)
  // reaching this map has no homeowner_profiles row, so defaulting to
  // userType="homeowner" here made every submission fail with
  // "Missing homeowner_id or company_id".
  const [posterUserType,   setPosterUserType]   = useState<"homeowner" | "company">("homeowner")
  const [posterCompanyProfile, setPosterCompanyProfile] = useState<any>(null)
  const [isDesktop,        setIsDesktop]        = useState(false)
  const [postcodeInput,    setPostcodeInput]    = useState(initialPostcode ?? "")
  const [postcodeEditing,  setPostcodeEditing]  = useState(false)
  const [geocoding,        setGeocoding]        = useState(false)
  const [locating,         setLocating]         = useState(false)
  const [flyTarget,        setFlyTarget]        = useState<{ lat: number; lng: number } | null>(null)
  const [coords,           setCoords]           = useState<[number, number]>(initialCoords)
  const [locateSeq,        setLocateSeq]        = useState(0)
  const [locationLabel,    setLocationLabel]    = useState(initialPostcode ?? "")

  const currentBoundsRef = useRef<BBox | null>(null)
  const fetchTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersRef       = useRef(filtersFromSearchParams(searchParams, initialIndustry))
  const headerRef        = useRef<HTMLDivElement>(null)
  const sheetDragRef     = useRef<{ startY: number; startHeightPx: number } | null>(null)
  // null = follow the named sheetState (collapsed/peek/expanded) CSS value;
  // a number = freeform height the user dragged to — persists until they tap the handle again.
  const [sheetHeightPx,    setSheetHeightPx]     = useState<number | null>(null)
  const [isSheetDragging,  setIsSheetDragging]   = useState(false)
  const postcodeRef      = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-geolocate when the server fell back to the default location.
    // On Android the @capacitor/geolocation plugin handles the permission
    // dialog natively; on web it falls through to navigator.geolocation.
    if (!coordsAreDefault) return
    getPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 })
      .then(({ latitude, longitude }) => {
        setCoords([latitude, longitude])
        setFlyTarget({ lat: latitude, lng: longitude })
        setLocationLabel("My location")
      })
      .catch(() => { /* denied or unavailable — stay on default */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMounted(true)
    import("leaflet").then(mod => setLeafletL(mod.default ?? mod))
    // Wide-layout mode: real desktop, OR a phone rotated to landscape — a
    // bottom sheet looks bad on a short landscape screen, so use the
    // desktop-style side panel there too.
    const mq = window.matchMedia(WIDE_LAYOUT_QUERY)
    setIsDesktop(mq.matches)
    const onMqChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", onMqChange)
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (!user) return
      supabase.from("users").select("user_type").eq("id", user.id).maybeSingle()
        .then(({ data: userRow }) => {
          const type = userRow?.user_type === "company" ? "company" : "homeowner"
          setPosterUserType(type)
          const table = type === "company" ? "company_profiles" : "homeowner_profiles"
          supabase.from(table).select("*").eq("user_id", user.id)
            .maybeSingle().then(({ data }) => {
              if (type === "company") setPosterCompanyProfile(data)
              else setHomeownerProfile(data)
            })
        })
    })
    // Push zoom controls below the floating header
    const style = document.createElement("style")
    style.id = "find-map-zoom-offset"
    const isLg = window.matchMedia(WIDE_LAYOUT_QUERY).matches
    style.textContent = `#find-map-container .leaflet-top { margin-top: calc(var(--global-header-h, 0px) + ${isLg ? "116px" : "86px"}); }`
    if (!document.getElementById("find-map-zoom-offset")) document.head.appendChild(style)
    // Van idle-sway animation
    if (!document.getElementById("van-pin-anim")) {
      const vanAnim = document.createElement("style")
      vanAnim.id = "van-pin-anim"
      vanAnim.textContent = [
        "@keyframes vanIdle {",
        "  0%   { transform: rotate(0deg); }",
        "  8%   { transform: rotate(90deg); }",
        "  28%  { transform: rotate(90deg); }",
        "  36%  { transform: rotate(180deg); }",
        "  56%  { transform: rotate(180deg); }",
        "  64%  { transform: rotate(240deg); }",
        "  84%  { transform: rotate(240deg); }",
        "  100% { transform: rotate(360deg); }",
        "}",
      ].join("")
      document.head.appendChild(vanAnim)
    }
    return () => {
      document.getElementById("find-map-zoom-offset")?.remove()
      document.getElementById("van-pin-anim")?.remove()
      mq.removeEventListener("change", onMqChange)
    }
  }, [])

  // Keep the zoom-control offset in sync when rotating the phone, not just on mount.
  useEffect(() => {
    const style = document.getElementById("find-map-zoom-offset")
    if (style) style.textContent = `#find-map-container .leaflet-top { margin-top: calc(var(--global-header-h, 0px) + ${isDesktop ? "116px" : "86px"}); }`
  }, [isDesktop])

  // Fetch portfolio photos when a trader pin is clicked
  useEffect(() => {
    if (!selectedTrader) { setProfilePhotos([]); return }
    setLoadingProfile(true)
    supabase
      .from("trades_portfolio_photos")
      .select("id, photo_url")
      .eq("tradesperson_id", selectedTrader.id)
      .order("display_order", { ascending: true })
      .limit(6)
      .then(({ data }) => { setProfilePhotos(data ?? []); setLoadingProfile(false) })
  }, [selectedTrader?.id])

  // Keep filtersRef in sync so the debounced viewport callback always has current filters
  useEffect(() => { filtersRef.current = filters }, [filters])

  const fetchByViewport = useCallback(async (bounds: BBox, f: Filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        north: bounds.north.toFixed(6), south: bounds.south.toFixed(6),
        east:  bounds.east.toFixed(6),  west:  bounds.west.toFixed(6),
      })
      // Replace " & " with "_AND_" to avoid %26 in the URL — Turbopack's dev
      // server misroutes requests containing percent-encoded ampersands (returns 404).
      if (f.industry) params.set("industry", f.industry.replace(/ & /g, "_AND_"))
      if (f.language) params.set("language", f.language)
      const res = await fetch(`/api/traders?${params}`)
      if (!res.ok) return
      let results: Trader[] = await res.json()
      if (f.available) results = results.filter(t => t.open_for_business === true && t.profile_type !== "seeded")
      if (f.h24)       results = results.filter(t => t.service_24_7 === true)
      if (f.subcategories.length > 0) {
        const subs = new Set(f.subcategories.map(s => s.toLowerCase()))
        results = results.filter(t => {
          if (t.profile_type === "seeded") return true
          if (!t.services || t.services.length === 0) return true
          return t.services.some(s => subs.has(s.toLowerCase()))
        })
      }
      setTraders(results)
    } catch {
      // silent — map stays with last good data
    } finally { setLoading(false) }
  }, [])

  const onBoundsChange = useCallback((bounds: BBox) => {
    currentBoundsRef.current = bounds
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    fetchTimerRef.current = setTimeout(() => {
      fetchByViewport(bounds, filtersRef.current)
    }, 600)
  }, [fetchByViewport])

  const pushFilterParams = (f: Filters) => {
    const params = new URLSearchParams(searchParams.toString())
    if (f.industry) params.set("industry", f.industry); else params.delete("industry")
    if (f.subcategories.length > 0) params.set("subcats", f.subcategories.join(",")); else params.delete("subcats")
    if (f.radius !== "10") params.set("radius", f.radius); else params.delete("radius")
    if (f.language) params.set("lang", f.language); else params.delete("lang")
    if (f.available) params.set("available", "true"); else params.delete("available")
    if (f.h24) params.set("h24", "true"); else params.delete("h24")
    router.replace(`/find-trades?${params.toString()}`, { scroll: false })
  }

  const applyFilters = async () => {
    let didGeocode = false
    const q = postcodeInput.trim()
    const currentLoc = (locationLabel || initialPostcode || "").toUpperCase()
    if (q && q.toUpperCase() !== currentLoc) {
      setGeocoding(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=gb`,
          { headers: { "User-Agent": "OpenJobMarket/1.0" } }
        )
        const data = await res.json()
        if (data?.[0]) {
          const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon)
          setCoords([lat, lon])
          setFlyTarget({ lat, lng: lon })
          setLocationLabel(q.toUpperCase())
          didGeocode = true
        }
      } catch { }
      finally { setGeocoding(false) }
    }
    setFilters(draftFilters); setShowFilters(false); setShowAllIndustries(false)
    pushFilterParams(draftFilters)
    // Skip manual fetch when geocoding — flyToBounds triggers onBoundsChange which fetches
    if (!didGeocode && currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, draftFilters)
  }
  const clearFilters = () => {
    const r = { ...DEFAULT_FILTERS }
    setDraftFilters(r); setFilters(r); setShowFilters(false); setShowAllIndustries(false); setShowAllLanguages(false)
    pushFilterParams(r)
    if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, r)
  }
  // Derived from filters state which mirrors URL params — deterministic, SSR-safe
  const hasActiveFilters = filters.industry !== null || filters.subcategories.length > 0 || filters.radius !== "10" || filters.language !== "" || filters.available || filters.h24

  const handleGeocode = async () => {
    const q = postcodeInput.trim()
    if (!q) return
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=gb`,
        { headers: { "User-Agent": "OpenJobMarket/1.0" } }
      )
      const data = await res.json()
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon)
        setCoords([lat, lon])
        setFlyTarget({ lat, lng: lon })
        setLocationLabel(q.toUpperCase())
        setPostcodeEditing(false)
      }
    } catch { /* silently ignore geocode failures */ }
    finally { setGeocoding(false) }
  }

  const handleMyLocation = () => {
    setLocating(true)
    getPosition({ enableHighAccuracy: false, timeout: 8000 })
      .then(({ latitude, longitude }) => {
        setCoords([latitude, longitude])
        setFlyTarget({ lat: latitude, lng: longitude })
        setLocateSeq(n => n + 1)
        setLocationLabel("My location")
      })
      .catch(err => {
        toast({ title: "Couldn't find your location", description: describeGeoError(err), variant: "destructive" })
      })
      .finally(() => setLocating(false))
  }

  // Pixel height of a given sheet stop. "expanded" is measured against the
  // real rendered header (via headerRef) rather than replicating its
  // safe-area-inset calc() formula in JS.
  const getSheetStopPx = useCallback((state: SheetState): number => {
    if (state === "collapsed") return 160
    if (state === "peek") return window.innerHeight * 0.38
    const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0
    return window.innerHeight - headerBottom - 56
  }, [])

  // Pointer Events (not Touch Events) so this also works with a mouse/trackpad
  // when testing in a desktop browser, not just on a real touchscreen.
  const handleSheetPointerDown = (e: React.PointerEvent) => {
    const startHeightPx = sheetHeightPx ?? getSheetStopPx(sheetState)
    sheetDragRef.current = { startY: e.clientY, startHeightPx }
    setIsSheetDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handleSheetPointerMove = (e: React.PointerEvent) => {
    if (!sheetDragRef.current) return
    const deltaY = sheetDragRef.current.startY - e.clientY
    const min = getSheetStopPx("collapsed")
    const max = getSheetStopPx("expanded")
    setSheetHeightPx(Math.min(max, Math.max(min, sheetDragRef.current.startHeightPx + deltaY)))
  }
  // Freeform — no snapping. The sheet just stays wherever the pointer let go.
  const handleSheetPointerUp = () => {
    sheetDragRef.current = null
    setIsSheetDragging(false)
  }

  const distanceMi = (lat: number, lon: number) => {
    const originLat = coords[0]
    const originLng = coords[1]
    const R = 3959, dLat = (lat - originLat) * Math.PI/180, dLon = (lon - originLng) * Math.PI/180
    const a = Math.sin(dLat/2)**2 + Math.cos(originLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)
  }

  const tradersWithCoords = traders.filter(t => t.latitude && t.longitude)
  const findPageUrl = `/find-trades${initialPostcode ? `?postcode=${encodeURIComponent(initialPostcode)}` : ""}`

  // Mobile bottom sheet dimensions (bottom: 56px = bottom nav height h-14)
  // The global site header is now visible above the map on both sizes (via
  // --global-header-h), so both branches just add this map's own local
  // header-row content height on top of it — no more separate safe-area math.
  // Desktop local content ≈ 96px, mobile local content (tab row + search row) ≈ 66px.
  const HEADER = isDesktop ? "calc(var(--global-header-h, 0px) + 96px)" : "calc(var(--global-header-h, 0px) + 66px)"
  const mobileSheetStyle: React.CSSProperties =
    sheetHeightPx !== null    ? { bottom: "56px", left: 0, right: 0, height: `${sheetHeightPx}px` } :
    sheetState === "expanded" ? { top: HEADER, bottom: "56px", left: 0, right: 0 } :
    sheetState === "peek"     ? { bottom: "56px", left: 0, right: 0, height: "38vh" } :
                                { bottom: "56px", left: 0, right: 0, height: "160px" }

  /* ── Shared panel content ────────────────────────────────────────────────── */
  const profilePanel = selectedTrader && (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Back button — desktop only, clearly visible above the profile */}
      {isDesktop && (
        <button
          onClick={() => setSelectedTrader(null)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-orange-400 hover:text-orange-300 hover:bg-slate-800/60 transition-colors border-b border-slate-800/60"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          All tradespeople
        </button>
      )}
      {/* Photo strip — hidden for seeded trades */}
      {selectedTrader.profile_type !== 'seeded' && <div className="flex gap-2 overflow-x-auto px-3 pb-3 pt-1" style={{ scrollbarWidth: "none" }}>
        {loadingProfile ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-36 h-24 rounded-xl bg-slate-800 animate-pulse" />
          ))
        ) : profilePhotos.length > 0 ? (
          profilePhotos.map((photo, i) => (
            <button key={photo.id} onClick={() => setLightboxIndex(i)}
              className="flex-shrink-0 w-36 h-24 rounded-xl overflow-hidden bg-slate-800 focus:outline-none">
              <img src={photo.photo_url} alt={`Work photo ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
            </button>
          ))
        ) : (
          <div className="flex-shrink-0 w-full h-20 rounded-xl bg-slate-800 flex items-center justify-center gap-3">
            {selectedTrader.logo_url
              ? <img src={selectedTrader.logo_url} alt={selectedTrader.name} className="w-12 h-12 rounded-full object-cover" />
              : (() => { const s = getIndustryStyle(selectedTrader.industry ?? ""); const I = s.icon; return <span className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center`}><I className={`w-6 h-6 ${s.iconColor}`} /></span> })()}
            <span className="text-slate-400 text-xs">No portfolio photos yet</span>
          </div>
        )}
      </div>}
      {/* Profile info */}
      <div className="px-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 border-slate-600">
            {selectedTrader.logo_url
              ? <img src={selectedTrader.logo_url} alt={selectedTrader.name} className="w-full h-full object-cover" />
              : selectedTrader.profile_type === 'seeded'
              ? <span className="w-full h-full bg-amber-500/15 flex items-center justify-center"><Building2 className="w-5 h-5 text-amber-400" /></span>
              : (() => { const s = getIndustryStyle(selectedTrader.industry ?? ""); const I = s.icon; return <span className={`w-full h-full ${s.iconBg} flex items-center justify-center`}><I className={`w-5 h-5 ${s.iconColor}`} /></span> })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{selectedTrader.name}</p>
            {selectedTrader.profile_type === 'seeded' && selectedTrader.normalised_categories && selectedTrader.normalised_categories.length > 1 ? (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {selectedTrader.normalised_categories.map(c => (
                  <span key={c} className="px-1.5 py-px bg-amber-500/10 border border-amber-500/25 rounded text-[10px] text-amber-300">{c}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">{selectedTrader.industry ?? "Tradesperson"}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {selectedTrader.profile_type === 'seeded' && (
                <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-xs text-amber-300 font-semibold">Local business</span>
              )}
              {(selectedTrader.rating ?? 0) > 0 ? (
                <span className="flex items-center gap-0.5 text-xs text-amber-400 font-semibold">
                  <Star className="w-3 h-3 fill-amber-400" />{(selectedTrader.rating ?? 0).toFixed(1)}
                  {selectedTrader.reviews_count ? <span className="text-slate-500 font-normal ml-0.5">({selectedTrader.reviews_count})</span> : null}
                </span>
              ) : null}
              {selectedTrader.latitude && selectedTrader.longitude &&
                <span className="text-xs text-slate-500">{distanceMi(selectedTrader.latitude, selectedTrader.longitude)} mi away</span>}
              {selectedTrader.profile_type !== 'seeded' && selectedTrader.open_for_business === true
                ? <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-400 font-semibold">Available</span>
                : selectedTrader.profile_type !== 'seeded' && selectedTrader.open_for_business === false
                ? <span className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded-full text-xs text-slate-400 font-semibold">Busy</span>
                : null}
              {selectedTrader.service_24_7 && <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-400 font-semibold">24/7</span>}
            </div>
          </div>
        </div>
        {selectedTrader.services && selectedTrader.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {selectedTrader.services.slice(0, 5).map(s => (
              <span key={s} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-[10px] text-slate-300">{s}</span>
            ))}
          </div>
        )}
        {selectedTrader.profile_type !== 'seeded' && selectedTrader.spoken_languages && selectedTrader.spoken_languages.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <Languages className="w-3 h-3 text-slate-500 flex-shrink-0" />
            {selectedTrader.spoken_languages.map(lang => (
              <span key={lang} className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-[10px] text-indigo-300 font-medium">{lang}</span>
            ))}
          </div>
        )}
      </div>
      {/* Seeded trade contact info */}
      {selectedTrader.profile_type === 'seeded' && (selectedTrader.phone_number || selectedTrader.location) && (
        <div className="px-4 pb-2 space-y-1">
          {selectedTrader.phone_number && (
            <a href={`tel:${selectedTrader.phone_number}`} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white">
              <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">📞</span>
              {selectedTrader.phone_number}
            </a>
          )}
          {selectedTrader.location && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-400"><MapPin className="w-3 h-3" /></span>
              {selectedTrader.location}
            </p>
          )}
        </div>
      )}
      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4 pt-2">
        {selectedTrader.profile_type === 'seeded' ? (
          <>
            <button onClick={() => router.push(`/seeded/${selectedTrader.id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm rounded-xl transition-colors">
              <User className="w-4 h-4" /> View profile
            </button>
            <button onClick={() => router.push(`/claim/${selectedTrader.claim_token}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-colors">
              <Building2 className="w-4 h-4" /> Claim
            </button>
          </>
        ) : (
          <>
            <button onClick={() => router.push(`/messages/${selectedTrader.user_id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-colors">
              <MessageSquare className="w-4 h-4" /> Message
            </button>
            <button onClick={() => router.push(`/${selectedTrader.profile_type === "company" ? "companies" : "professionals"}/${selectedTrader.id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-sm rounded-xl transition-colors">
              <User className="w-4 h-4" /> Full profile
            </button>
          </>
        )}
      </div>
    </div>
  )

  const listPanel = (
    <>
      {/* Post a Job — homeowner-only action, hidden for tradesperson accounts */}
      {posterUserType !== "company" && (
        <div className="flex-shrink-0 flex justify-center pt-2 pb-2 px-3">
          <button onClick={() => setShowCategoryPicker(true)}
            className="px-6 py-1 bg-transparent border-2 border-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-400 active:bg-emerald-500/20 text-emerald-400 font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-colors">
            <span className="text-[16.8px]">Get Multiple Quotes</span>
          </button>
        </div>
      )}
      {/* Title row — hidden on desktop (shown in sidebar header instead) */}
      <div className="flex-shrink-0 px-3 pb-1 lg:hidden">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          {filters.industry && (() => {
            const s = getIndustryStyle(filters.industry); const I = s.icon
            return <span className={`w-4 h-4 rounded flex items-center justify-center ${s.iconBg} flex-shrink-0`}><I className={`w-2.5 h-2.5 ${s.iconColor}`} /></span>
          })()}
          {filters.industry ? filters.industry : "Tradespeople nearby"}
          {!loading && <span className="text-slate-500 font-normal ml-1">({traders.length})</span>}
        </span>
      </div>

      {/* Active filter chips — visible on both mobile and desktop when filters applied */}
      {hasActiveFilters && (
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 pb-1.5 flex-wrap">
          {filters.industry && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-[10px] text-emerald-300 font-medium">
              {filters.industry}
              {filters.subcategories.length > 0 && (
                <span className="ml-0.5 bg-emerald-500 text-white rounded-full px-1 text-[9px] font-bold">{filters.subcategories.length}</span>
              )}
              <button onClick={() => { const f = { ...filters, industry: null, subcategories: [] }; setFilters(f); setDraftFilters(f); if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, f) }} className="ml-0.5 text-emerald-400 hover:text-white">×</button>
            </span>
          )}
          {filters.radius !== "10" && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded-full text-[10px] text-slate-300 font-medium">
              {filters.radius} mi
              <button onClick={() => { const f = { ...filters, radius: "10" }; setFilters(f); setDraftFilters(f); if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, f) }} className="ml-0.5 text-slate-400 hover:text-white">×</button>
            </span>
          )}
          {filters.available && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded-full text-[10px] text-slate-300 font-medium">
              Available now
              <button onClick={() => { const f = { ...filters, available: false }; setFilters(f); setDraftFilters(f); if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, f) }} className="ml-0.5 text-slate-400 hover:text-white">×</button>
            </span>
          )}
          {filters.h24 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded-full text-[10px] text-slate-300 font-medium">
              24/7
              <button onClick={() => { const f = { ...filters, h24: false }; setFilters(f); setDraftFilters(f); if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, f) }} className="ml-0.5 text-slate-400 hover:text-white">×</button>
            </span>
          )}
          {filters.language && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 border border-slate-600 rounded-full text-[10px] text-slate-300 font-medium">
              {filters.language}
              <button onClick={() => { const f = { ...filters, language: "" }; setFilters(f); setDraftFilters(f); if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, f) }} className="ml-0.5 text-slate-400 hover:text-white">×</button>
            </span>
          )}
        </div>
      )}
      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : traders.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-400 text-xs mb-2">No tradespeople found nearby.</p>
            {posterUserType !== "company" && (
              <button onClick={() => setShowJobWizard(true)} className="text-emerald-400 text-xs font-semibold underline underline-offset-2">Post a job instead →</button>
            )}
          </div>
        ) : traders.map(trader => (
          <div key={trader.id} onClick={() => setSelectedTrader(p => p?.id === trader.id ? null : trader)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border cursor-pointer transition-all active:bg-slate-700 hover:bg-slate-700/70 ${trader.profile_type === 'seeded' ? 'bg-slate-800/70 border-amber-500/20' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
              {trader.logo_url
                ? <img src={trader.logo_url} alt={trader.name} className="w-full h-full object-cover rounded-lg" />
                : trader.profile_type === 'seeded'
                ? <span className="w-full h-full rounded-lg bg-amber-500/15 flex items-center justify-center"><Building2 className="w-5 h-5 text-amber-400" /></span>
                : (() => { const s = getIndustryStyle(trader.industry ?? ""); const I = s.icon; return <span className={`w-full h-full rounded-lg ${s.iconBg} flex items-center justify-center`}><I className={`w-5 h-5 ${s.iconColor}`} /></span> })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{trader.name}</p>
              {trader.profile_type === 'seeded' && trader.normalised_categories && trader.normalised_categories.length > 1 ? (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {trader.normalised_categories.slice(0, 3).map(c => (
                    <span key={c} className="px-1 py-px bg-amber-500/10 border border-amber-500/20 rounded text-[9px] text-amber-300">{c}</span>
                  ))}
                  {trader.normalised_categories.length > 3 && (
                    <span className="text-[9px] text-slate-500">+{trader.normalised_categories.length - 3}</span>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 truncate">{trader.industry ?? ""}</p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {trader.profile_type === 'seeded' && (
                  <span className="px-1.5 py-px bg-amber-500/15 border border-amber-500/25 rounded-full text-[10px] text-slate-400">Local business</span>
                )}
                {(trader.rating ?? 0) > 0 ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />{(trader.rating ?? 0).toFixed(1)}
                    {trader.reviews_count ? <span className="text-slate-500">({trader.reviews_count})</span> : null}
                  </span>
                ) : null}
                {trader.latitude && trader.longitude
                  ? <span className="text-[10px] text-slate-500">{distanceMi(trader.latitude, trader.longitude)} mi</span>
                  : null}
                {trader.profile_type !== 'seeded' && trader.open_for_business === true
                  ? <span className="px-1.5 py-px bg-emerald-500/15 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 font-semibold">Available</span>
                  : trader.profile_type !== 'seeded' && trader.open_for_business === false
                  ? <span className="px-1.5 py-px bg-slate-700 border border-slate-600 rounded-full text-[10px] text-slate-400 font-semibold">Busy</span>
                  : null}
                {trader.service_24_7 && <span className="px-1.5 py-px bg-blue-500/15 border border-blue-500/30 rounded-full text-[10px] text-blue-400 font-semibold">24/7</span>}
              </div>
              {trader.profile_type !== 'seeded' && trader.spoken_languages && trader.spoken_languages.length > 0 && (
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  <Languages className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                  <span className="text-[10px] text-indigo-300/80">
                    {trader.spoken_languages.slice(0, 3).join(", ")}
                    {trader.spoken_languages.length > 3 && <span className="text-slate-500"> +{trader.spoken_languages.length - 3}</span>}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex gap-1">
              {trader.profile_type === 'seeded' ? (
                <button onClick={e => { e.stopPropagation(); router.push(`/seeded/${trader.id}`) }}
                  className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300">
                  <User className="w-3 h-3" />
                </button>
              ) : (
                <>
                  <button onClick={e => { e.stopPropagation(); router.push(`/messages/${trader.user_id}`) }}
                    className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <MessageSquare className="w-3 h-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); router.push(`/${trader.profile_type === "company" ? "companies" : "professionals"}/${trader.id}`) }}
                    className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300">
                    <User className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  /* ── Filter panel content (shared) ───────────────────────────────────────── */
  const filterPanel = showFilters && (
    <div className="fixed inset-0" style={{ zIndex: 80 }}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(2,6,23,0.65)" }}
        onClick={() => setShowFilters(false)} />
      <div className="absolute rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden"
        style={{
          top: HEADER, bottom: isDesktop ? "max(env(safe-area-inset-bottom,0px),10px)" : "calc(3.5rem + max(env(safe-area-inset-bottom,0px),8px))",
          left: isDesktop ? "50%" : "12px",
          right: isDesktop ? "auto" : "12px",
          transform: isDesktop ? "translateX(-50%)" : undefined,
          width: isDesktop ? "420px" : undefined,
          backgroundColor: "#0f172a", zIndex: 81,
        }}>
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-bold text-white">Filters</span>
          <div className="flex items-center gap-3">
            {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-white transition-colors">Clear all</button>}
            <button onClick={() => setShowFilters(false)} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Postcode / location */}
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location</p>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-emerald-500/60 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <input
                value={postcodeInput}
                onChange={e => setPostcodeInput(e.target.value)}
                placeholder="Postcode or town…"
                autoComplete="off"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none min-w-0"
              />
              {postcodeInput.trim() && (
                <button onClick={() => setPostcodeInput("")} className="flex-shrink-0 text-slate-500 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="mx-3 border-t border-slate-800/80 mb-1" />
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Trade / Industry</p>
            {(() => {
              const allItems = [{ title: "All trades" } as const, ...TRADE_INDUSTRIES]
              const VISIBLE = 9 // "All trades" + 8 industries
              const visibleItems = showAllIndustries ? allItems : allItems.slice(0, VISIBLE)
              return (
                <>
                  {visibleItems.map((ind, i) => {
                    const isAll = i === 0 && ind.title === "All trades"
                    const active = isAll ? draftFilters.industry === null : draftFilters.industry === ind.title
                    const style = isAll ? null : getIndustryStyle(ind.title)
                    const Icon = style?.icon ?? null
                    const activeSubs = active ? draftFilters.subcategories : []
                    return (
                      <button key={ind.title}
                        onClick={() => {
                          if (isAll) {
                            setDraftFilters(f => ({ ...f, industry: null, subcategories: [] }))
                          } else if (draftFilters.industry === ind.title) {
                            setDraftFilters(f => ({ ...f, industry: null, subcategories: [] }))
                          } else {
                            const tradeInd = TRADE_INDUSTRIES.find(ti => ti.title === ind.title)
                            const allSvcs = tradeInd ? [...tradeInd.services] : []
                            setPickerIndustry(ind.title)
                            setPickerSubcats(allSvcs)
                            setShowSubcatPicker(true)
                          }
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1 border text-left transition-colors ${active ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700/60 text-slate-300"}`}>
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isAll ? "bg-slate-700" : (active ? "bg-white/10" : style!.iconBg)}`}>
                          {isAll ? <Search className="w-3 h-3 text-slate-300" /> : Icon && <Icon className={`w-3 h-3 ${active ? "text-emerald-300" : style!.iconColor}`} />}
                        </span>
                        <span className="flex-1 text-xs font-medium">{ind.title}</span>
                        {active && activeSubs.length > 0 && (
                          <span className="text-[9px] font-bold text-white bg-emerald-500 rounded-full px-1.5 py-px mr-1">{activeSubs.length}</span>
                        )}
                        {active && <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      </button>
                    )
                  })}
                  {!showAllIndustries && allItems.length > VISIBLE && (
                    <button onClick={() => setShowAllIndustries(true)}
                      className="w-full py-1.5 text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors text-center">
                      More ({allItems.length - VISIBLE} more trades) ›
                    </button>
                  )}
                </>
              )
            })()}
          </div>
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Search radius</p>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDraftFilters(f => ({ ...f, radius: opt.value }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${draftFilters.radius === opt.value ? "bg-emerald-500 border-emerald-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Language</p>
            <div className="flex flex-wrap gap-1">
              {["Any language", ...LANGUAGE_OPTIONS.slice(0, showAllLanguages ? undefined : LANG_DEFAULT_VISIBLE)].map((lang, i) => {
                const isAny  = i === 0
                const active = isAny ? draftFilters.language === "" : draftFilters.language === lang
                return (
                  <button key={lang} onClick={() => setDraftFilters(f => ({ ...f, language: isAny ? "" : (f.language === lang ? "" : lang) }))}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${active ? "bg-emerald-500 border-emerald-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
                    {lang}
                  </button>
                )
              })}
              {!showAllLanguages && (
                <button onClick={() => setShowAllLanguages(true)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                  +{LANGUAGE_OPTIONS.length - LANG_DEFAULT_VISIBLE} more
                </button>
              )}
              {showAllLanguages && (
                <button onClick={() => setShowAllLanguages(false)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                  Show less
                </button>
              )}
            </div>
          </div>
          <div className="px-3 pt-2 pb-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Availability</p>
            {([
              { key: "available" as const, label: "Available now", sub: "Currently open for work" },
              { key: "h24"       as const, label: "24/7 service",  sub: "Around-the-clock availability" },
            ]).map(({ key, label, sub }) => (
              <button key={key} onClick={() => setDraftFilters(f => ({ ...f, [key]: !f[key] }))}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl mb-1.5 border transition-colors ${draftFilters[key] ? "bg-emerald-500/15 border-emerald-500/40" : "bg-slate-800 border-slate-700"}`}>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-[10px] text-slate-400">{sub}</p>
                </div>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${draftFilters[key] ? "bg-emerald-500 border-emerald-500" : "border-slate-600 bg-slate-900"}`}>
                  {draftFilters[key] && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 px-3 py-3 border-t border-slate-800">
          <button onClick={applyFilters} disabled={geocoding}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-70 text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
            {geocoding
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Locating…</>
              : "Search"}
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Subcategory picker (appears above filter panel) ─────────────────────── */
  const subcatPickerEl = showSubcatPicker && pickerIndustry && (() => {
    const tradeInd = TRADE_INDUSTRIES.find(ti => ti.title === pickerIndustry)
    const allSvcs  = tradeInd ? [...tradeInd.services] : []
    const allChecked = pickerSubcats.length === allSvcs.length
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 90 }}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setShowSubcatPicker(false)} />
        <div className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden mx-4"
          style={{ width: 300, maxHeight: "72vh" }}>
          {/* Header */}
          <div className="flex items-start justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
            <div>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Specific services</p>
              <p className="text-sm font-bold text-white leading-tight">{pickerIndustry}</p>
            </div>
            <button onClick={() => setShowSubcatPicker(false)}
              className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0 ml-2 mt-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
          {/* Select all / Clear */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800/60 flex-shrink-0">
            <button onClick={() => setPickerSubcats(allSvcs)}
              className={`text-xs font-semibold transition-colors ${allChecked ? "text-emerald-400" : "text-slate-400 hover:text-emerald-400"}`}>
              Select all
            </button>
            <span className="text-slate-700">·</span>
            <button onClick={() => setPickerSubcats([])}
              className="text-xs text-slate-400 hover:text-white transition-colors">
              Clear all
            </button>
            <span className="ml-auto text-[10px] text-slate-500">{pickerSubcats.length}/{allSvcs.length} selected</span>
          </div>
          {/* Checkboxes */}
          <div className="flex-1 overflow-y-auto py-1">
            {allSvcs.map(svc => {
              const checked = pickerSubcats.includes(svc)
              return (
                <button key={svc}
                  onClick={() => setPickerSubcats(prev => checked ? prev.filter(s => s !== svc) : [...prev, svc])}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800/60 transition-colors text-left">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-emerald-500 border-emerald-500" : "border-slate-600 bg-slate-900"}`}>
                    {checked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-xs text-slate-200">{svc}</span>
                </button>
              )
            })}
          </div>
          {/* OK button */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-800">
            <button
              onClick={() => {
                const selectedSubcats = pickerSubcats.length === allSvcs.length ? [] : pickerSubcats
                setDraftFilters(f => ({ ...f, industry: pickerIndustry, subcategories: selectedSubcats }))
                setShowSubcatPicker(false)
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-sm transition-colors">
              {pickerSubcats.length === 0
                ? "Show all services"
                : pickerSubcats.length === allSvcs.length
                  ? `Show all ${allSvcs.length} services`
                  : `Apply ${pickerSubcats.length} service${pickerSubcats.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    )
  })()

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="fixed left-0 right-0 bottom-0 bg-slate-950 flex flex-col lg:flex-row" style={{ top: "var(--global-header-h, 0px)" }}>

      {/* ── LEFT: Map area (full on mobile, flex-1 on desktop) ──────────────── */}
      <div className="relative flex-1 min-h-0">

        {/* Map */}
        {mounted && (
          <div id="find-map-container" className="absolute inset-0" style={{ zIndex: 0 }}>
            <MapContainer center={initialCoords} zoom={13}
              style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <ZoomControl position="topright" />
              <MapSizeHandler />
              <MapViewUpdater center={coords} forceSeq={locateSeq} />
              <ViewportLoader onBoundsChange={onBoundsChange} />
              <MapFlyTo
                target={selectedTrader?.latitude && selectedTrader?.longitude ? { lat: selectedTrader.latitude, lng: selectedTrader.longitude } : null}
                radiusMiles={0.31}
              />
              {leafletL && tradersWithCoords.map(trader => (
                <Marker key={trader.id}
                  position={[trader.latitude!, trader.longitude!]}
                  icon={createTraderIcon(leafletL, selectedTrader?.id === trader.id, trader.industry, trader.open_for_business === false, trader.profile_type === 'seeded', trader.id) as any}
                  eventHandlers={{ click: () => setSelectedTrader(p => p?.id === trader.id ? null : trader) }} />

              ))}
            </MapContainer>
          </div>
        )}

        {/* Home button — desktop only, top-left corner of map.
            Container already sits below the global header, so this is just a small local offset. */}
        <Link href="/home"
          className="absolute left-3 hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/95 border border-slate-700 text-white text-xs font-semibold shadow-md hover:bg-slate-700 hover:border-slate-500 transition-colors"
          style={{ zIndex: 200, top: "16px" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Home
        </Link>

        {/* Header — absolute within the map area, overlays only the map column.
            The global site header now sits above this whole container (via
            --global-header-h), so this just needs a small local gap, not
            safe-area/header clearance. */}
        <div ref={headerRef} className="absolute top-0 left-0 right-0 flex flex-col gap-1 px-3 pb-1.5"
          style={{ zIndex: 20, paddingTop: "10px" }}>
          {/* Tab switcher — same footprint as the search bar below it */}
          <div className="flex self-center w-[264px] lg:w-80 bg-slate-800/95 border border-slate-700/80 rounded-full p-0.5 shadow-lg backdrop-blur-sm">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-sm">
              <Users className="w-3.5 h-3.5" />
              Tradespeople
            </button>
            <button
              onClick={() => router.push(`/find-jobs?lat=${coords[0]}&lng=${coords[1]}`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              <Briefcase className="w-3.5 h-3.5" />
              Trade Jobs
            </button>
          </div>
          {/* Search bar — single tap opens Filters modal */}
          <div className="flex items-center gap-2 self-center w-[264px] lg:w-80">
            <MapSearchBar
              loading={loading}
              label={filters.subcategories?.[0] ?? filters.industry ?? null}
              extraCount={Math.max(0, (filters.subcategories?.length ?? 0) - 1)}
              count={traders.length}
              countSuffix="nearby"
              accentColor="emerald"
              onClick={() => { setDraftFilters(filters); setPostcodeInput(""); setShowFilters(true) }}
            />
            {isDesktop && (
              <button onClick={handleMyLocation} disabled={locating} title="My location"
                className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800/95 border border-slate-700 flex items-center justify-center shadow-md hover:border-slate-500 hover:text-emerald-400 transition-colors text-slate-400">
                {locating
                  ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  : <LocateFixed className="w-3 h-3" />}
              </button>
            )}
          </div>{/* end search bar row */}
        </div>{/* end header */}

        {/* Locate button — mobile only, sits below Leaflet's +/- zoom controls */}
        {!isDesktop && (
          <button
            onClick={handleMyLocation}
            disabled={locating}
            title="My location"
            className="absolute w-8 h-8 rounded-lg bg-slate-800/95 border border-slate-700 flex items-center justify-center shadow-md hover:border-slate-500 hover:text-emerald-400 transition-colors text-slate-400"
            style={{ zIndex: 500, top: "calc(var(--global-header-h, 0px) + 156px)", right: "10px" }}
          >
            {locating
              ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              : <LocateFixed className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* ── RIGHT: Desktop sidebar ──────────────────────────────────────────── */}
      {isDesktop && (
        <div className="hidden lg:flex flex-col w-[420px] flex-shrink-0 border-l border-slate-700 overflow-hidden"
          style={{ backgroundColor: "#0f172a", zIndex: 30 }}>
          {/* Sidebar chrome */}
          <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-800"
            style={{ paddingTop: "max(env(safe-area-inset-top,0px),10px)" }}>
            {selectedTrader ? (
              <button onClick={() => setSelectedTrader(null)}
                className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-bold">All tradespeople</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-white flex items-center gap-1.5 min-w-0">
                {filters.industry && (() => {
                  const s = getIndustryStyle(filters.industry); const I = s.icon
                  return <span className={`w-4 h-4 rounded flex items-center justify-center ${s.iconBg} flex-shrink-0`}><I className={`w-2.5 h-2.5 ${s.iconColor}`} /></span>
                })()}
                <span className="truncate">{filters.industry || "Tradespeople nearby"}</span>
                {!loading && <span className="text-slate-500 font-normal flex-shrink-0">({traders.length})</span>}
              </span>
            )}
            <button onClick={() => { setDraftFilters(filters); setShowFilters(true) }}
              className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center relative transition-colors ${hasActiveFilters ? "bg-emerald-500 border-emerald-400 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
              <SlidersHorizontal className="w-3 h-3" />
              {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full border border-slate-800" />}
            </button>
          </div>
          {/* Panel content */}
          {selectedTrader ? profilePanel : listPanel}
        </div>
      )}

      {/* ── MOBILE: Uber-style bottom sheet ─────────────────────────────────── */}
      {!isDesktop && (
        <div className={`fixed rounded-t-3xl shadow-2xl border-t border-x border-slate-700/50 flex flex-col overflow-hidden ${isSheetDragging ? "" : "transition-all duration-300 ease-in-out"}`}
          style={{ ...mobileSheetStyle, zIndex: 30, backgroundColor: "#0f172a" }}>
          {/* Drag handle */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 pt-2 pb-1 cursor-grab select-none"
            style={{ touchAction: "none" }}
            onClick={() => {
              if (selectedTrader) { setSelectedTrader(null); setSheetHeightPx(null); setSheetState("peek"); return }
              setSheetHeightPx(null)
              setSheetState(p => p === "collapsed" ? "peek" : p === "peek" ? "expanded" : "peek")
            }}
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerUp}
            onPointerCancel={handleSheetPointerUp}>
            {selectedTrader ? (
              <>
                <button className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors">
                  <ArrowLeft className="w-4 h-4" /><span className="text-xs font-bold">All tradespeople</span>
                </button>
                <div className="w-10 h-1 rounded-full bg-slate-600 absolute left-1/2 -translate-x-1/2" />
                <div className="w-20" />
              </>
            ) : (
              <div className="w-full flex justify-center">
                <div className="w-10 h-1 rounded-full bg-slate-600" />
              </div>
            )}
          </div>
          {selectedTrader ? profilePanel : listPanel}
        </div>
      )}

      {/* ── Overlays (filter panel, subcategory picker, lightbox, job wizard) ── */}
      {filterPanel}
      {subcatPickerEl}

      {lightboxIndex !== null && profilePhotos.length > 0 && (
        <LightboxOverlay
          photos={profilePhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => ((i ?? 0) - 1 + profilePhotos.length) % profilePhotos.length)}
          onNext={() => setLightboxIndex(i => ((i ?? 0) + 1) % profilePhotos.length)}
        />
      )}

      {showJobWizard && (
        <div className="fixed inset-0" style={{ zIndex: 60 }}>
          <JobWizardModal
            guestMode={!user} initialPostcode={initialPostcode}
            companyProfile={(posterUserType === "company" ? posterCompanyProfile : homeownerProfile) ?? null}
            userType={posterUserType} redirectPath={findPageUrl}
            initialIndustry={wizardIndustry}
            initialService={wizardService}
            onClose={() => { setShowJobWizard(false); setWizardIndustry(undefined); setWizardService(undefined) }}
          />
        </div>
      )}

      {/* ── Category picker — rendered via portal so it escapes the map's stacking context ── */}
      {showCategoryPicker && mounted && createPortal(
        <div className="fixed inset-0 flex flex-col bg-slate-950" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800/80"
            style={{ paddingTop: "max(env(safe-area-inset-top,0px),12px)" }}>
            <div>
              <p className="text-base font-bold text-white">Post a Job</p>
              <p className="text-xs text-slate-400 mt-0.5">What do you need help with?</p>
            </div>
            <button onClick={() => setShowCategoryPicker(false)}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Scrollable photo grid */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {helpItems.map(item => (
                <button key={item.label}
                  onClick={() => {
                    setWizardIndustry(item.industry)
                    setWizardService(item.service)
                    setShowCategoryPicker(false)
                    setShowJobWizard(true)
                  }}
                  className="group relative rounded-xl overflow-hidden border border-slate-700/40 hover:border-emerald-500/60 active:scale-95 transition-all duration-150 shadow-md aspect-square focus:outline-none">
                  <img src={item.img} alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <p className="absolute bottom-1.5 left-0 right-0 text-center text-white text-[10px] sm:text-xs font-semibold px-1 leading-tight drop-shadow-lg">
                    {item.label}
                  </p>
                </button>
              ))}
              {/* Not sure / Other */}
              <button
                onClick={() => {
                  setWizardIndustry("Not sure / Other")
                  setWizardService("")
                  setShowCategoryPicker(false)
                  setShowJobWizard(true)
                }}
                className="group relative rounded-xl overflow-hidden border border-slate-600/60 hover:border-emerald-500/60 active:scale-95 transition-all duration-150 shadow-md aspect-square focus:outline-none bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/60 to-slate-900/80" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-400 group-hover:text-slate-200 transition-colors leading-none">?</span>
                  <p className="text-center text-white text-[10px] sm:text-xs font-semibold leading-tight">
                    Not sure / Other
                  </p>
                </div>
              </button>
            </div>
          </div>
          {/* Bottom safe area spacer */}
          <div className="flex-shrink-0" style={{ height: "max(env(safe-area-inset-bottom,0px),8px)" }} />
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
function LightboxOverlay({
  photos, index, onClose, onPrev, onNext,
}: {
  photos: { id: string; photo_url: string }[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx > 0) onNext(); else onPrev()
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 70, background: "rgba(0,0,0,0.95)" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs z-10">
        {index + 1} / {photos.length}
      </div>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={onPrev}
          className="absolute left-3 w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Image */}
      <img
        src={photos[index].photo_url}
        alt={`Photo ${index + 1}`}
        className="max-w-full max-h-full object-contain select-none"
        draggable={false}
      />

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-3 w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white z-10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => { if (i < index) onPrev(); else if (i > index) onNext() }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
