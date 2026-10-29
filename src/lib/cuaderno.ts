// Lógica pura del cuaderno de notas: orden, búsqueda y textos de fecha.
import type { Nota } from './tipos.ts'
import { mapearMarcas, partesContenido, sinImagenes } from '../../supabase/functions/_shared/imagenes.ts'

/** Fijadas primero; dentro de cada grupo, la última editada arriba. */
export function ordenarNotas(notas: Nota[]): Nota[] {
  return [...notas].sort((a, b) => Number(b.fijada) - Number(a.fijada) || b.editada.localeCompare(a.editada))
}

const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Busca en título y contenido, sin distinguir mayúsculas ni tildes; filtra por proyecto si se indica. */
export function filtrarNotas(notas: Nota[], consulta: string, proyecto: string | null = null): Nota[] {
  const q = sinTildes(consulta.trim())
  return notas.filter(
    (n) => (!proyecto || n.proyecto === proyecto) && (!q || sinTildes(`${n.titulo}\n${sinImagenes(n.contenido)}`).includes(q)),
  )
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "26 oct" (o "26 oct 2025" si no es del año en curso). */
export function fechaCorta(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const base = `${d.getDate()} ${MESES[d.getMonth()]}`
  return d.getFullYear() === ahora.getFullYear() ? base : `${base} ${d.getFullYear()}`
}

/** Primera línea con texto del contenido, para el índice cuando la nota no tiene título. */
export function resumenNota(n: Nota, largo = 60): string {
  const linea = sinImagenes(n.contenido).split('\n').find((l) => l.trim()) ?? ''
  return linea.length > largo ? `${linea.slice(0, largo - 1)}…` : linea
}

// ---- Imágenes mientras se edita
// En el editor cada marca larga (![imagen](bloque:…)) se muestra como [📷 imagen N], más fácil de leer.
// `fotos` guarda N → marca completa, para volver al formato de Notion al guardar.
const VISTA = () => /\[📷 imagen (\d+)\]/g
export const etiquetaFoto = (n: number | string) => `[📷 imagen ${n}]`

export function aVista(contenido: string): { texto: string; fotos: Record<string, string> } {
  const fotos: Record<string, string> = {}
  let n = 0
  const texto = mapearMarcas(contenido, (marca) => {
    n++
    fotos[n] = marca
    return etiquetaFoto(n)
  })
  return { texto, fotos }
}

/** Vuelve al formato de Notion. Las etiquetas que no son de una imagen conocida quedan como texto. */
export const deVista = (texto: string, fotos: Record<string, string>) => texto.replace(VISTA(), (todo, n) => fotos[n] ?? todo)

/** Imágenes presentes en el texto del editor, en orden: número de etiqueta e id de la imagen. */
export function fotosEnVista(texto: string, fotos: Record<string, string>): { n: string; id: string }[] {
  return [...texto.matchAll(VISTA())].flatMap((m) => {
    const parte = fotos[m[1]] ? partesContenido(fotos[m[1]])[0] : undefined
    return parte?.tipo === 'imagen' ? [{ n: m[1], id: parte.id }] : []
  })
}

export const siguienteFoto = (fotos: Record<string, string>) => Math.max(0, ...Object.keys(fotos).map(Number)) + 1

/** Quita la etiqueta N (y el salto de línea que la acompaña). */
export function quitarFoto(texto: string, n: string): string {
  return texto.replace(VISTA(), (todo, x) => (x === n ? '\u0000' : todo)).replace(/\n?\u0000\n?/g, '\n').replace(/^\n/, '')
}
