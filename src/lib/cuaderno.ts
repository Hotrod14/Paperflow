// Lógica pura del cuaderno de notas: orden, búsqueda y textos de fecha.
import type { Nota } from './tipos.ts'

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
    (n) => (!proyecto || n.proyecto === proyecto) && (!q || sinTildes(`${n.titulo}\n${n.contenido}`).includes(q)),
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
  const linea = n.contenido.split('\n').find((l) => l.trim()) ?? ''
  return linea.length > largo ? `${linea.slice(0, largo - 1)}…` : linea
}
