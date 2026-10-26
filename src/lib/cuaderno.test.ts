import { describe, expect, it } from 'vitest'
import { fechaCorta, filtrarNotas, ordenarNotas, resumenNota } from './cuaderno.ts'
import { propiedadesNota } from '../../supabase/functions/_shared/mapeo.ts'
import type { Nota } from './tipos.ts'

const nota = (o: Partial<Nota> & { id: string }): Nota => ({
  titulo: o.id,
  contenido: '',
  proyecto: 'General',
  fijada: false,
  creada: '2026-10-20T10:00:00.000Z',
  editada: '2026-10-20T10:00:00.000Z',
  notionUrl: '',
  ...o,
})

describe('cuaderno', () => {
  it('pone las fijadas arriba y luego la última editada', () => {
    const r = ordenarNotas([
      nota({ id: 'vieja', editada: '2026-10-01T00:00:00.000Z' }),
      nota({ id: 'nueva', editada: '2026-10-25T00:00:00.000Z' }),
      nota({ id: 'fijada', fijada: true, editada: '2026-09-01T00:00:00.000Z' }),
    ])
    expect(r.map((n) => n.id)).toEqual(['fijada', 'nueva', 'vieja'])
  })

  it('busca sin tildes ni mayúsculas en título y contenido, y filtra por proyecto', () => {
    const ns = [
      nota({ id: 'a', titulo: 'Reunión', contenido: 'revisar la Guía', proyecto: 'Kefuri' }),
      nota({ id: 'b', titulo: 'Compras', proyecto: 'General' }),
    ]
    expect(filtrarNotas(ns, 'guia').map((n) => n.id)).toEqual(['a'])
    expect(filtrarNotas(ns, 'REUNION').map((n) => n.id)).toEqual(['a'])
    expect(filtrarNotas(ns, '', 'General').map((n) => n.id)).toEqual(['b'])
  })

  it('arma fecha corta y resumen', () => {
    expect(fechaCorta('2026-10-26T15:00:00.000Z', new Date('2026-10-27T00:00:00'))).toBe('26 oct')
    expect(resumenNota(nota({ id: 'x', contenido: '\n\nprimera línea útil\notra' }))).toBe('primera línea útil')
  })

  it('solo escribe título, contenido, proyecto y fijada', () => {
    expect(() => propiedadesNota({ estado: 'Hecho' })).toThrow()
    expect(() => propiedadesNota({ proyecto: 'Inventado' })).toThrow()
    expect(() => propiedadesNota({ contenido: 'x'.repeat(20001) })).toThrow()
    const p = propiedadesNota({ titulo: ' Ideas ', contenido: 'a'.repeat(4500) }, true)
    expect(p['Título']).toEqual({ title: [{ text: { content: 'Ideas' } }] })
    expect(p['Contenido'].rich_text).toHaveLength(3)
    expect(p['Proyecto']).toEqual({ select: { name: 'General' } })
  })
})
