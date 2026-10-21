import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Ambito } from '../lib/tipos.ts'
import { trazoLapiz } from '../lib/sonido.ts'

export interface DatosNuevaTarea {
  titulo: string
  proyecto: string
  nota: string
  paraHoy: boolean
}

/**
 * Hoja lateral para anotar una tarea espontánea ("me pidieron revisar…").
 * Se guarda en la base "Tareas sueltas" de Notion; se cierra marcándola hecha como cualquier pendiente.
 */
const CLAVE_ULTIMO = 'paperflow:ultimo-proyecto'
export function NuevaTarea({
  proyectos,
  ambito,
  hayCupoHoy,
  onCrear,
  onCerrar,
}: {
  proyectos: string[]
  ambito: Ambito
  hayCupoHoy: boolean
  onCrear: (d: DatosNuevaTarea) => Promise<void>
  onCerrar: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [proyecto, setProyecto] = useState(() => {
    try {
      const u = localStorage.getItem(CLAVE_ULTIMO)
      return u && proyectos.includes(u) ? u : ''
    } catch {
      return ''
    }
  })
  const [nota, setNota] = useState('')
  const [paraHoy, setParaHoy] = useState(hayCupoHoy)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const tituloRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    tituloRef.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const listo = titulo.trim().length > 0 && proyecto !== '' && !enviando

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!listo) return
    setEnviando(true)
    setError('')
    try {
      try {
        localStorage.setItem(CLAVE_ULTIMO, proyecto)
      } catch {
        /* sin almacenamiento */
      }
      await onCrear({ titulo: titulo.trim(), proyecto, nota: nota.trim(), paraHoy: paraHoy && hayCupoHoy })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar en Notion')
      setEnviando(false)
    }
  }

  return (
    <div className="velo" onClick={onCerrar}>
      <aside className="papel hoja-detalle" role="dialog" aria-modal="true" aria-labelledby="nueva-t" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kicker">tarea suelta</span>
          <button type="button" className="btn-texto btn-texto--suave" onClick={onCerrar}>
            cancelar
          </button>
        </div>
        <h2 id="nueva-t" className="titulo-seccion" style={{ fontSize: 30 }}>
          ¿qué te pidieron?
        </h2>

          <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="campo">
              <label htmlFor="nueva-titulo" className="datos">
                tarea
              </label>
              <input
                id="nueva-titulo"
                ref={tituloRef}
                value={titulo}
                maxLength={200}
                required
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ej. revisar links de productos entregados"
              />
            </div>

            <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="datos" style={{ marginBottom: 6 }}>
                proyecto · {ambito.toLowerCase()}
              </legend>
              <div className="selector" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
                {proyectos.map((pr) => (
                  <button key={pr} type="button" aria-pressed={proyecto === pr} onClick={() => setProyecto(pr)}>
                    {pr.toLowerCase()}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="campo">
              <label htmlFor="nueva-nota" className="datos">
                nota · opcional
              </label>
              <input id="nueva-nota" value={nota} maxLength={500} onChange={(e) => setNota(e.target.value)} placeholder="quién lo pidió, dónde están los links…" />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, minHeight: 44, cursor: hayCupoHoy ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={paraHoy && hayCupoHoy}
                disabled={!hayCupoHoy}
                onChange={(e) => {
                  trazoLapiz()
                  setParaHoy(e.target.checked)
                }}
                style={{ width: 20, height: 20 }}
              />
              <span>{hayCupoHoy ? 'agregarla a "para hoy"' : '"para hoy" ya tiene 3; queda en su tarjeta'}</span>
            </label>

            {error && (
              <p role="alert" style={{ margin: 0, color: 'var(--critico)' }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn-mano" disabled={!listo} style={{ alignSelf: 'flex-start' }}>
              {enviando ? 'guardando…' : 'agregar'}
            </button>
          </form>
      </aside>
    </div>
  )
}
