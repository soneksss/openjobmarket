import { createClient, createAdminClient } from "@/lib/server"
import { isAdmin } from "@/lib/admin-auth"
import { NextRequest, NextResponse } from "next/server"

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
