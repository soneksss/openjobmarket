import { createClient, createAdminClient } from "@/lib/server"
import { isAdmin } from "@/lib/admin-auth"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const BUCKET = "insurance-documents"
const ALLOWED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
const MAX_BYTES = 5 * 1024 * 1024

/**
 * POST /api/company/insurance-document  (multipart/form-data, field "file")
 *
 * Uploads the caller's insurance certificate through the service-role client so
 * it never depends on the storage RLS policy being present in this environment
 * (a missing policy is what produced "new row violates row-level security
 * policy" on the old direct client upload). The file is still stored under the
 * caller's own {auth.uid()}/ prefix and the bucket stays private.
 *
 * Returns { path } — the caller saves it to company_profiles.insurance_document_path.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Please upload a PDF, JPG or PNG." }, { status: 415 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Max 5MB." }, { status: 413 })
    }

    const admin = createAdminClient()

    // Belt-and-braces: make sure the private bucket exists.
    try {
      const { data: bucket } = await admin.storage.getBucket(BUCKET)
      if (!bucket) {
        await admin.storage.createBucket(BUCKET, {
          public: false,
          fileSizeLimit: MAX_BYTES,
          allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
        })
      }
    } catch { /* getBucket/createBucket best-effort — upload will report the real error */ }

    const ext = file.name.split(".").pop()?.toLowerCase()
      || (file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg")
    const path = `${user.id}/certificate-${Date.now()}.${ext}`

    const bytes = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: true })

    if (upErr) {
      console.error("[INSURANCE-DOCUMENT] upload error:", upErr.message)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    // Remove any previous certificate for this user (best-effort).
    try {
      const { data: existing } = await admin.storage.from(BUCKET).list(user.id)
      const stale = (existing ?? [])
        .map((f) => `${user.id}/${f.name}`)
        .filter((p) => p !== path)
      if (stale.length) await admin.storage.from(BUCKET).remove(stale)
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, path })
  } catch (err: any) {
    console.error("[INSURANCE-DOCUMENT] POST unexpected error:", err)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}

// GET /api/company/insurance-document?companyId=<id>
// Returns a short-lived signed URL to the caller's own insurance
// certificate, or (with ?companyId=) an admin can view any company's.
// The storage bucket has no read policy at all — this route is the only
// way to reach the file, gated by an owner-or-admin check.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const companyId = request.nextUrl.searchParams.get("companyId")

    const admin = createAdminClient()

    const { data: profile, error: profileError } = await (companyId
      ? admin.from("company_profiles").select("user_id, insurance_document_path").eq("id", companyId).maybeSingle()
      : admin.from("company_profiles").select("user_id, insurance_document_path").eq("user_id", user.id).maybeSingle())

    if (profileError || !profile) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
    }

    const isOwner = profile.user_id === user.id
    if (!isOwner && !(await isAdmin())) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    if (!profile.insurance_document_path) {
      return NextResponse.json({ error: "No insurance document on file" }, { status: 404 })
    }

    const { data: signed, error: signError } = await admin.storage
      .from("insurance-documents")
      .createSignedUrl(profile.insurance_document_path, 60)

    if (signError || !signed) {
      console.error("[INSURANCE-DOCUMENT] Signed URL error:", signError?.message)
      return NextResponse.json({ error: "Could not generate document link" }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: signed.signedUrl })
  } catch (error: any) {
    console.error("[INSURANCE-DOCUMENT] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
