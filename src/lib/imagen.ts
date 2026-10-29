// Prepara una imagen pegada para subirla: la achica y la comprime para que pese poco
// (Notion acepta hasta 5 MB por archivo en el plan gratuito).
import { MAX_BYTES_IMAGEN, TIPOS_IMAGEN } from '../../supabase/functions/_shared/imagenes.ts'

const LADO_MAX = 1800

export type ImagenLista = { blob: Blob; tipo: string; nombre: string }

export const esImagen = (f: File) => (TIPOS_IMAGEN as readonly string[]).includes(f.type)

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((r) => lienzo.toBlob(r, tipo, calidad))
}

/** Achica a 1800 px por lado y pasa a WebP (o JPEG si el navegador no sabe WebP). Los GIF se dejan tal cual para no perder la animación. */
export async function prepararImagen(archivo: File): Promise<ImagenLista> {
  const nombre = archivo.name || 'imagen'
  if (archivo.type === 'image/gif') {
    if (archivo.size > MAX_BYTES_IMAGEN) throw new Error('El GIF pesa más de 5 MB')
    return { blob: archivo, tipo: archivo.type, nombre }
  }
  let mapa: ImageBitmap
  try {
    mapa = await createImageBitmap(archivo)
  } catch {
    throw new Error('No pude leer la imagen')
  }
  const escala = Math.min(1, LADO_MAX / Math.max(mapa.width, mapa.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(mapa.width * escala)
  lienzo.height = Math.round(mapa.height * escala)
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No pude preparar la imagen')
  ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height)
  mapa.close()

  for (const calidad of [0.88, 0.75, 0.6]) {
    let blob = await aBlob(lienzo, 'image/webp', calidad)
    if (!blob || blob.type !== 'image/webp') blob = await aBlob(lienzo, 'image/jpeg', calidad)
    if (blob && blob.size <= MAX_BYTES_IMAGEN) return { blob, tipo: blob.type, nombre }
  }
  throw new Error('La imagen pesa demasiado incluso comprimida')
}

/** Base64 sin el prefijo data:… */
export function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '')
    lector.onerror = () => rechazar(new Error('No pude leer la imagen'))
    lector.readAsDataURL(blob)
  })
}
