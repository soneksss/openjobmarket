"use client"

import { useState, useEffect, useRef } from "react"
import { X, Printer, Save } from "lucide-react"

interface AgreementEditorModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  defaults: {
    homeownerName?: string
    homeownerAddress?: string
    tradespersonName?: string
    tradespersonAddress?: string
    jobTitle?: string
    jobAddress?: string
    jobDescription?: string
    agreedPrice?: string
    paymentType?: string
  }
  onSaved?: () => void
}

const STORAGE_KEY = (jobId: string) => `ojm_agreement_${jobId}`

export function loadSavedAgreement(jobId: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(jobId))
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function saveAgreement(jobId: string, data: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY(jobId), JSON.stringify(data)) } catch {}
}

// A4 dimensions at 96 dpi
const A4_W = 794
const A4_MIN_H = 1123

function DocField({
  value, onChange, placeholder, multiline, minRows = 2,
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; minRows?: number
}) {
  const shared: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    fontSize: "10.5pt",
    color: "#111",
    border: "none",
    borderBottom: "1px dashed #aaa",
    outline: "none",
    padding: "1px 2px",
    fontFamily: "Arial, Helvetica, sans-serif",
    lineHeight: 1.5,
  }
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Click to fill in…"}
        rows={minRows}
        style={{
          ...shared,
          border: "1px dashed #aaa",
          borderRadius: 3,
          padding: "4px 6px",
          resize: "vertical",
          display: "block",
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "rgba(59,130,246,0.04)" }}
        onBlur={e =>  { e.currentTarget.style.borderColor = "#aaa";    e.currentTarget.style.background = "transparent" }}
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? "Click to fill in…"}
      style={shared}
      onFocus={e => { e.currentTarget.style.borderBottomColor = "#3b82f6"; e.currentTarget.style.background = "rgba(59,130,246,0.04)" }}
      onBlur={e =>  { e.currentTarget.style.borderBottomColor = "#aaa";    e.currentTarget.style.background = "transparent" }}
    />
  )
}

function DocSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: "9pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "1px solid #aaa", paddingBottom: 4, marginBottom: 10, color: "#333" }}>
        {number}. <span dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      {children}
    </div>
  )
}

function DocRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: "8.5pt", color: "#666", marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  )
}

