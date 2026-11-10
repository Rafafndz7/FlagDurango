export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      /* algunos navegadores no aceptan opciones: se usa <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = "async"
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    throw new Error("Formato no soportado (usa JPG, PNG o WebP)")
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

async function encode(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxSide: number,
  quality: number,
): Promise<CompressedImage> {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo procesar la imagen")
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(source, 0, 0, w, h)
  let blob = await toBlob(canvas, "image/webp", quality)
  // Safari antiguo no codifica WebP y regresa PNG (pesado): en ese caso JPEG
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality)
  if (!blob) throw new Error("No se pudo comprimir la imagen")
  return { blob, width: w, height: h }
}

/** Una sola versión comprimida (por ejemplo, para mandar una imagen a la IA). */
export async function compressImage(file: File, maxSide = 2400, quality = 0.9) {
  const decoded = await decode(file)
  try {
    return await encode(decoded.source, decoded.width, decoded.height, maxSide, quality)
  } finally {
    decoded.close()
  }
}

export function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]+;base64,/, ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Genera la foto grande y la miniatura comprimidas, respetando la orientación de la cámara. */
export async function compressPhoto(file: File, opts = { maxSide: 1920, quality: 0.8, thumbSide: 640, thumbQuality: 0.7 }) {
  const decoded = await decode(file)
  try {
    const full = await encode(decoded.source, decoded.width, decoded.height, opts.maxSide, opts.quality)
    const thumb = await encode(decoded.source, decoded.width, decoded.height, opts.thumbSide, opts.thumbQuality)
    return { full, thumb }
  } finally {
    decoded.close()
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
