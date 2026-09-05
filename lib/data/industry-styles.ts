/**
 * Industry icon + colour styles — matches the "What do you need help with?"
 * grid on the landing page. Import getIndustryStyle() to get the Lucide icon
 * component and Tailwind classes for any industry title.
 */

import {
  Droplets, Zap, HardHat, Paintbrush, PaintBucket, House,
  Hammer, Leaf, Grid3x3, Sparkles, Wrench, Trash2, Fence,
  Car, Blinds, Wind, HelpCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface IndustryStyle {
  icon: LucideIcon
  iconBg: string    // Tailwind bg class
  iconColor: string // Tailwind text class
  pinHex: string    // Hex colour for map-pin HTML (no Tailwind available there)
}

const STYLES: Record<string, IndustryStyle> = {
  "Plumbing & Heating":             { icon: Droplets,    iconBg: "bg-blue-500/20",    iconColor: "text-blue-400",    pinHex: "#60a5fa" },
  "Electrical":                     { icon: Zap,         iconBg: "bg-yellow-500/20",  iconColor: "text-yellow-400",  pinHex: "#facc15" },
  "Construction & Renovation":      { icon: HardHat,     iconBg: "bg-stone-500/20",   iconColor: "text-stone-400",   pinHex: "#a8a29e" },
  "Plastering & Rendering":         { icon: Paintbrush,  iconBg: "bg-amber-500/20",   iconColor: "text-amber-400",   pinHex: "#fbbf24" },
  "Painting & Decorating":          { icon: PaintBucket, iconBg: "bg-pink-500/20",    iconColor: "text-pink-400",    pinHex: "#f472b6" },
  "Roofing":                        { icon: House,       iconBg: "bg-cyan-500/20",    iconColor: "text-cyan-400",    pinHex: "#22d3ee" },
  "Carpentry & Joinery":            { icon: Hammer,      iconBg: "bg-orange-500/20",  iconColor: "text-orange-400",  pinHex: "#fb923c" },
  "Gardening & Landscaping":        { icon: Leaf,        iconBg: "bg-green-500/20",   iconColor: "text-green-400",   pinHex: "#4ade80" },
  "Flooring & Tiling":              { icon: Grid3x3,     iconBg: "bg-teal-500/20",    iconColor: "text-teal-400",    pinHex: "#2dd4bf" },
  "Cleaning":                       { icon: Sparkles,    iconBg: "bg-violet-500/20",  iconColor: "text-violet-400",  pinHex: "#a78bfa" },
  "Handyman / Small Jobs":          { icon: Wrench,      iconBg: "bg-slate-500/25",   iconColor: "text-slate-300",   pinHex: "#cbd5e1" },
  "Moving & Transport":             { icon: Car,         iconBg: "bg-indigo-500/20",  iconColor: "text-indigo-400",  pinHex: "#818cf8" },
  "Waste Removal":                  { icon: Trash2,      iconBg: "bg-red-500/15",     iconColor: "text-red-400",     pinHex: "#f87171" },
  "Fencing & Gates":                { icon: Fence,       iconBg: "bg-emerald-500/20", iconColor: "text-emerald-400", pinHex: "#34d399" },
  "Windows & Glazing":              { icon: Blinds,      iconBg: "bg-purple-500/20",  iconColor: "text-purple-400",  pinHex: "#c084fc" },
  "Air Conditioning & Ventilation": { icon: Wind,        iconBg: "bg-sky-500/20",     iconColor: "text-sky-400",     pinHex: "#38bdf8" },
  "Not sure / Other":               { icon: HelpCircle,  iconBg: "bg-slate-500/20",   iconColor: "text-slate-400",   pinHex: "#94a3b8" },
}

const FALLBACK: IndustryStyle = { icon: Wrench, iconBg: "bg-slate-500/20", iconColor: "text-slate-300", pinHex: "#94a3b8" }

/** Hex colour for use inside Leaflet divIcon HTML strings. */
export function getIndustryPinColor(title: string | null | undefined): string {
  return (STYLES[title ?? ""] ?? FALLBACK).pinHex
}

// ── Inline SVG path data for each industry (Lucide icon paths, 24×24 viewBox) ──
// Used inside Leaflet divIcon HTML strings where React components can't be used.
const PIN_PATHS: Record<string, string> = {
  "Plumbing & Heating":
    `<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>`,
  "Electrical":
    `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  "Construction & Renovation":
    `<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>`,
  "Plastering & Rendering":
    `<path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/>`,
  "Painting & Decorating":
    `<path d="m19 11-8-8-8.5 8.5a5.5 5.5 0 0 0 7.78 7.78L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/>`,
  "Roofing":
    `<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
  "Carpentry & Joinery":
    `<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>`,
  "Gardening & Landscaping":
    `<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>`,
  "Flooring & Tiling":
    `<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>`,
  "Cleaning":
    `<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>`,
  "Handyman / Small Jobs":
    `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  "Waste Removal":
    `<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>`,
  "Moving & Transport":
    `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>`,
  "Fencing & Gates":
    `<path d="M4 3 2 5v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"/><path d="M6 8h4"/><path d="M6 18h4"/><path d="m12 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"/><path d="M14 8h4"/><path d="M14 18h4"/><path d="m20 3-2 2v15c0 .6.4 1 1 1h2c.6 0 1-.4 1-1V5Z"/>`,
  "Windows & Glazing":
    `<path d="M3 3h18"/><path d="M20 7H8"/><path d="M20 11H8"/><path d="M10 19h10"/><path d="M8 15h12"/><path d="M4 3v14"/><circle cx="4" cy="19" r="2"/>`,
  "Air Conditioning & Ventilation":
    `<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>`,
  "Not sure / Other":
    `<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>`,
}

const FALLBACK_PATHS = PIN_PATHS["Handyman / Small Jobs"]

/**
 * Returns a complete inline <svg> string for use inside Leaflet divIcon HTML.
 * @param title  Industry title (from TRADE_INDUSTRIES)
 * @param color  Stroke/fill colour hex string
 * @param size   Pixel size of the SVG element
 */
export function getIndustryPinSvg(title: string | null | undefined, color: string, size: number): string {
  const paths = PIN_PATHS[title ?? ""] ?? FALLBACK_PATHS
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
}

export function getIndustryStyle(title: string): IndustryStyle {
  return STYLES[title] ?? FALLBACK
}

// Maps raw Google Maps / CSV category names → internal TRADE_INDUSTRIES style keys.
// Used so seeded trade markers and profile pages show the correct industry icon.
const SEEDED_CATEGORY_MAP: Record<string, string> = {
  // Plumbing
  "Plumber":                        "Plumbing & Heating",
  "Gas engineer":                   "Plumbing & Heating",
  "Drainage service":               "Plumbing & Heating",
  // Electrical
  "Electrician":                    "Electrical",
  "Electrical installation service":"Electrical",
  "Lighting contractor":            "Electrical",
  "Solar energy company":           "Electrical",
  "Utility contractor":             "Electrical",
  // Construction
  "Construction company":           "Construction & Renovation",
  "Home builder":                   "Construction & Renovation",
  "Building firm":                  "Construction & Renovation",
  "Custom home builder":            "Construction & Renovation",
  "Boat builders":                  "Construction & Renovation",
  "Real estate developer":          "Construction & Renovation",
  "Building consultant":            "Construction & Renovation",
  "Building restoration service":   "Construction & Renovation",
  "Bricklayer":                     "Construction & Renovation",
  "General contractor":             "Construction & Renovation",
  "Contractor":                     "Construction & Renovation",
  // Plastering
  "Plasterer":                      "Plastering & Rendering",
  "Ceiling supplier":               "Plastering & Rendering",
  // Painting
  "Painter":                        "Painting & Decorating",
  "Painting":                       "Painting & Decorating",
  "Interior Decorator":             "Painting & Decorating",
  // Roofing
  "Roofing contractor":             "Roofing",
  // Carpentry
  "Carpenter":                      "Carpentry & Joinery",
  "Joiner":                         "Carpentry & Joinery",
  "Kitchen remodeler":              "Carpentry & Joinery",
  "Bathroom remodeler":             "Carpentry & Joinery",
  "Garage builder":                 "Carpentry & Joinery",
  "Deck builder":                   "Carpentry & Joinery",
  "Shed builder":                   "Carpentry & Joinery",
  // Landscaping
  "Landscaper":                     "Gardening & Landscaping",
  "Gardener":                       "Gardening & Landscaping",
  "Landscape designer":             "Gardening & Landscaping",
  "Garden":                         "Gardening & Landscaping",
  // Cleaning
  "Cleaning service":               "Cleaning",
  "House cleaning service":         "Cleaning",
  "Cleaners":                       "Cleaning",
  "Dry cleaner":                    "Cleaning",
  "Laundry":                        "Cleaning",
  "Carpet cleaning service":        "Cleaning",
  // Handyman
  "Handyman/Handywoman/Handyperson":"Handyman / Small Jobs",
  "Property maintenance":           "Handyman / Small Jobs",
  // Waste
  "Waste management service":       "Waste Removal",
  "Garbage collection service":     "Waste Removal",
  "House clearance service":        "Waste Removal",
  "Junk removal service":           "Waste Removal",
  "Garbage dump":                   "Waste Removal",
  // Moving & transport
  "Moving and storage service":     "Moving & Transport",
  "Mover":                          "Moving & Transport",
  // Fencing
  "Fence contractor":               "Fencing & Gates",
  // Windows & glazing
  "Glazier":                        "Windows & Glazing",
  "Window installation service":    "Windows & Glazing",
  // HVAC
  "Air conditioning service":       "Air Conditioning & Ventilation",
  // Flooring
  "Paving contractor":              "Flooring & Tiling",
  // Pest control, sports (fallback)
  "Pest control service":           "Not sure / Other",
  "Sports club":                    "Not sure / Other",
}

/**
 * Normalises a raw CSV / Google Maps category string into one of the internal
 * TRADE_INDUSTRIES style keys so the correct icon and colour are applied.
 */
export function normaliseCategory(raw: string | null | undefined): string {
  if (!raw) return "Not sure / Other"
  if (STYLES[raw]) return raw                      // already a valid style key
  return SEEDED_CATEGORY_MAP[raw] ?? "Not sure / Other"
}
