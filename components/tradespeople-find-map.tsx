"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { TRADE_INDUSTRIES } from "@/lib/data/trade-industries"
import { getIndustryStyle, getIndustryPinColor, getIndustryPinSvg, normaliseCategory } from "@/lib/data/industry-styles"
import { ArrowLeft, MapPin, Star, MessageSquare, User, SlidersHorizontal, X, Check, ChevronLeft, ChevronRight, Search, Building2, Languages } from "lucide-react"
import JobWizardModal from "@/components/job-wizard-modal"

// ── Leaflet dynamic imports ────────────────────────────────────────────────────
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false })
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false })
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false })
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
    function Comp({ center }: { center: [number, number] }) {
      const map = useMap()
      const prev = useRef(center)
      useEffect(() => {
        const [pLat, pLon] = prev.current
        const [lat, lon] = center
        if (Math.abs(lat - pLat) > 0.001 || Math.abs(lon - pLon) > 0.001) {
          prev.current = center
          map.flyTo(center, map.getZoom(), { animate: true, duration: 0.6 })
        }
      }, [map, center])
      return null
    }
    return Comp
  }),
  { ssr: false }
)

type BBox = { north: number; south: number; east: number; west: number }

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

// ── Custom pin ─────────────────────────────────────────────────────────────────
function createTraderIcon(L: any, isSelected: boolean, industryTitle?: string | null, isBusy?: boolean, isSeeded?: boolean) {
  const size     = isSelected ? 44 : 36
  const iconSize = Math.round(size * 0.50)

  // Seeded trades: correct industry icon but dimmed grey (looks like a busy unregistered business).
  // Use a dashed border so they are visually distinguishable from real-but-busy traders on close inspection.
  if (isSeeded) {
    const mappedTitle = normaliseCategory(industryTitle)
    const color  = "#64748b"   // slate-500
    const pinBg  = isSelected ? "#475569" : "#0f172a"
    const iconClr = isSelected ? "#ffffff" : "#94a3b8"
    const svg    = getIndustryPinSvg(mappedTitle, iconClr, iconSize)
    return L.divIcon({
      className: "",
      html: `<div style="width:${size}px;height:${size}px;background:${pinBg};border:2px dashed ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.35),0 0 0 3px ${color}20">${svg}</div>`,
      iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -(size/2+4)],
    })
  }

  const baseColor = getIndustryPinColor(industryTitle)
  const color     = isBusy ? "#64748b" : baseColor
  const pinBg     = isSelected ? color : "#0f172a"
  const iconClr   = isSelected ? "#ffffff" : color
  const svg       = getIndustryPinSvg(industryTitle, iconClr, iconSize)
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${pinBg};border:2.5px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.4),0 0 0 4px ${color}30">${svg}</div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -(size/2+4)],
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
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TradespeopleFindMap({ initialTraders, initialCoords, initialPostcode, initialIndustry }: Props) {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const supabase      = createClient()

  const [traders,          setTraders]          = useState<Trader[]>(initialTraders)
  const [filters,          setFilters]          = useState<Filters>(() => filtersFromSearchParams(searchParams, initialIndustry))
  const [draftFilters,     setDraftFilters]     = useState<Filters>(() => filtersFromSearchParams(searchParams, initialIndustry))
  const [sheetState,       setSheetState]       = useState<SheetState>("peek")
  const [selectedTrader,   setSelectedTrader]   = useState<Trader | null>(null)
  const [profilePhotos,    setProfilePhotos]    = useState<{ id: string; photo_url: string }[]>([])
  const [loadingProfile,   setLoadingProfile]   = useState(false)
  const [lightboxIndex,    setLightboxIndex]    = useState<number | null>(null)
  const [showJobWizard,    setShowJobWizard]    = useState(false)
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
  const [isDesktop,        setIsDesktop]        = useState(false)

  const touchStartY      = useRef<number | null>(null)
  const currentBoundsRef = useRef<BBox | null>(null)
  const fetchTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filtersRef       = useRef(filtersFromSearchParams(searchParams, initialIndustry))

  useEffect(() => {
    setMounted(true)
    import("leaflet").then(mod => setLeafletL(mod.default ?? mod))
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mq.matches)
    const onMqChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", onMqChange)
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) supabase.from("homeowner_profiles").select("*").eq("user_id", user.id)
        .maybeSingle().then(({ data }) => setHomeownerProfile(data))
    })
    // Push zoom controls below the floating header
    const style = document.createElement("style")
    style.id = "find-map-zoom-offset"
    style.textContent = `#find-map-container .leaflet-top { margin-top: 60px; }`
    if (!document.getElementById("find-map-zoom-offset")) document.head.appendChild(style)
    return () => {
      document.getElementById("find-map-zoom-offset")?.remove()
      mq.removeEventListener("change", onMqChange)
    }
  }, [])

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
      if (f.industry) params.set("industry", f.industry)
      if (f.language) params.set("language", f.language)
      const res = await fetch(`/api/traders?${params}`)
      if (!res.ok) return
      let results: Trader[] = await res.json()
      if (f.available) results = results.filter(t => t.open_for_business === true)
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
    router.replace(`/find?${params.toString()}`, { scroll: false })
  }

  const applyFilters = () => {
    setFilters(draftFilters); setShowFilters(false); setShowAllIndustries(false)
    pushFilterParams(draftFilters)
    if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, draftFilters)
    // Analytics-only — never blocks UI or affects hasActiveFilters
    Promise.resolve(supabase.rpc("log_map_filter_event", {
      p_radius_miles:      draftFilters.radius !== "10" ? parseInt(draftFilters.radius) : null,
      p_category:          draftFilters.industry ?? null,
      p_availability_only: draftFilters.available,
    })).catch(() => {})
  }
  const clearFilters = () => {
    const r = { ...DEFAULT_FILTERS }
    setDraftFilters(r); setFilters(r); setShowFilters(false); setShowAllIndustries(false); setShowAllLanguages(false)
    pushFilterParams(r)
    if (currentBoundsRef.current) fetchByViewport(currentBoundsRef.current, r)
  }
  // Derived from filters state which mirrors URL params — deterministic, SSR-safe
  const hasActiveFilters = filters.industry !== null || filters.subcategories.length > 0 || filters.radius !== "10" || filters.language !== "" || filters.available || filters.h24

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = touchStartY.current - e.changedTouches[0].clientY
    touchStartY.current = null
    if (Math.abs(dy) < 25) return
    if (dy > 0) setSheetState(p => p === "collapsed" ? "peek" : "expanded")
    else        setSheetState(p => p === "expanded"   ? "peek" : "collapsed")
  }

  const distanceMi = (lat: number, lon: number) => {
    const R = 3959, dLat = (lat - initialCoords[0]) * Math.PI/180, dLon = (lon - initialCoords[1]) * Math.PI/180
    const a = Math.sin(dLat/2)**2 + Math.cos(initialCoords[0]*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)
  }

  const tradersWithCoords = traders.filter(t => t.latitude && t.longitude)
  const findPageUrl = `/find${initialPostcode ? `?postcode=${encodeURIComponent(initialPostcode)}` : ""}`

  // Mobile bottom sheet dimensions
  const HEADER = "52px"
  const mobileSheetStyle: React.CSSProperties =
    sheetState === "expanded" ? { top: HEADER, bottom: 0, left: 0, right: 0 } :
    sheetState === "peek"     ? { bottom: 0, left: 0, right: 0, height: "48vh" } :
                                { bottom: 0, left: 0, right: 0, height: "160px" }

  /* ── Shared panel content ────────────────────────────────────────────────── */
  const profilePanel = selectedTrader && (
    <div className="flex-1 min-h-0 overflow-y-auto">
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
              {selectedTrader.rating > 0 ? (
                <span className="flex items-center gap-0.5 text-xs text-amber-400 font-semibold">
                  <Star className="w-3 h-3 fill-amber-400" />{selectedTrader.rating.toFixed(1)}
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
      {/* Post a Job */}
      <div className="flex-shrink-0 flex justify-center pt-2 pb-2 px-3">
        <button onClick={() => setShowJobWizard(true)}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-colors">
          + Post a Job
        </button>
      </div>
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
            <button onClick={() => setShowJobWizard(true)} className="text-emerald-400 text-xs font-semibold underline underline-offset-2">Post a job instead →</button>
          </div>
        ) : traders.map(trader => (
          <div key={trader.id} onClick={() => setSelectedTrader(p => p?.id === trader.id ? null : trader)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border cursor-pointer transition-all active:bg-slate-700 hover:bg-slate-700/70 ${trader.profile_type === 'seeded' ? 'bg-slate-800/70 border-amber-500/20' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center">
              {trader.logo_url
                ? <img src={trader.logo_url} alt={trader.name} className="w-full h-full object-cover rounded-lg" />
                : trader.profile_type === 'seeded'
                ? <span className="w-full h-full rounded-lg bg-amber-500/15 flex items-center justify-center"><Building2 className="w-4 h-4 text-amber-400" /></span>
                : (() => { const s = getIndustryStyle(trader.industry ?? ""); const I = s.icon; return <span className={`w-full h-full rounded-lg ${s.iconBg} flex items-center justify-center`}><I className={`w-4 h-4 ${s.iconColor}`} /></span> })()}
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
                {trader.rating > 0 ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />{trader.rating.toFixed(1)}
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
    <div className="fixed inset-0" style={{ zIndex: 50 }}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(2,6,23,0.65)" }}
        onClick={() => setShowFilters(false)} />
      <div className="absolute rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden"
        style={{
          top: HEADER, bottom: "max(env(safe-area-inset-bottom,0px),10px)",
          left: isDesktop ? "50%" : "12px",
          right: isDesktop ? "auto" : "12px",
          transform: isDesktop ? "translateX(-50%)" : undefined,
          width: isDesktop ? "420px" : undefined,
          backgroundColor: "#0f172a", zIndex: 51,
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
          <div className="px-3 pt-3 pb-1">
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
          <button onClick={applyFilters} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-emerald-500/30">
            Show results
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
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 55 }}>
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
    <div className="fixed inset-0 bg-slate-950 flex flex-col lg:flex-row">

      {/* ── LEFT: Map area (full on mobile, flex-1 on desktop) ──────────────── */}
      <div className="relative flex-1 min-h-0">

        {/* Map */}
        {mounted && (
          <div id="find-map-container" className="absolute inset-0" style={{ zIndex: 0 }}>
            <MapContainer center={initialCoords} zoom={11}
              style={{ height: "100%", width: "100%" }} zoomControl={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <ZoomControl position="topright" />
              <MapSizeHandler />
              <MapViewUpdater center={initialCoords} />
              <ViewportLoader onBoundsChange={onBoundsChange} />
              {leafletL && tradersWithCoords.map(trader => (
                <Marker key={trader.id}
                  position={[trader.latitude!, trader.longitude!]}
                  icon={createTraderIcon(leafletL, selectedTrader?.id === trader.id, trader.industry, trader.open_for_business === false, trader.profile_type === 'seeded') as any}
                  eventHandlers={{ click: () => setSelectedTrader(p => p?.id === trader.id ? null : trader) }}>
                  <Popup>
                    <b className="text-base font-bold text-yellow-500">{trader.name}</b>
                    {trader.profile_type === 'seeded' && <div className="text-[10px] text-gray-400 mt-0.5">Local business</div>}
                    {(trader.normalised_categories && trader.normalised_categories.length > 1)
                      ? <div className="mt-1 text-[11px] font-semibold text-amber-600 leading-snug">{trader.normalised_categories.join(" · ")}</div>
                      : trader.industry && <div className="text-sm font-semibold text-amber-600 mt-0.5">{trader.industry}</div>
                    }
                    {trader.rating > 0 && <div className="text-xs text-amber-500 mt-0.5">★ {trader.rating.toFixed(1)}</div>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Header — absolute within the map area, overlays only the map column */}
        <div className="absolute top-0 left-0 right-0 flex items-center lg:justify-center gap-2 px-3 py-2"
          style={{ zIndex: 20, paddingTop: "max(env(safe-area-inset-top,0px),8px)" }}>
          <button onClick={() => router.back()}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white shadow-md">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 min-w-0 lg:flex-none lg:w-72 flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1.5 shadow-md">
            <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-white font-medium truncate">{initialPostcode || "Nearby tradespeople"}</span>
            <span className="ml-auto text-[10px] flex-shrink-0">
              {loading ? <span className="text-emerald-400">Searching…</span> : <span className="text-slate-400">{traders.length} found</span>}
            </span>
          </div>
          {/* Filter button — mobile always, desktop next to postcode bar */}
          <button onClick={() => { setDraftFilters(filters); setShowFilters(true) }}
            className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center shadow-md relative transition-colors ${hasActiveFilters ? "bg-emerald-500 border-emerald-400 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-slate-950" />}
          </button>
        </div>
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
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-medium">All tradespeople</span>
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
        <div className="fixed rounded-t-3xl shadow-2xl border-t border-x border-slate-700/50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{ ...mobileSheetStyle, zIndex: 30, backgroundColor: "#0f172a" }}>
          {/* Drag handle */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 pt-2 pb-1 cursor-grab select-none"
            onClick={() => {
              if (selectedTrader) { setSelectedTrader(null); setSheetState("peek"); return }
              setSheetState(p => p === "collapsed" ? "peek" : p === "peek" ? "expanded" : "peek")
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}>
            {selectedTrader ? (
              <>
                <button className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" /><span className="text-xs">All tradespeople</span>
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
            companyProfile={homeownerProfile ?? null} userType="homeowner" redirectPath={findPageUrl}
            initialIndustry={filters.industry ?? undefined}
            initialService={filters.subcategories.length === 1 ? filters.subcategories[0] : undefined}
          />
        </div>
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
