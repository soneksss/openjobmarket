// Currencies a job or vacancy can be posted in. Each job keeps the currency it was
// posted in (jobs.currency), so amounts are never converted — a £200 job stays £200
// for everyone; a $200 job stays $200.

export const CURRENCIES = [
  { code: "GBP", symbol: "£",  label: "£ GBP" },
  { code: "USD", symbol: "$",  label: "$ USD" },
  { code: "EUR", symbol: "€",  label: "€ EUR" },
  { code: "CAD", symbol: "C$", label: "C$ CAD" },
  { code: "AUD", symbol: "A$", label: "A$ AUD" },
] as const

export type Currency = (typeof CURRENCIES)[number]["code"]
export const DEFAULT_CURRENCY: Currency = "GBP"

const EURO_COUNTRIES = new Set([
  "IE", "FR", "DE", "ES", "IT", "NL", "BE", "PT", "AT", "FI", "GR", "LU",
  "SK", "SI", "EE", "LV", "LT", "CY", "MT", "HR",
])

export function currencyForCountry(country: string | null | undefined): Currency {
  switch (country?.toUpperCase()) {
    case "US": return "USD"
    case "CA": return "CAD"
    case "AU": return "AUD"
    case "GB": return "GBP"
    default:   return country && EURO_COUNTRIES.has(country.toUpperCase()) ? "EUR" : DEFAULT_CURRENCY
  }
}

export function isCurrency(value: unknown): value is Currency {
  return CURRENCIES.some(c => c.code === value)
}

export function currencySymbol(currency: string | null | undefined): string {
  return CURRENCIES.find(c => c.code === currency)?.symbol ?? "£"
}

/** "£1,500" — or compact "£1.5k" for tight spaces like map pins and list rows. */
export function formatMoney(amount: number, currency: string | null | undefined, compact = false): string {
  const s = currencySymbol(currency)
  if (compact && amount >= 1000) return `${s}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
  return `${s}${amount.toLocaleString("en-GB")}`
}

/** Browser only: the currency to pre-select for this visitor (from the ojm_country cookie). */
export function visitorCurrency(): Currency {
  if (typeof document === "undefined") return DEFAULT_CURRENCY
  const m = document.cookie.match(/(?:^|; )ojm_country=([A-Z]{2})/)
  return currencyForCountry(m?.[1])
}
