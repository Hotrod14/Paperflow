const DIA_MS = 86_400_000

/** Fecha local del navegador como YYYY-MM-DD. */
export function fechaLocal(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Suma días a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return fechaLocal(new Date(y, m - 1, d + dias))
}

/** "hace 4 min", "hace 3 h", "hace 12 días". */
export function haceCuanto(iso: string, ahora: Date = new Date()): string {
  const ms = Math.max(0, ahora.getTime() - new Date(iso).getTime())
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const dias = Math.round(ms / DIA_MS)
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

export function diasDesde(iso: string, ahora: Date = new Date()): number {
  return (ahora.getTime() - new Date(iso).getTime()) / DIA_MS
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "domingo 11 de octubre". */
export function fechaLarga(d: Date = new Date()): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** Días que faltan para el próximo jueves (0 si hoy es jueves). */
export function diasHastaJueves(d: Date = new Date()): number {
  return (4 - d.getDay() + 7) % 7
}