export function AgreementEditorModal({ isOpen, onClose, jobId, defaults, onSaved }: AgreementEditorModalProps) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [scale, setScale] = useState(1)
  const viewerRef = useRef<HTMLDivElement>(null)
  // height of the scaled A4 page (updated after render via ref)
  const pageRef = useRef<HTMLDivElement>(null)
  const [pageH, setPageH] = useState(A4_MIN_H)

  // Compute scale from container width
  useEffect(() => {
    if (!isOpen) return
    const update = () => {
      const el = viewerRef.current
      if (!el) return
      const available = el.clientWidth - 32 // 16px padding each side
      const s = Math.min(1, available / A4_W)
      setScale(s)
    }
    update()
    const ro = new ResizeObserver(update)
    if (viewerRef.current) ro.observe(viewerRef.current)
    return () => ro.disconnect()
  }, [isOpen])

  // Track actual rendered page height (content may be taller than A4_MIN_H)
  useEffect(() => {
    if (!pageRef.current) return
    const ro = new ResizeObserver(() => {
      if (pageRef.current) setPageH(pageRef.current.scrollHeight)
    })
    ro.observe(pageRef.current)
    return () => ro.disconnect()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const existing = loadSavedAgreement(jobId)
    if (existing) { setForm(existing); setSaved(true) }
    else {
      setForm({
        homeownerName:       defaults.homeownerName       ?? "",
        homeownerAddress:    defaults.homeownerAddress    ?? "",
        tradespersonName:    defaults.tradespersonName    ?? "",
        tradespersonAddress: defaults.tradespersonAddress ?? "",
        jobTitle:            defaults.jobTitle            ?? "",
        jobAddress:          defaults.jobAddress          ?? "",
        jobDescription:      defaults.jobDescription      ?? "",
        agreedPrice:         defaults.agreedPrice         ?? "",
        paymentType:         defaults.paymentType         ?? "",
        depositAmount: "", paymentDue: "", paymentMethod: "",
        startDate: "", completionDate: "",
        materialsSupplier: "", materialsNotes: "", additionalNotes: "",
      })
      setSaved(false)
    }
  }, [isOpen, jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const set = (name: string) => (v: string) => { setForm(p => ({ ...p, [name]: v })); setSaved(false) }

  const handleSave = () => { saveAgreement(jobId, form); setSaved(true); onSaved?.() }
  const handlePrint = () => {
    const encoded = encodeURIComponent(JSON.stringify(form))
    window.open(`/api/jobs/${jobId}/agreement-pdf?d=${encoded}`, "_blank", "noopener")
  }

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  // Spacer that occupies the post-scale layout space so the scrollable area is correct
  const spacerH = pageH * scale

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", background: "#374151", overflow: "hidden" }}>

      {/* ── Toolbar ── always at top, never hidden */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#1f2937", borderBottom: "1px solid #4b5563", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Work Agreement
          {defaults.jobTitle && <span style={{ color: "#9ca3af", fontWeight: 400 }}> — {defaults.jobTitle}</span>}
        </span>

        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: saved ? "#16a34a" : "#2563eb", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <Save size={15} />
          {saved ? "Saved ✓" : "Save"}
        </button>

        <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#fff", color: "#111", border: "none", cursor: "pointer", flexShrink: 0 }}>
          <Printer size={15} />
          Print / PDF
        </button>

        <button onClick={onClose} aria-label="Close" style={{ padding: 8, borderRadius: 8, background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", flexShrink: 0 }}>
          <X size={17} />
        </button>
      </div>

      {/* ── Document viewer — scroll container ── */}
      <div
        ref={viewerRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 16px 32px" }}
      >
        {/*
          Spacer div: tells the scroll container the correct height after scaling.
          The A4 page is position:absolute inside so it doesn't affect flow.
        */}
        <div style={{ position: "relative", width: A4_W * scale, height: spacerH, margin: "0 auto" }}>
          {/* A4 white page — scaled from top-left corner */}
          <div
            ref={pageRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: A4_W,
              minHeight: A4_MIN_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              background: "#fff",
              boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
              padding: "48px 56px",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "10.5pt",
              lineHeight: 1.55,
              color: "#111",
              boxSizing: "border-box",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "2px solid #111", paddingBottom: 10, marginBottom: 18 }}>
              <div style={{ fontSize: "20pt", fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" }}>Work Agreement</div>
              <div style={{ fontSize: "9pt", color: "#555", marginTop: 3 }}>OpenJobMarket &nbsp;·&nbsp; Generated {today}</div>
            </div>

            {/* Notice */}
            <div style={{ background: "#f5f5f5", border: "1px solid #ccc", borderRadius: 4, padding: "8px 12px", fontSize: "9pt", color: "#444", marginBottom: 18 }}>
              This is a simple written record of the agreed job details. Both parties should review, sign, and keep a copy.
              Tap any field to edit it before printing. Pinch to zoom in.
            </div>

            {/* 1. Parties */}
            <DocSection number="1" title="Parties">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px" }}>
                <DocRow label="Homeowner (Client)"><DocField value={form.homeownerName ?? ""} onChange={set("homeownerName")} /></DocRow>
                <DocRow label="Tradesperson / Company"><DocField value={form.tradespersonName ?? ""} onChange={set("tradespersonName")} /></DocRow>
                <DocRow label="Homeowner Address / Location"><DocField value={form.homeownerAddress ?? ""} onChange={set("homeownerAddress")} /></DocRow>
                <DocRow label="Tradesperson Address / Location"><DocField value={form.tradespersonAddress ?? ""} onChange={set("tradespersonAddress")} /></DocRow>
              </div>
            </DocSection>

            {/* 2. Job Details */}
            <DocSection number="2" title="Job Details">
              <DocRow label="Job Title"><DocField value={form.jobTitle ?? ""} onChange={set("jobTitle")} /></DocRow>
              <div style={{ marginTop: 8 }}>
                <DocRow label="Job Address (if different from homeowner address)"><DocField value={form.jobAddress ?? ""} onChange={set("jobAddress")} /></DocRow>
              </div>
              <div style={{ marginTop: 8 }}>
                <DocRow label="Scope of Work / Description"><DocField value={form.jobDescription ?? ""} onChange={set("jobDescription")} multiline minRows={3} /></DocRow>
              </div>
            </DocSection>

            {/* 3. Financial Terms */}
            <DocSection number="3" title="Financial Terms">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px" }}>
                <DocRow label="Agreed Price"><DocField value={form.agreedPrice ?? ""} onChange={set("agreedPrice")} placeholder="e.g. £1,200" /></DocRow>
                <DocRow label="Payment Type"><DocField value={form.paymentType ?? ""} onChange={set("paymentType")} placeholder="e.g. Fixed price" /></DocRow>
                <DocRow label="Deposit Amount (if any)"><DocField value={form.depositAmount ?? ""} onChange={set("depositAmount")} placeholder="e.g. £300" /></DocRow>
                <DocRow label="Payment Due"><DocField value={form.paymentDue ?? ""} onChange={set("paymentDue")} placeholder="e.g. On completion" /></DocRow>
              </div>
              <div style={{ marginTop: 8 }}>
                <DocRow label="Payment Method"><DocField value={form.paymentMethod ?? ""} onChange={set("paymentMethod")} placeholder="e.g. Bank transfer" /></DocRow>
              </div>
            </DocSection>

            {/* 4. Schedule */}
            <DocSection number="4" title="Schedule">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px" }}>
                <DocRow label="Expected Start Date"><DocField value={form.startDate ?? ""} onChange={set("startDate")} placeholder="e.g. 15 April 2026" /></DocRow>
                <DocRow label="Expected Completion Date"><DocField value={form.completionDate ?? ""} onChange={set("completionDate")} placeholder="e.g. 20 April 2026" /></DocRow>
              </div>
            </DocSection>

            {/* 5. Materials */}
            <DocSection number="5" title="Materials &amp; Supplies">
              <DocRow label="Who supplies materials?"><DocField value={form.materialsSupplier ?? ""} onChange={set("materialsSupplier")} placeholder="e.g. Tradesperson / Homeowner / Both" /></DocRow>
              <div style={{ marginTop: 8 }}>
                <DocRow label="Notes on materials / brands"><DocField value={form.materialsNotes ?? ""} onChange={set("materialsNotes")} multiline minRows={2} placeholder="Any specific requirements..." /></DocRow>
              </div>
            </DocSection>

            {/* 6. Standard Terms */}
            <DocSection number="6" title="Standard Terms">
              <ul style={{ listStyleType: "disc", paddingLeft: 18, fontSize: "9.5pt", color: "#333" }}>
                {["All work will be carried out in a professional and workmanlike manner.",
                  "Any changes to scope, price, or timeline must be agreed in writing by both parties.",
                  "The tradesperson will keep the work area clean and remove waste on completion.",
                  "Disputes should first be attempted to be resolved between the parties directly.",
                  "This agreement does not affect any statutory rights of either party.",
                ].map(t => <li key={t} style={{ marginBottom: 4 }}>{t}</li>)}
              </ul>
            </DocSection>

            {/* 7. Additional Notes */}
            <DocSection number="7" title="Additional Notes">
              <DocField value={form.additionalNotes ?? ""} onChange={set("additionalNotes")} multiline minRows={3} placeholder="Any other agreed details..." />
            </DocSection>

            {/* 8. Signatures */}
            <DocSection number="8" title="Signatures">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 48px", marginTop: 24 }}>
                {[
                  { role: "Homeowner signature", name: form.homeownerName ?? "" },
                  { role: "Tradesperson / Company signature", name: form.tradespersonName ?? "" },
                ].map(({ role, name }) => (
                  <div key={role}>
                    <div style={{ borderTop: "1px solid #333", marginBottom: 4, minHeight: 40 }} />
                    <div style={{ fontSize: "8.5pt", color: "#555" }}>{role}</div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: "8.5pt", color: "#666", marginBottom: 2 }}>Print name</div>
                      <div style={{ borderBottom: "1px solid #888", minHeight: 20, fontSize: "10.5pt", padding: "2px 2px 1px" }}>
                        {name || <span style={{ color: "#aaa" }}>&nbsp;</span>}
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: "8.5pt", color: "#666", marginBottom: 2 }}>Date signed</div>
                      <div style={{ borderBottom: "1px solid #888", minHeight: 20 }} />
                    </div>
                  </div>
                ))}
              </div>
            </DocSection>

            {/* Footer */}
            <div style={{ marginTop: 28, borderTop: "1px solid #ccc", paddingTop: 8, fontSize: "8pt", color: "#999", textAlign: "center" }}>
              OpenJobMarket · This document was generated to assist both parties. It is not legal advice.
              For complex or high-value work, consider consulting a solicitor.
            </div>
          </div>{/* /A4 page */}
        </div>{/* /spacer */}
      </div>{/* /viewer */}
    </div>
  )
}
