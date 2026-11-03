import { cookies, headers } from "next/headers"
import { geocodeUrl } from "@/lib/geo"

// Map pages: where to centre the map when the URL doesn't say. Vercel adds the
// visitor's approximate (city-level) location to every request, so a visitor in
// Leeds or Chicago starts near home instead of in Portsmouth. The browser's own
// location still takes over when the visitor allows it.

const FALLBACK: [number, number] = [50.8058, -1.0872] // Portsmouth

export async function mapStart(params: { lat?: string; lng?: string; postcode?: string }) {
  const h = await headers()
  const country = (await cookies()).get("ojm_country")?.value ?? h.get("x-vercel-ip-country")

  if (params.lat && params.lng) {
    return { coords: [parseFloat(params.lat), parseFloat(params.lng)] as [number, number], coordsAreDefault: false }
  }
  if (params.postcode) {
    try {
      const res = await fetch(geocodeUrl(params.postcode, country), {
        headers: { "User-Agent": "OpenJobMarket/1.0 contact@openjobmarket.com" },
        next: { revalidate: 3600 },
      })
      const rows = await res.json()
      if (rows?.[0]) return { coords: [parseFloat(rows[0].lat), parseFloat(rows[0].lon)] as [number, number], coordsAreDefault: false }
    } catch {
      // fall through to the visitor's area
    }
  }
  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "")
  const lng = parseFloat(h.get("x-vercel-ip-longitude") ?? "")
  const coords: [number, number] = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : FALLBACK
  return { coords, coordsAreDefault: true }
}
