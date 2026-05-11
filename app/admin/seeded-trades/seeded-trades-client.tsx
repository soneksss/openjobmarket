"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Upload, Copy, Check, Search, RefreshCw, Download,
  Building2, Mail, Phone, Globe, MapPin, CheckCircle2, XCircle,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SeededTrade {
  id: string
  company_name: string
  trade_category: string | null
  address: string | null
  postcode: string | null
  email: string | null
  phone: string | null
  website: string | null
  claimed: boolean
  claim_token: string
  claim_url: string | null
  created_at: string
}

// ── CSV parser (no dependencies) ──────────────────────────────────────────────

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    if (cols.every(c => !c.trim())) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? "").trim() })
    rows.push(row)
  }
  return rows
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ""
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === "," && !inQuote) {
      result.push(cur); cur = ""
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

// Map flexible CSV header names → our canonical column names
const COLUMN_ALIASES: Record<string, string> = {
  "company_name": "company_name",   "name": "company_name",   "business_name": "company_name",
  "trade_category": "trade_category","category": "trade_category","industry": "trade_category","trade": "trade_category",
  "address": "address",
  "postcode": "postcode",            "post_code": "postcode",  "zip": "postcode",
  "lat": "lat",                      "latitude": "lat",
  "lng": "lng",                      "lon": "lng",             "longitude": "lng",
  "email": "email",
  "phone": "phone",                  "telephone": "phone",     "mobile": "phone",
  "website": "website",              "website_url": "website", "url": "website",
}

function mapRow(raw: Record<string, string>) {
  const out: Record<string, string | number | null> = {}
  for (const [rawKey, val] of Object.entries(raw)) {
    const canonical = COLUMN_ALIASES[rawKey.toLowerCase()]
    if (canonical) out[canonical] = val || null
  }
  return out
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ["Overview", "CSV Import", "Email Export"] as const
type Tab = typeof TABS[number]

export function SeededTradesClient() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview")
  const [trades, setTrades]       = useState<SeededTrade[]>([])
  const [loading, setLoading]     = useState(true)
  const [search,  setSearch]      = useState("")

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/seeded-trades")
      if (res.ok) setTrades(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  const filtered = trades.filter(t =>
    !search ||
    t.company_name.toLowerCase().includes(search.toLowerCase()) ||
    t.trade_category?.toLowerCase().includes(search.toLowerCase()) ||
    t.postcode?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  )

  const total    = trades.length
  const claimed  = trades.filter(t => t.claimed).length
  const unclaimed = total - claimed
  const withEmail = trades.filter(t => t.email && !t.claimed).length

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview"    && <OverviewTab  trades={filtered} total={total} claimed={claimed} unclaimed={unclaimed} withEmail={withEmail} loading={loading} search={search} onSearch={setSearch} onRefresh={fetchTrades} />}
      {activeTab === "CSV Import"  && <CSVImportTab onImportDone={fetchTrades} />}
      {activeTab === "Email Export"&& <EmailExportTab />}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  trades, total, claimed, unclaimed, withEmail, loading, search, onSearch, onRefresh,
}: {
  trades: SeededTrade[]
  total: number; claimed: number; unclaimed: number; withEmail: number
  loading: boolean; search: string
  onSearch: (s: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",      value: total,     color: "text-zinc-100" },
          { label: "Claimed",    value: claimed,   color: "text-emerald-400" },
          { label: "Unclaimed",  value: unclaimed, color: "text-amber-400"   },
          { label: "With Email", value: withEmail, color: "text-blue-400"    },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search name, category, postcode…"
            className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
          />
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60">
                <th className="text-left px-4 py-2.5 text-zinc-500 font-medium w-48">Company</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Category</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Location</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Email</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Status</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Claim Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-zinc-600">Loading…</td></tr>
              ) : trades.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-zinc-600">No records found</td></tr>
              ) : trades.map(t => (
                <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-zinc-600 flex-shrink-0" />
                      <span className="text-zinc-200 font-medium truncate max-w-[160px]">{t.company_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-400 truncate max-w-[120px]">{t.trade_category ?? "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 text-zinc-400">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-[100px]">{t.postcode ?? t.address ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {t.email
                      ? <div className="flex items-center gap-1 text-zinc-400"><Mail className="h-3 w-3" /><span className="truncate max-w-[140px]">{t.email}</span></div>
                      : <span className="text-zinc-700">—</span>
                    }
                  </td>
                  <td className="px-3 py-3">
                    {t.claimed
                      ? <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" />Claimed</span>
                      : <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full"><XCircle className="h-3 w-3" />Unclaimed</span>
                    }
                  </td>
                  <td className="px-3 py-3">
                    {!t.claimed && t.claim_url && (
                      <CopyButton value={t.claim_url} label="Copy" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trades.length > 0 && (
          <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600">
            Showing {trades.length} rows
          </div>
        )}
      </div>
    </div>
  )
}

// ── CSV Import tab ────────────────────────────────────────────────────────────

const EXPECTED_COLS = ["company_name", "trade_category", "address", "postcode", "lat", "lng", "email", "phone", "website"]

function CSVImportTab({ onImportDone }: { onImportDone: () => void }) {
  const [csvText,    setCSVText]    = useState("")
  const [parsed,     setParsed]     = useState<Record<string, string | number | null>[]>([])
  const [parseError, setParseError] = useState("")
  const [importing,  setImporting]  = useState(false)
  const [result,     setResult]     = useState<{ inserted: number; skipped: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleParse = (text: string) => {
    setCSVText(text)
    setResult(null)
    setParseError("")
    if (!text.trim()) { setParsed([]); return }
    try {
      const rows = parseCSV(text).map(mapRow)
      const valid = rows.filter(r => r.company_name)
      if (valid.length === 0) { setParseError("No valid rows found — make sure 'company_name' column exists."); setParsed([]); return }
      setParsed(valid)
    } catch {
      setParseError("Failed to parse CSV. Check for formatting issues.")
      setParsed([])
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => handleParse(ev.target?.result as string ?? "")
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleImport = async () => {
    if (!parsed.length) return
    setImporting(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/seeded-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed }),
      })
      const data = await res.json()
      if (!res.ok) { setParseError(data.error ?? "Import failed"); return }
      setResult(data)
      setCSVText("")
      setParsed([])
      onImportDone()
    } finally {
      setImporting(false)
    }
  }

  const previewCols = parsed.length > 0
    ? EXPECTED_COLS.filter(c => parsed.some(r => r[c] != null && r[c] !== ""))
    : []

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Instructions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 space-y-1">
        <p className="text-zinc-300 font-medium mb-2">Supported CSV columns (header row required)</p>
        <p className="font-mono text-zinc-500">{EXPECTED_COLS.join(", ")}</p>
        <p className="text-zinc-600 mt-1">Only <span className="text-zinc-400 font-medium">company_name</span> is required. Missing columns are silently skipped. Duplicate rows (same name + postcode) are ignored.</p>
      </div>

      {/* File upload + paste area */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload CSV file
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          <span className="text-zinc-600 text-xs">or paste below</span>
        </div>
        <textarea
          value={csvText}
          onChange={e => handleParse(e.target.value)}
          placeholder={"company_name,trade_category,postcode,email\nAcme Plumbing,Plumber,PO1 1AA,info@acme.com"}
          rows={6}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder:text-zinc-700 font-mono outline-none focus:border-zinc-600 resize-y"
        />
      </div>

      {parseError && (
        <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{parseError}</p>
      )}

      {result && (
        <p className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
          ✓ Inserted {result.inserted} rows · {result.skipped} skipped (duplicates)
        </p>
      )}

      {/* Preview */}
      {parsed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Preview — <span className="text-zinc-200 font-medium">{parsed.length}</span> rows to import
              {parsed.length > 10 && <span className="text-zinc-600"> (showing first 10)</span>}
            </p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {importing ? (
                <><span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />Importing…</>
              ) : (
                <>Import {parsed.length} rows</>
              )}
            </button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60">
                    {previewCols.map(c => (
                      <th key={c} className="text-left px-3 py-2 text-zinc-500 font-medium whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/40">
                      {previewCols.map(c => (
                        <td key={c} className="px-3 py-2 text-zinc-400 truncate max-w-[180px]">
                          {row[c] != null ? String(row[c]) : <span className="text-zinc-700">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Email Export tab ──────────────────────────────────────────────────────────

function EmailExportTab() {
  const [rows,    setRows]    = useState<SeededTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)

  useEffect(() => {
    fetch("/api/admin/seeded-trades?filter=email")
      .then(r => r.json())
      .then(d => { setRows(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const copyCSV = () => {
    const header = "company_name,email,trade_category,claim_url"
    const body = rows.map(r =>
      [r.company_name, r.email ?? "", r.trade_category ?? "", r.claim_url ?? ""]
        .map(v => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    ).join("\n")
    navigator.clipboard.writeText(`${header}\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          Unclaimed businesses with an email address —{" "}
          <span className="text-zinc-200 font-medium">{loading ? "…" : rows.length}</span> rows
        </p>
        <button
          onClick={copyCSV}
          disabled={loading || rows.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors"
        >
          {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" />Copied!</> : <><Download className="h-3.5 w-3.5" />Copy all as CSV</>}
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60">
                <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">Company</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Email</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Category</th>
                <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Claim URL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-zinc-600">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-zinc-600">No unclaimed businesses with an email address</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-200 font-medium truncate max-w-[200px]">{r.company_name}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{r.email}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{r.trade_category ?? "—"}</td>
                  <td className="px-3 py-3">
                    {r.claim_url
                      ? <CopyButton value={r.claim_url} label="Copy link" />
                      : <span className="text-zinc-700 font-mono text-[10px]">/claim/{r.claim_token.slice(0, 8)}…</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Shared: copy-to-clipboard button ─────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap"
    >
      {copied ? <><Check className="h-3 w-3 text-emerald-400" />Copied</> : <><Copy className="h-3 w-3" />{label}</>}
    </button>
  )
}
