/**
 * Client-side image compression — one shared utility for every upload flow
 * (job photos, portfolio, chat). No external dependencies, no server
 * processing, no Supabase image transforms.
 *
 * What it does:
 *   1. Decodes the file (EXIF orientation applied).
 *   2. Downscales so the LONGEST side is <= `maxDimension` (never upscales).
 *   3. Re-encodes as WebP at `quality`.
 *
 * Output is always a `File` of type `image/webp` named `<base>.webp`.
 * On any failure it THROWS — callers must surface the error and must not
 * fall back to uploading the untouched multi-MB original.
 */

/**
 * Reject an upload before we even try to decode it — protects low-memory
 * devices (mostly Android) from a decode-bomb. 20 MB clears every real phone
 * photo, including 48–50 MP JPEGs. Enforce this in the file picker, before
 * calling `compressImage`.
 */
export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024

export interface CompressImageOptions {
  /** Max length of the longer edge, in px. Default 1600. */
  maxDimension?: number
  /** WebP quality, 0–1. Default 0.82. */
  quality?: number
  /** Output file name; the extension is always forced to `.webp`. Default "photo". */
  fileName?: string
  /**
   * Reject the source outright if either edge exceeds this many px — a guard
   * against decode-bomb / corrupt-metadata images on low-memory devices.
   * Default 12000 (comfortably above any real phone camera).
   */
  maxSourceDimension?: number
  /** Abort if processing hasn't finished within this many ms. Default 20000. */
  timeoutMs?: number
}

export interface CompressImageResult {
  /** Always `image/webp`. */
  file: File
  width: number
  height: number
  originalBytes: number
  compressedBytes: number
}

const DEFAULTS: Required<Omit<CompressImageOptions, "fileName">> & { fileName: string } = {
  maxDimension: 1600,
  quality: 0.82,
  fileName: "photo",
  maxSourceDimension: 12000,
  timeoutMs: 20000,
}

export async function compressImage(
  source: File | Blob,
  options: CompressImageOptions = {},
): Promise<CompressImageResult> {
  const opts = { ...DEFAULTS, ...options }

  if (!source.type || !source.type.startsWith("image/")) {
    throw new Error("That file isn't an image.")
  }

  return withTimeout(run(source, opts), opts.timeoutMs, "Image processing timed out. Please try a smaller photo.")
}

async function run(
  source: File | Blob,
  opts: Required<Omit<CompressImageOptions, "fileName">> & { fileName: string },
): Promise<CompressImageResult> {
  const drawable = await loadDrawable(source)
  try {
    const srcW = "width" in drawable ? drawable.width : 0
    const srcH = "height" in drawable ? drawable.height : 0
    if (!srcW || !srcH) throw new Error("Could not read the image dimensions.")

    if (srcW > opts.maxSourceDimension || srcH > opts.maxSourceDimension) {
      throw new Error(
        `Image is too large (${srcW}×${srcH}px). Please choose a photo under ${opts.maxSourceDimension}px per side.`,
      )
    }

    const scale = Math.min(1, opts.maxDimension / Math.max(srcW, srcH))
    const outW = Math.max(1, Math.round(srcW * scale))
    const outH = Math.max(1, Math.round(srcH * scale))

    const canvas = document.createElement("canvas")
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Your browser couldn't process the image (no canvas).")
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(drawable as CanvasImageSource, 0, 0, outW, outH)

    const blob = await canvasToWebp(canvas, opts.quality)

    const base = opts.fileName.replace(/\.[^/.]+$/, "").trim() || "photo"
    const file = new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() })

    return {
      file,
      width: outW,
      height: outH,
      originalBytes: source.size,
      compressedBytes: file.size,
    }
  } finally {
    if (typeof (drawable as ImageBitmap).close === "function") {
      ;(drawable as ImageBitmap).close()
    }
  }
}

/** Decode to something drawImage accepts, with EXIF orientation baked in. */
async function loadDrawable(source: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // `imageOrientation: "from-image"` honours EXIF; cast because older TS
      // lib.dom typings don't list the string literal.
      return await createImageBitmap(source, { imageOrientation: "from-image" } as ImageBitmapOptions)
    } catch {
      /* fall through to <img>, which auto-orients from EXIF in every modern browser */
    }
  }
  return loadImgElement(source)
}

function loadImgElement(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not load that image — it may be corrupt or an unsupported format."))
    }
    img.src = url
  })
}

async function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality))
  if (!blob) throw new Error("Image encoding failed.")
  if (blob.type !== "image/webp") {
    // Browser silently fell back to PNG/JPEG — refuse rather than upload a
    // mislabelled or oversized file.
    throw new Error("This browser can't create WebP images. Please try a different browser or device.")
  }
  return blob
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}
