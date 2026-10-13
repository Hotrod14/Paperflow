import { useEffect, useRef, useState } from 'react'
import type { Auditoria, Pendiente } from '../lib/tipos.ts'
import { esSueltas } from '../lib/vista.ts'

/** Detalle de un pendiente: se abre al costado sin salir de "Hoy". */
export function HojaDetalle({
  p,
  auditoria,
  onCerrar,
  onGuardarEvidencia,
  onMarcarHecho,
}: {
  p: Pendiente
  auditoria: Auditoria | null
  onCerrar: () => void
  onGuardarEvidencia: (texto: string) => void
  onMarcarHecho: () => void
}) {
  const [evidencia, setEvidencia] = useState(p.evidencia)
  const [copiado, setCopiado] = useState(false)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cerrarRef.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const enlaceAuditoria = auditoria?.pagina ?? auditoria?.notionUrl ?? ''
  const instruccion = [
    `Retoma ${auditoria ? `la auditoría "${auditoria.nombre}"` : 'este pendiente'}${enlaceAuditoria ? ` (${enlaceAuditoria})` : ''}.`,
    `Pendiente: "${p.titulo}".`,
    p.nota ? `Contexto: ${p.nota}` : '',
    'Al terminar, marca el pendiente como Hecho en la base "Pendientes" de Paperflow: Fecha de cierre = hoy, Evidencia = commit, Cerrado por = Claude Code. Actualiza también el estado de la auditoría si corresponde.',
  ]
    .filter(Boolean)
    .join('\n')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(instruccion)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="velo" onClick={onCerrar}>
      <aside
        className="papel hoja-detalle"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-t"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="kicker">{auditoria ? `${auditoria.proyecto ?? ''} · ${auditoria.nombre}` : 'sin origen'}</span>
          <button ref={cerrarRef} type="button" className="btn-texto btn-texto--suave" onClick={onCerrar}>
            cerrar
          </button>
        </div>
        <h2 id="detalle-t" style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>
          {p.titulo}
        </h2>
        <div className="fila__meta">
          {esSueltas(auditoria) ? (
            <span className="datos">tarea suelta</span>
          ) : p.tipo === 'Crítico' ? (
            <span className="tag-critico">crítico</span>
          ) : (
            <span className="tag-secundario">secundario</span>
          )}
          {p.categoria && <span className="datos">{p.categoria.toLowerCase()}</span>}
          {p.estado && <span className="datos">· {p.estado.toLowerCase()}</span>}
        </div>
        {p.nota && <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>{p.nota}</p>}

        <div className="campo">
          <label htmlFor="evidencia" className="datos">
            evidencia (commit, enlace o nota) · opcional
          </label>
          <input
            id="evidencia"
            value={evidencia}
            maxLength={500}
            onChange={(e) => setEvidencia(e.target.value)}
            onBlur={() => evidencia !== p.evidencia && onGuardarEvidencia(evidencia)}
            placeholder="ej. f4df2839"
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {p.estado === 'Abierto' && (
            <button type="button" className="btn-mano" onClick={onMarcarHecho}>
              marcar hecho
            </button>
          )}
          <button type="button" className="btn-mano" onClick={copiar}>
            {copiado ? 'copiado' : 'copiar para Claude Code'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {p.notionUrl && (
            <a className="btn-texto" href={p.notionUrl} target="_blank" rel="noreferrer">
              abrir pendiente en Notion
            </a>
          )}
          {enlaceAuditoria && (
            <a className="btn-texto" href={enlaceAuditoria} target="_blank" rel="noreferrer">
              abrir auditoría
            </a>
          )}
        </div>
        {p.cerradoPor && (
          <span className="datos">
            cerrado por {p.cerradoPor.toLowerCase()}
            {p.fechaCierre ? ` · ${p.fechaCierre}` : ''}
          </span>
        )}
      </aside>
    </div>
  )
}
