import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check if caller passed pre-filled form data via ?d=<encoded JSON>
  const dParam = req.nextUrl.searchParams.get("d")
  let formData: Record<string, string> | null = null
  if (dParam) {
    try { formData = JSON.parse(decodeURIComponent(dParam)) } catch {}
  }

  // Verify homeowner owns this job
  const { data: hp } = await supabase
    .from("homeowner_profiles")
    .select("id, first_name, last_name, location")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!hp) return NextResponse.json({ error: "Not a homeowner" }, { status: 403 })

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description, location, budget_min, budget_max, budget_period, confirmed_tradesperson_id, accepted_contractor_id")
    .eq("id", jobId)
    .eq("homeowner_id", hp.id)
    .maybeSingle()

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  // Fetch confirmed tradesperson (company_profiles)
  const tradespersonProfileId = job.confirmed_tradesperson_id ?? job.accepted_contractor_id
  let tradespersonName = ""
  let tradespersonLocation = ""
  if (tradespersonProfileId) {
    const { data: cp } = await supabase
      .from("company_profiles")
      .select("company_name, location")
      .eq("id", tradespersonProfileId)
      .maybeSingle()
    if (cp) {
      tradespersonName = cp.company_name ?? ""
      tradespersonLocation = cp.location ?? ""
    }
  }

  // Use form data overrides if provided, otherwise fall back to DB values
  const f = formData ?? {}
  const homeownerName = f.homeownerName ?? `${hp.first_name ?? ""} ${hp.last_name ?? ""}`.trim()
  const homeownerAddress = f.homeownerAddress ?? (hp.location ?? "")
  const tName = f.tradespersonName ?? tradespersonName
  const tAddress = f.tradespersonAddress ?? tradespersonLocation
  const jobTitle = f.jobTitle ?? job.title
  const jobAddress = f.jobAddress ?? (job.location ?? "")
  const jobDescription = f.jobDescription ?? (job.description ?? "")
  const agreementDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  })

  const budgetDisplay = f.agreedPrice ?? (
    job.budget_min && job.budget_max
      ? `£${job.budget_min.toLocaleString()} – £${job.budget_max.toLocaleString()}`
      : job.budget_min ? `From £${job.budget_min.toLocaleString()}`
      : job.budget_max ? `Up to £${job.budget_max.toLocaleString()}`
      : ""
  )

  const paymentType = f.paymentType ?? formatBudgetPeriod(job.budget_period)
  const depositAmount = f.depositAmount ?? ""
  const paymentDue = f.paymentDue ?? ""
  const paymentMethod = f.paymentMethod ?? ""
  const startDate = f.startDate ?? ""
  const completionDate = f.completionDate ?? ""
  const materialsSupplier = f.materialsSupplier ?? ""
  const materialsNotes = f.materialsNotes ?? ""
  const additionalNotes = f.additionalNotes ?? ""

  const blank = `<span style="display:inline-block;min-width:180px;border-bottom:1px solid #555;">&nbsp;</span>`
  const val = (v: string) => escapeHtml(v) || blank

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Work Agreement – ${escapeHtml(jobTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 22mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #111;
      background: #fff;
    }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 18px; }
    .header h1 { font-size: 20pt; letter-spacing: 1px; text-transform: uppercase; }
    .header .meta { font-size: 9pt; color: #555; margin-top: 3px; }
    .notice { background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; padding: 8px 12px; font-size: 9pt; color: #444; margin-bottom: 18px; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #aaa; padding-bottom: 4px; margin-bottom: 10px; color: #333; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
    .field { margin-bottom: 8px; }
    .field-label { font-size: 8.5pt; color: #666; margin-bottom: 2px; }
    .field-value {
      border-bottom: 1px solid #888;
      min-height: 20px;
      font-size: 10.5pt;
      padding: 2px 2px 1px;
    }
    .field-value.multiline {
      border: 1px solid #aaa;
      border-radius: 3px;
      padding: 6px 8px;
      min-height: 60px;
      white-space: pre-wrap;
    }
    .terms-list { list-style: disc; padding-left: 18px; font-size: 9.5pt; color: #333; }
    .terms-list li { margin-bottom: 4px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
    .sig-box { padding-top: 6px; }
    .sig-line { border-top: 1px solid #333; margin-bottom: 4px; min-height: 40px; }
    .sig-label { font-size: 8.5pt; color: #555; }
    .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 8pt; color: #999; text-align: center; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    .print-btn {
      position: fixed; top: 12px; right: 12px;
      background: #1a1a1a; color: #fff; border: none;
      padding: 8px 16px; border-radius: 6px; font-size: 10pt;
      cursor: pointer; font-family: Arial, sans-serif;
    }
    .print-btn:hover { background: #333; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨 Print / Save PDF</button>

  <div class="header">
    <h1>Work Agreement</h1>
    <div class="meta">OpenJobMarket &nbsp;·&nbsp; Generated ${escapeHtml(agreementDate)}</div>
  </div>

  <div class="notice">
    This is a simple written record of the agreed job details. Both parties should review, sign, and keep a copy.
    Fields marked with blank lines can be completed by hand if the information is not available.
  </div>

  <!-- PARTIES -->
  <div class="section">
    <div class="section-title">1. Parties</div>
    <div class="grid-2">
      <div>
        <div class="field">
          <div class="field-label">Homeowner (Client)</div>
          <div class="field-value">${val(homeownerName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Address / Location</div>
          <div class="field-value">${val(homeownerAddress)}</div>
        </div>
      </div>
      <div>
        <div class="field">
          <div class="field-label">Tradesperson / Company</div>
          <div class="field-value">${val(tName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Address / Location</div>
          <div class="field-value">${val(tAddress)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- JOB DETAILS -->
  <div class="section">
    <div class="section-title">2. Job Details</div>
    <div class="field">
      <div class="field-label">Job Title</div>
      <div class="field-value">${val(jobTitle)}</div>
    </div>
    <div class="field">
      <div class="field-label">Job Address (if different from homeowner address)</div>
      <div class="field-value">${val(jobAddress)}</div>
    </div>
    <div class="field">
      <div class="field-label">Scope of Work / Description</div>
      <div class="field-value multiline">${escapeHtml(jobDescription)}</div>
    </div>
  </div>

  <!-- FINANCIAL TERMS -->
  <div class="section">
    <div class="section-title">3. Financial Terms</div>
    <div class="grid-2">
      <div class="field">
        <div class="field-label">Agreed Price</div>
        <div class="field-value">${val(budgetDisplay)}</div>
      </div>
      <div class="field">
        <div class="field-label">Payment Type</div>
        <div class="field-value">${val(paymentType)}</div>
      </div>
      <div class="field">
        <div class="field-label">Deposit Amount (if any)</div>
        <div class="field-value">${val(depositAmount)}</div>
      </div>
      <div class="field">
        <div class="field-label">Payment Due</div>
        <div class="field-value">${val(paymentDue)}</div>
      </div>
    </div>
    <div class="field" style="margin-top:4px">
      <div class="field-label">Payment Method</div>
      <div class="field-value">${val(paymentMethod)}</div>
    </div>
  </div>

  <!-- SCHEDULE -->
  <div class="section">
    <div class="section-title">4. Schedule</div>
    <div class="grid-2">
      <div class="field">
        <div class="field-label">Expected Start Date</div>
        <div class="field-value">${val(startDate)}</div>
      </div>
      <div class="field">
        <div class="field-label">Expected Completion Date</div>
        <div class="field-value">${val(completionDate)}</div>
      </div>
    </div>
  </div>

  <!-- MATERIALS -->
  <div class="section">
    <div class="section-title">5. Materials &amp; Supplies</div>
    <div class="field">
      <div class="field-label">Who supplies materials?</div>
      <div class="field-value">${val(materialsSupplier)}</div>
    </div>
    <div class="field">
      <div class="field-label">Notes on materials / brands</div>
      <div class="field-value multiline" style="min-height:36px">${escapeHtml(materialsNotes)}</div>
    </div>
  </div>

  <!-- STANDARD TERMS -->
  <div class="section">
    <div class="section-title">6. Standard Terms</div>
    <ul class="terms-list">
      <li>All work will be carried out in a professional and workmanlike manner.</li>
      <li>Any changes to scope, price, or timeline must be agreed in writing by both parties.</li>
      <li>The tradesperson will keep the work area clean and remove waste on completion.</li>
      <li>Disputes should first be attempted to be resolved between the parties directly.</li>
      <li>This agreement does not affect any statutory rights of either party.</li>
    </ul>
  </div>

  <!-- ADDITIONAL NOTES -->
  <div class="section">
    <div class="section-title">7. Additional Notes</div>
    <div class="field-value multiline" style="min-height:48px">${escapeHtml(additionalNotes)}</div>
  </div>

  <!-- SIGNATURES -->
  <div class="section">
    <div class="section-title">8. Signatures</div>
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Homeowner signature</div>
        <div style="margin-top:10px">
          <div class="field-label">Print name</div>
          <div class="field-value">${val(homeownerName)}</div>
        </div>
        <div style="margin-top:8px">
          <div class="field-label">Date signed</div>
          <div class="field-value">${blank}</div>
        </div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Tradesperson / Company signature</div>
        <div style="margin-top:10px">
          <div class="field-label">Print name</div>
          <div class="field-value">${val(tName)}</div>
        </div>
        <div style="margin-top:8px">
          <div class="field-label">Date signed</div>
          <div class="field-value">${blank}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    OpenJobMarket · This document was generated to assist both parties. It is not legal advice.
    For complex or high-value work, consider consulting a solicitor.
  </div>

  <script>
    // Auto-open print dialog when loaded in new tab
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="agreement-${jobId}.html"`,
      "Cache-Control": "no-store",
    },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatBudgetPeriod(period?: string | null): string {
  if (!period) return ""
  const map: Record<string, string> = {
    per_job: "Fixed price (per job)",
    one_time: "Fixed price (one-time)",
    per_hour: "Hourly rate",
    per_day: "Daily rate",
  }
  return map[period] ?? period
}
