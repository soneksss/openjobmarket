import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

// Force Node.js runtime
export const runtime = 'nodejs'

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

/**
 * POST /api/cv/upload
 * Uploads a CV file to Supabase Storage
 *
 * FormData:
 * - file: File (PDF, DOC, DOCX, max 10MB)
 * - professionalId: string
 *
 * Returns: { success: boolean, filePath: string, fileData: object }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[CV-UPLOAD] Processing file upload request...")

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[CV-UPLOAD] Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const professionalId = formData.get('professionalId') as string | null

    console.log("[CV-UPLOAD] Request details:", {
      userId: user.id,
      professionalId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
    })

    // Validate inputs
    if (!file || !professionalId) {
      console.log("[CV-UPLOAD] Missing file or professionalId")
      return NextResponse.json(
        { error: "Missing required fields: file and professionalId" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      console.log("[CV-UPLOAD] Invalid file type:", file.type)
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, DOC, or DOCX." },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log("[CV-UPLOAD] File too large:", file.size)
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 }
      )
    }

    // Verify professional profile belongs to user
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, user_id, cv_consent_given, cv_source')
      .eq('id', professionalId)
      .single()

    if (profileError || !profile) {
      console.error("[CV-UPLOAD] Professional profile not found:", profileError)
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      )
    }

    if (profile.user_id !== user.id) {
      console.log("[CV-UPLOAD] User does not own this profile")
      return NextResponse.json(
        { error: "Unauthorized: You do not own this profile" },
        { status: 403 }
      )
    }

    // Check consent
    if (!profile.cv_consent_given) {
      console.log("[CV-UPLOAD] Consent not given")
      return NextResponse.json(
        { error: "CV consent required before uploading" },
        { status: 403 }
      )
    }

    // Delete existing builder CV if switching from builder to upload
    if (profile.cv_source === 'builder') {
      console.log("[CV-UPLOAD] Deleting existing builder CV...")
      const { error: deleteBuilderError } = await supabase
        .from('professional_cvs')
        .delete()
        .eq('professional_id', professionalId)

      if (deleteBuilderError) {
        console.error("[CV-UPLOAD] Error deleting builder CV:", deleteBuilderError)
        // Continue anyway - not critical
      }
    }

    // Delete existing uploaded file if exists
    if (profile.cv_source === 'upload') {
      console.log("[CV-UPLOAD] Deleting existing uploaded file...")
      const { error: deleteFileError } = await supabase.storage
        .from('cv-documents')
        .remove([`${user.id}/cv.pdf`, `${user.id}/cv.doc`, `${user.id}/cv.docx`])

      if (deleteFileError) {
        console.error("[CV-UPLOAD] Error deleting old file:", deleteFileError)
        // Continue anyway
      }
    }

    // Determine file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const filePath = `${user.id}/cv.${fileExtension}`

    console.log("[CV-UPLOAD] Uploading to storage:", filePath)

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cv-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      })

    if (uploadError) {
      console.error("[CV-UPLOAD] Storage upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload file. Please try again." },
        { status: 500 }
      )
    }

    // Update professional_profiles with file metadata
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update({
        cv_source: 'upload',
        cv_uploaded_file_path: uploadData.path,
        cv_uploaded_file_name: file.name,
        cv_uploaded_file_size: file.size,
        cv_uploaded_file_type: file.type,
        cv_uploaded_at: new Date().toISOString(),
      })
      .eq('id', professionalId)

    if (updateError) {
      console.error("[CV-UPLOAD] Error updating profile:", updateError)
      // Try to clean up uploaded file
      await supabase.storage.from('cv-documents').remove([filePath])
      return NextResponse.json(
        { error: "Failed to save file metadata. Please try again." },
        { status: 500 }
      )
    }

    console.log("[CV-UPLOAD] Upload successful:", {
      filePath: uploadData.path,
      fileName: file.name,
      fileSize: file.size,
    })

    return NextResponse.json({
      success: true,
      message: "CV uploaded successfully",
      filePath: uploadData.path,
      fileData: {
        name: file.name,
        size: file.size,
        type: file.type,
        path: uploadData.path,
        uploadedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error("[CV-UPLOAD] Error:", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cv/upload
 * Deletes the uploaded CV file from Supabase Storage
 *
 * Body: { professionalId: string }
 * Returns: { success: boolean, message: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("[CV-UPLOAD-DELETE] Processing delete request...")

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[CV-UPLOAD-DELETE] Unauthorized request")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { professionalId } = body

    console.log("[CV-UPLOAD-DELETE] Request details:", {
      userId: user.id,
      professionalId,
    })

    if (!professionalId) {
      console.log("[CV-UPLOAD-DELETE] Missing professionalId")
      return NextResponse.json(
        { error: "Missing professionalId" },
        { status: 400 }
      )
    }

    // Verify professional profile belongs to user
    const { data: profile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('id, user_id, cv_uploaded_file_path')
      .eq('id', professionalId)
      .single()

    if (profileError || !profile) {
      console.error("[CV-UPLOAD-DELETE] Professional profile not found:", profileError)
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      )
    }

    if (profile.user_id !== user.id) {
      console.log("[CV-UPLOAD-DELETE] User does not own this profile")
      return NextResponse.json(
        { error: "Unauthorized: You do not own this profile" },
        { status: 403 }
      )
    }

    // Delete all possible CV files for this user
    const filesToDelete = [
      `${user.id}/cv.pdf`,
      `${user.id}/cv.doc`,
      `${user.id}/cv.docx`,
    ]

    console.log("[CV-UPLOAD-DELETE] Deleting files from storage...")

    const { error: deleteError } = await supabase.storage
      .from('cv-documents')
      .remove(filesToDelete)

    if (deleteError) {
      console.error("[CV-UPLOAD-DELETE] Storage delete error:", deleteError)
      // Continue anyway - might not exist
    }

    // Update professional_profiles to clear file metadata
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update({
        cv_source: null,
        cv_uploaded_file_path: null,
        cv_uploaded_file_name: null,
        cv_uploaded_file_size: null,
        cv_uploaded_file_type: null,
        cv_uploaded_at: null,
      })
      .eq('id', professionalId)

    if (updateError) {
      console.error("[CV-UPLOAD-DELETE] Error updating profile:", updateError)
      return NextResponse.json(
        { error: "Failed to delete file metadata. Please try again." },
        { status: 500 }
      )
    }

    console.log("[CV-UPLOAD-DELETE] Delete successful")

    return NextResponse.json({
      success: true,
      message: "CV deleted successfully",
    })
  } catch (error: any) {
    console.error("[CV-UPLOAD-DELETE] Error:", {
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    )
  }
}
