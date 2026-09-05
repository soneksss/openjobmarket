"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ShieldCheck, Loader2, ExternalLink, FileText, Check, X, RotateCcw, ChevronDown, ChevronRight,
} from "lucide-react"
import { VERIFICATION_LABELS, itemStatusLabel, itemStatusPill, type VerificationType } from "@/lib/verification"

type Item = {
  company_id: string
  type: VerificationType
  status: string
  verified_at: string | null
  expires_at: string | null
  evidence_reference: string | null
  rejection_reason: string | null
}

type Req = {
  id: string
  company_id: string
  status: string
  requested_at: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  admin_notes: string | null
  items: Item[]
  company: {
    id: string
    user_id: string
    company_name: string
    industry: string | null
    industries: string[] | null
    location: string | null
    business_type: string | null
    company_registration_number: string | null
    registered_address: string | null
    website_url: string | null
    google_maps_url: string | null
    facebook_url: string | null
    phone_number: string | null
    contact_email: string | null
    insurance_provider: string | null
    insurance_policy_type: string | null
    insurance_cover_amount: string | null
    insurance_expiry_date: string | null
    insurance_document_path: string | null
    average_rating: number | null
    reviews_count: number | null
  } | null
}

const FILTERS = ["pending", "all"] as const

export function AdminVerificationInterface() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending")
  const [requests, setRequests] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/verification?status=${filter}`, { credentials: "include" })
      const body = await res.json()
      setRequests(res.ok ? body.requests ?? [] : [])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize ${
              filter === f ? "bg-emerald-500 border-emerald-500 text-white" : "bg-transparent border-slate-300 text-slate-600"
            }`}
          >
            {f === "all" ? "All" : "Pending review"}
          </button>
        ))}
        <button onClick={load} className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 inline-flex items-center gap-1.5">
          <RotateCcw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">No {filter === "pending" ? "pending " : ""}verification requests.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <RequestRow
              key={r.id}
              req={r}
              open={openId === r.id}
              onToggle={() => setOpenId(openId === r.id ? null : r.id)}
              onReviewed={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestRow({ req, open, onToggle, onReviewed }: { req: Req; open: boolean; onToggle: () => void; onReviewed: () => void }) {
  const c = req.company
  const [busy, setBusy] = useState<string | null>(null)
  const [expiry, setExpiry] = useState<Record<string, string>>({})
  const [reason, setReason] = useState<Record<string, string>>({})
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? "")
  const [rejectionReason, setRejectionReason] = useState(req.rejection_reason ?? "")
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  const reviewableTypes: VerificationType[] = (() => {
    const t: VerificationType[] = ["business"]
    if (c?.business_type === "limited_company" && c?.company_registration_number) t.push("company_registration")
    if (c?.insurance_document_path || c?.insurance_provider) t.push("insurance")
    // include any type that already has an item row
    for (const it of req.items) if (!t.includes(it.type)) t.push(it.type)
    return t
  })()

  const itemFor = (type: VerificationType) => req.items.find((i) => i.type === type)

  const decide = async (type: VerificationType, decision: "approve" | "reject" | "revoke") => {
    setBusy(`${type}:${decision}`)
    try {
      const res = await fetch("/api/admin/verification/review", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: req.company_id,
          decisions: [{
            type,
            decision,
            expiresAt: type === "insurance" ? (expiry[type] || c?.insurance_expiry_date || null) : null,
            reason: decision === "reject" ? (reason[type] || null) : null,
            evidence:
              type === "company_registration" && c?.company_registration_number
                ? `companies_house:${c.company_registration_number}`
                : type === "insurance" && c?.insurance_document_path
                  ? c.insurance_document_path
                  : null,
          }],
          adminNotes,
          rejectionReason,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        alert(`Failed: ${b.error ?? res.status}`)
      } else {
        onReviewed()
      }
    } finally {
      setBusy(null)
    }
  }

  const viewDoc = async () => {
    setLoadingDoc(true)
    try {
      const res = await fetch(`/api/company/insurance-document?companyId=${req.company_id}`, { credentials: "include" })
      const b = await res.json()
      if (res.ok && b.url) { setDocUrl(b.url); window.open(b.url, "_blank") }
      else alert(b.error ?? "Could not load document")
    } finally {
      setLoadingDoc(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{c?.company_name ?? "(profile missing)"}</p>
          <p className="text-xs text-slate-500 truncate">
            {c?.industry ?? "—"} · {c?.location ?? "—"} · {c?.business_type ?? "no business type"}
          </p>
        </div>
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${itemStatusPill(req.status as any)}`}>
          {req.status.replace("_", " ")}
        </span>
        <span className="text-xs text-slate-400 hidden sm:block">
          {req.requested_at ? new Date(req.requested_at).toLocaleDateString("en-GB") : ""}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          {/* Submitted info */}
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <Info label="Company / profile ID" value={req.company_id} mono />
            <Info label="Owner user ID" value={c?.user_id ?? "—"} mono />
            <Info label="Business type" value={c?.business_type ?? "—"} />
            <Info label="Registration number" value={c?.company_registration_number ?? "—"} />
            <Info label="Registered address" value={c?.registered_address ?? "—"} />
            <Info label="Trading location" value={c?.location ?? "—"} />
            <Info label="Phone" value={c?.phone_number ?? "—"} />
            <Info label="Email" value={c?.contact_email ?? "—"} />
            <Info label="Rating" value={c ? `${(c.average_rating ?? 0).toFixed(1)} (${c.reviews_count ?? 0})` : "—"} />
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-2">
            {c?.website_url && <LinkChip href={c.website_url} label="Website" />}
            {c?.google_maps_url && <LinkChip href={c.google_maps_url} label="Google" />}
            {c?.facebook_url && <LinkChip href={c.facebook_url} label="Facebook" />}
            <a href={`/companies/${req.company_id}`} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 px-2 py-1 rounded">
              <ExternalLink className="h-3 w-3" /> Public profile
            </a>
          </div>

          {/* Insurance evidence */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
            <p className="font-semibold text-slate-700">Insurance (self-declared)</p>
            <p>Provider: {c?.insurance_provider ?? "—"} · Policy: {c?.insurance_policy_type ?? "—"} · Cover: {c?.insurance_cover_amount ?? "—"}</p>
            <p>Stated expiry: {c?.insurance_expiry_date ?? "—"}</p>
            {c?.insurance_document_path ? (
              <button onClick={viewDoc} disabled={loadingDoc}
                className="mt-1 inline-flex items-center gap-1.5 text-emerald-700 font-medium hover:underline disabled:opacity-50">
                {loadingDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                {docUrl ? "Re-open certificate" : "View certificate (private)"}
              </button>
            ) : <p className="text-slate-400">No certificate uploaded.</p>}
          </div>

          {/* Per-category decisions */}
          <div className="space-y-2">
            {reviewableTypes.map((type) => {
              const it = itemFor(type)
              return (
                <div key={type} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{VERIFICATION_LABELS[type]}</p>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${itemStatusPill((it?.status ?? "not_verified") as any)}`}>
                      {itemStatusLabel((it?.status ?? "not_verified") as any)}
                    </span>
                  </div>
                  {type === "insurance" && (
                    <div className="mt-2">
                      <label className="text-[11px] text-slate-500">Verified cover expiry</label>
                      <input
                        type="date"
                        value={expiry[type] ?? (c?.insurance_expiry_date ?? "")}
                        onChange={(e) => setExpiry((p) => ({ ...p, [type]: e.target.value }))}
                        className="ml-2 text-xs border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                  )}
                  <input
                    placeholder="Rejection reason (shown to the tradesperson if you reject this item)"
                    value={reason[type] ?? ""}
                    onChange={(e) => setReason((p) => ({ ...p, [type]: e.target.value }))}
                    className="mt-2 w-full text-xs border border-slate-300 rounded px-2 py-1"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => decide(type, "approve")} disabled={!!busy}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded disabled:opacity-50">
                      {busy === `${type}:approve` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve
                    </button>
                    <button onClick={() => decide(type, "reject")} disabled={!!busy}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded disabled:opacity-50">
                      {busy === `${type}:reject` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} Reject
                    </button>
                    {it?.status === "verified" && (
                      <button onClick={() => decide(type, "revoke")} disabled={!!busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded disabled:opacity-50">
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Internal notes / tradesperson-facing message */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Internal admin notes (never public)</label>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2}
                className="mt-1 w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Message to tradesperson (on rejection)</label>
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2}
                className="mt-1 w-full text-xs border border-slate-300 rounded px-2 py-1.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400">{label}:</span>
      <span className={`text-slate-700 ${mono ? "font-mono text-[11px]" : ""} truncate`}>{value}</span>
    </div>
  )
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a href={href.startsWith("http") ? href : `https://${href}`} target="_blank" rel="noreferrer"
       className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 border border-slate-200 bg-slate-50 px-2 py-1 rounded">
      <ExternalLink className="h-3 w-3" /> {label}
    </a>
  )
}
