"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/client"
import { X, ImagePlus, Loader2, GripVertical } from "lucide-react"
import pica from "pica"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface PortfolioPhoto {
  id: string
  photo_url: string
  storage_path: string
  display_order: number
}

const MAX_PHOTOS = 6
const MAX_FILE_BYTES = 3 * 1024 * 1024

// ── Single sortable photo tile ────────────────────────────────────────────────
function SortablePhoto({
  photo,
  isCover,
  isDeleting,
  onDelete,
}: {
  photo: PortfolioPhoto
  isCover: boolean
  isDeleting: boolean
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 touch-none cursor-grab active:cursor-grabbing"
    >
      <img
        src={photo.photo_url}
        alt="Portfolio"
        className="w-full h-full object-cover pointer-events-none select-none"
        loading="lazy"
        draggable={false}
      />

      {/* Cover badge */}
      {isCover && (
        <div className="absolute bottom-1.5 left-1.5 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none pointer-events-none">
          COVER
        </div>
      )}

      {/* Drag hint */}
      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center pointer-events-none">
        <GripVertical className="w-3 h-3 text-white" />
      </div>

      {/* Delete button — always visible, stops drag propagation */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
        disabled={isDeleting}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-600 disabled:opacity-60 cursor-pointer"
        aria-label="Delete photo"
      >
        {isDeleting
          ? <Loader2 className="w-3 h-3 text-white animate-spin" />
          : <X className="w-3 h-3 text-white" />}
      </button>
    </div>
  )
}

// ── Main editor component ─────────────────────────────────────────────────────
interface Props {
  profileId: string
}

export function PortfolioPhotosEditor({ profileId }: Props) {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Allow 8px movement before drag starts to avoid conflicts with taps
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  )

  useEffect(() => {
    supabase
      .from("trades_portfolio_photos")
      .select("id, photo_url, storage_path, display_order")
      .eq("tradesperson_id", profileId)
      .order("display_order", { ascending: true })
      .limit(6)
      .then(({ data, error }) => {
        if (error) console.error("[PORTFOLIO] load error:", error.message)
        setPhotos(data ?? [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("[PORTFOLIO] unexpected error:", err)
        setLoading(false)
      })
  }, [profileId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function compressImage(file: File): Promise<File> {
    const TIMEOUT_MS = 15_000
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(file), TIMEOUT_MS)
      const done = (result: File) => { clearTimeout(timer); resolve(result) }

      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = async () => {
        URL.revokeObjectURL(url)
        const maxW = 1600
        let { width, height } = img
        if (width > maxW) { height = Math.round((height * maxW) / width); width = maxW }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        try {
          const picaInst = pica()
          await picaInst.resize(img, canvas)
          const blob = await picaInst.toBlob(canvas, "image/webp", 0.75)
          done(new File([blob], "photo.webp", { type: "image/webp" }))
        } catch {
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
              (blob) => done(blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file),
              "image/webp", 0.75
            )
          } else {
            done(file)
          }
        }
      }
      img.onerror = () => { URL.revokeObjectURL(url); done(file) }
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
    try {
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
          const body = await res.json().catch(() => ({}))
          if (!res.ok) { setError(body.error ?? "Upload failed"); continue }

          setPhotos((prev) => [...prev, body.photo])
        } catch (err: any) {
          setError(err?.message ?? "Upload failed")
        }
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    setError(null)
    try {
      const res = await fetch(`/api/portfolio/${photoId}`, { method: "DELETE" })
      if (res.ok) {
        setPhotos((prev) => {
          const next = prev.filter((p) => p.id !== photoId)
          // Persist new order after delete
          if (next.length > 0) saveOrder(next)
          return next
        })
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Delete failed")
      }
    } catch {
      setError("Delete failed")
    }
    setDeletingId(null)
  }

  const saveOrder = useCallback((ordered: PortfolioPhoto[]) => {
    fetch("/api/portfolio/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((p) => p.id) }),
    }).catch(console.error)
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPhotos((prev) => {
      const oldIdx = prev.findIndex((p) => p.id === active.id)
      const newIdx = prev.findIndex((p) => p.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      saveOrder(next)
      return next
    })
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
      {photos.length > 0 && (
        <p className="text-xs text-slate-500">
          Drag photos to reorder — the first photo is the cover shown on your profile.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                isCover={idx === 0}
                isDeleting={deletingId === photo.id}
                onDelete={handleDelete}
              />
            ))}

            {/* Upload slot */}
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
        </SortableContext>
      </DndContext>

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
