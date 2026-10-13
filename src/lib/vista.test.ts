import { describe, expect, it } from 'vitest'
import { construirHoy, construirSemana, guionOral, SIN_ORIGEN_ID } from './vista.ts'
import type { Auditoria, Datos, Pendiente } from './tipos.ts'
import { aPendiente, propiedadesNuevaTarea, propiedadesPendiente, propiedadesAuditoria } from '../../supabase/functions/_shared/mapeo.ts'

const AHORA = new Date('2026-10-12T12:00:00')
const HOY = '2026-10-12'
const RECIENTE = '2026-10-11T10:00:00.000Z'
const VIEJO = '2026-08-01T10:00:00.000Z'

const aud = (o: Partial<Auditoria> & { id: string }): Auditoria => ({
  nombre: o.id,
  proyecto: 'Kefuri',
  ambito: 'Trabajo',
  tipoOrigen: 'Auditoría',
  estado: 'Crítico en curso',
  problemaCritico: '',
  pagina: null,
  notionUrl: '',
  inicio: null,
  ultimaActividad: null,
  editadoEn: RECIENTE,
  ...o,
})

const pen = (o: Partial<Pendiente> & { id: string }): Pendiente => ({
  titulo: o.id,
  origenId: 'a1',
  tipo: 'Secundario',
  categoria: 'Hacer ya',
  estado: 'Abierto',
  fechaCierre: null,
  evidencia: '',
  afectaPantallas: false,
  avisadoDiseno: false,
  nota: '',
  enFoco: null,
  cerradoPor: null,
  notionUrl: '',
  editadoEn: RECIENTE,
  ...o,
})

const datos = (auditorias: Auditoria[], pendientes: Pendiente[]): Datos => ({ leidoEn: RECIENTE, auditorias, pendientes })

describe('construirHoy', () => {
  it('ordena críticos primero y deja "espera decisión" aparte', () => {
    const v = construirHoy(
      datos([aud({ id: 'a1' })], [
        pen({ id: 'deuda', categoria: 'Deuda técnica' }),
        pen({ id: 'ya', categoria: 'Hacer ya' }),
        pen({ id: 'crit', tipo: 'Crítico', categoria: 'Deuda técnica' }),
        pen({ id: 'esp', categoria: 'Espera decisión' }),
      ]),
      'Trabajo', HOY, AHORA,
    )
    expect(v.tarjetas[0].filas.map((f) => f.p.id)).toEqual(['crit', 'ya', 'deuda'])
    expect(v.tarjetas[0].espera.map((p) => p.id)).toEqual(['esp'])
    expect(v.resumen).toMatchObject({ criticos: 1, secundarios: 3, espera: 1 })
  })

  it('no mezcla Trabajo y Personal', () => {
    const d = datos(
      [aud({ id: 'a1' }), aud({ id: 'a2', ambito: 'Personal' })],
      [pen({ id: 't' }), pen({ id: 'p', origenId: 'a2' })],
    )
    expect(construirHoy(d, 'Personal', HOY, AHORA).tarjetas.map((t) => t.auditoria.id)).toEqual(['a2'])
  })

  it('marca "de ayer" y cuenta el límite de 3 solo con los abiertos', () => {
    const v = construirHoy(
      datos([aud({ id: 'a1' })], [
        pen({ id: 'h1', enFoco: HOY }),
        pen({ id: 'h2', enFoco: '2026-10-11' }),
        pen({ id: 'h3', enFoco: HOY, estado: 'Hecho', fechaCierre: HOY }),
      ]),
      'Trabajo', HOY, AHORA,
    )
    expect(v.paraHoy.find((i) => i.p.id === 'h2')?.deAyer).toBe(true)
    expect(v.paraHoy.find((i) => i.p.id === 'h3')?.hecho).toBe(true)
    expect(v.abiertosEnHoy).toBe(2)
    expect(v.lleno).toBe(false)
  })

  it('detecta pendientes quietos (más de 14 días sin edición)', () => {
    const v = construirHoy(datos([aud({ id: 'a1' })], [pen({ id: 'q', editadoEn: VIEJO })]), 'Trabajo', HOY, AHORA)
    expect(v.tarjetas[0].filas[0].quieto).toBe(true)
    expect(v.resumen.quietos).toBe(1)
  })

  it('sugiere "crítico ejecutado" cuando no quedan críticos', () => {
    const v = construirHoy(datos([aud({ id: 'a1' })], [pen({ id: 's' })]), 'Trabajo', HOY, AHORA)
    expect(v.tarjetas[0].sugerencia?.estado).toBe('Crítico ejecutado')
  })

  it('oculta auditorías terminadas sin nada abierto', () => {
    const v = construirHoy(datos([aud({ id: 'a1', estado: 'Todo ejecutado' })], []), 'Trabajo', HOY, AHORA)
    expect(v.tarjetas).toHaveLength(0)
  })

  it('nunca pierde pendientes sin origen', () => {
    const v = construirHoy(datos([], [pen({ id: 'x', origenId: null })]), 'Trabajo', HOY, AHORA)
    expect(v.tarjetas[0].auditoria.id).toBe(SIN_ORIGEN_ID)
  })
})

