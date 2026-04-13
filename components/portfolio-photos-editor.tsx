"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/client"
import { X, ImagePlus, Loader2 } from "lucide-react"
import pica from "pica"

interface PortfolioPhoto {
  id: string
  photo_url: string
  storage_path: string
}

interface Props {
  profileId: string // company_profiles.id
}

const MAX_PHOTOS = 6
const MAX_FILE_BYTES = 3 * 1024 * 1024 // 3 MB before compression

export function PortfolioPhotosEditor({ profileId }: Props) {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from("trades_portfolio_photos")
      .select("id, photo_url, storage_path")
      .eq("tradesperson_id", profileId)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setPhotos(data ?? [])
        setLoading(false)
      })
  }, [profileId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = async () => {
        URL.revokeObjectURL(url)
        const maxW = 1600
        let { width, height } = img
        if (width > maxW) {
          height = Math.round((height * maxW) / width)
          width = maxW
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        try {
          const picaInst = pica()
          await picaInst.resize(img, canvas)
          const blob = await picaInst.toBlob(canvas, "image/webp", 0.75)
          resolve(new File([blob], "photo.webp", { type: "image/webp" }))
        } catch {
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
              (blob) => resolve(new File([blob!], "photo.webp", { type: "image/webp" })),
              "image/webp",
              0.75
            )
          } else {
            resolve(file)
          }
        }
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!files.length) return
    setError(null)

    const remaining = MAX_PHOTOS - photos.length
    const toUpload = files.slice(0, remaining)

    setUploading(true)
    for (const file of toUpload) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" exceeds the 3 MB limit before compression.`)
        continue
      }
      try {
        const compressed = await compressImage(file)
        const storagePath = `${profileId}/${Date.now()}.webp`

        const { error: uploadErr } = await supabase.storage
          .from("trades-portfolio")
          .upload(storagePath, compressed, { cacheControl: "3600", upsert: false })

        if (uploadErr) { setError(uploadErr.message); continue }

        const { data: { publicUrl } } = supabase.storage
          .from("trades-portfolio")
          .getPublicUrl(storagePath)

        const res = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo_url: publicUrl, storage_path: storagePath }),
        })
        const body = await res.json()
        if (!res.ok) { setError(body.error ?? "Upload failed"); continue }

        setPhotos((prev) => [body.photo, ...prev])
      } catch (err: any) {
        setError(err?.message ?? "Upload failed")
      }
    }
    setUploading(false)
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    setError(null)
    try {
      const res = await fetch(`/api/portfolio/${photoId}`, { method: "DELETE" })
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Delete failed")
      }
    } catch {
      setError("Delete failed")
    }
    setDeletingId(null)
  }

  const atLimit = photos.length >= MAX_PHOTOS

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading photos…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-xl overflow-hidden group border border-slate-700"
          >
            <img
              src={photo.photo_url}
              alt="Portfolio"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => handleDelete(photo.id)}
              disabled={deletingId === photo.id}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-60"
              aria-label="Delete photo"
            >
              {deletingId === photo.id
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : <X className="w-3 h-3 text-white" />}
            </button>
          </div>
        ))}

        {/* Upload slot — hidden when at limit */}
        {!atLimit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-1.5 hover:border-emerald-500 hover:bg-emerald-500/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              : <ImagePlus className="w-5 h-5 text-slate-400" />}
            <span className="text-[10px] text-slate-500 font-medium">
              {uploading ? "Uploading…" : "Add photo"}
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{photos.length} / {MAX_PHOTOS} photos</p>
        {atLimit && (
          <p className="text-xs text-amber-400 font-medium">Maximum 6 portfolio photos allowed</p>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}
