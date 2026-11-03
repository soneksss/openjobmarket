// Where to look things up. Postcodes decide their own country (UK postcode → GB,
// US ZIP → US); free text like a town name is searched in the visitor's country,
// so "Richmond" means Richmond, London for a UK visitor and Richmond, VA for a US one.

export const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i
export const US_ZIP_RE = /^\d{5}(-\d{4})?$/

/** "gb" / "us" when the text is a full UK postcode or US ZIP code, otherwise null. */
export function postcodeCountry(text: string): "gb" | "us" | null {
  const t = text.trim()
  if (UK_POSTCODE_RE.test(t)) return "gb"
  if (US_ZIP_RE.test(t)) return "us"
  return null
}

/** Nominatim countrycodes for a free-text search by a visitor from `country` (ISO-2). */
export function searchCountryCodes(country: string | null | undefined): string {
  switch (country?.toUpperCase()) {
    case "US": return "us"
    case "GB": case undefined: case "": return "gb"
    default:   return "gb,us,ie,ca,au"
  }
}

/** Nominatim search URL for what someone typed: postcode/ZIP aware, otherwise visitor-country aware. */
export function geocodeUrl(text: string, visitorCountry: string | null | undefined): string {
  const q = encodeURIComponent(text.trim())
  const pc = postcodeCountry(text)
  if (pc) return `https://nominatim.openstreetmap.org/search?format=json&postalcode=${q}&country=${pc}&limit=1`
  return `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=${searchCountryCodes(visitorCountry)}`
}

/** Browser only: the visitor's country from the ojm_country cookie (set by the proxy). */
export function visitorCountry(): string | null {
  if (typeof document === "undefined") return null
  return document.cookie.match(/(?:^|; )ojm_country=([A-Z]{2})/)?.[1] ?? null
}