describe('construirSemana y guionOral', () => {
  const d = datos(
    [aud({ id: 'a1', nombre: 'Validaciones' }), aud({ id: 'a2', nombre: 'Accesibilidad', estado: 'Detenida', proyecto: 'Ruta Digital' })],
    [
      pen({ id: 'c1', titulo: 'Tanda 0', estado: 'Hecho', fechaCierre: '2026-10-09' }),
      pen({ id: 'c-viejo', estado: 'Hecho', fechaCierre: '2026-09-01' }),
      pen({ id: 'o1', tipo: 'Crítico' }),
      pen({ id: 'r1', origenId: 'a2', editadoEn: VIEJO }),
    ],
  )

  it('cuenta solo cierres de los últimos 7 días', () => {
    const s = construirSemana(d, 'Trabajo', HOY, AHORA)
    expect(s.totalCerrados).toBe(1)
    expect(s.bloques.find((b) => b.auditoria.id === 'a2')?.detenida).toBe(true)
  })

  it('arma bloques numerados y separa lo detenido', () => {
    const s = construirSemana(d, 'Trabajo', HOY, AHORA)
    const g = guionOral(s, new Set(['a1', 'a2']))
    expect(g).toContain('1️⃣ Kefuri · Validaciones')
    expect(g).toContain('✅ Se cerraron 1: Tanda 0.')
    expect(g).toContain('📌 Quedan 1 crítico.')
    expect(g).toContain('⏸️ Detenido: Accesibilidad.')
  })
})

describe('mapeo de Notion', () => {
  it('traduce una página de Pendientes', () => {
    const p = aPendiente({
      id: 'p1',
      url: 'https://notion.so/p1',
      last_edited_time: RECIENTE,
      properties: {
        Pendiente: { type: 'title', title: [{ plain_text: 'Hola' }] },
        Origen: { type: 'relation', relation: [{ id: 'a1' }] },
        Tipo: { type: 'select', select: { name: 'Crítico' } },
        Estado: { type: 'select', select: { name: 'Abierto' } },
        'En foco': { type: 'date', date: { start: HOY } },
        'Afecta pantallas': { type: 'checkbox', checkbox: true },
      },
    })
    expect(p).toMatchObject({ titulo: 'Hola', origenId: 'a1', tipo: 'Crítico', enFoco: HOY, afectaPantallas: true })
  })

  it('solo permite escribir campos de la lista blanca', () => {
    expect(() => propiedadesPendiente({ titulo: 'x' })).toThrow()
    expect(() => propiedadesPendiente({ estado: 'Borrado' })).toThrow()
    expect(() => propiedadesPendiente({ enFoco: '12/10/2026' })).toThrow()
    expect(propiedadesPendiente({ estado: 'Hecho', fechaCierre: HOY, cerradoPor: 'Yo' })).toEqual({
      Estado: { select: { name: 'Hecho' } },
      'Fecha de cierre': { date: { start: HOY } },
      'Cerrado por': { select: { name: 'Yo' } },
    })
    expect(propiedadesPendiente({ enFoco: null })).toEqual({ 'En foco': { date: null } })
    expect(() => propiedadesAuditoria({ nombre: 'x' })).toThrow()
  })
})

describe('tareas sueltas', () => {
  const d = datos(
    [
      aud({ id: 'a1', nombre: 'Validaciones' }),
      aud({ id: 's1', nombre: 'Tareas sueltas', proyecto: 'Ruta Digital', tipoOrigen: 'Bitácora', estado: null }),
    ],
    [
      pen({ id: 'p1', tipo: 'Crítico' }),
      pen({ id: 't1', origenId: 's1', tipo: null, titulo: 'Revisar links', enFoco: HOY }),
      pen({ id: 't2', origenId: 's1', tipo: null, titulo: 'Links listos', estado: 'Hecho', fechaCierre: HOY }),
    ],
  )

  it('van primero, sin sugerencia y contadas aparte del resumen de auditorías', () => {
    const v = construirHoy(d, 'Trabajo', HOY, AHORA)
    expect(v.tarjetas[0]).toMatchObject({ sueltas: true, sugerencia: null })
    expect(v.resumen).toMatchObject({ auditorias: 1, criticos: 1, secundarios: 0, sueltas: 1 })
    expect(v.paraHoy.map((i) => i.p.id)).toEqual(['t1'])
  })

  it('el guion habla de tareas, no de secundarios', () => {
    const g = guionOral(construirSemana(d, 'Trabajo', HOY, AHORA), new Set(['a1', 's1']))
    expect(g).toContain('Ruta Digital · Tareas sueltas')
    expect(g).toContain('✅ Se cerraron 1: Links listos.')
    expect(g).toContain('📌 Quedan 1 tarea.')
  })

  it('una tarea nueva solo acepta título, origen, nota y "para hoy"', () => {
    expect(() => propiedadesNuevaTarea({ titulo: '', origenId: 's1' })).toThrow()
    expect(() => propiedadesNuevaTarea({ titulo: 'x', origenId: 's1', tipo: 'Crítico' })).toThrow()
    expect(propiedadesNuevaTarea({ titulo: ' Revisar links ', origenId: 's1', nota: '', enFoco: HOY })).toEqual({
      Pendiente: { title: [{ text: { content: 'Revisar links' } }] },
      Origen: { relation: [{ id: 's1' }] },
      Estado: { select: { name: 'Abierto' } },
      Categoría: { select: { name: 'Hacer ya' } },
      'En foco': { date: { start: HOY } },
    })
  })
})
