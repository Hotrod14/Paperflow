import { useState } from 'react'
import type { Pendiente } from '../lib/tipos.ts'
import type { Tarjeta as TarjetaT } from '../lib/vista.ts'
import { SIN_ORIGEN_ID } from '../lib/vista.ts'
import { Papel } from './Papel.tsx'

export interface AccionesTarjeta {
  marcarHecho: (p: Pendiente) => void
  alternarHoy: (p: Pendiente) => void
  abrir: (p: Pendiente) => void
  aplicarSugerencia: (auditoriaId: string, estado: 'Crítico ejecutado' | 'Todo ejecutado') => void
}

const VISIBLES = 3

function claseSello(estado: string | null) {
  if (estado === 'Crítico en curso') return 'sello sello--curso'
  if (estado === 'Crítico ejecutado') return 'sello sello--ejecutado'
  return 'sello sello--neutro'
}

export function Tarjeta({ t, indice, lleno, acciones }: { t: TarjetaT; indice: number; lleno: boolean; acciones: AccionesTarjeta }) {
  const [verTodo, setVerTodo] = useState(false)
  const [verEspera, setVerEspera] = useState(false)
  const a = t.auditoria
  const filas = verTodo ? t.filas : t.filas.slice(0, VISIBLES)
  const enlace = a.pagina ?? (a.notionUrl || null)
  const giro = [-0.35, 0.3, -0.15][indice % 3]

  return (
    <Papel as="article" borde={indice % 2 ? 'b' : 'a'} girar={giro} aria-label={a.nombre}>
      <div className="tarjeta__hoja">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span className="kicker">
              {a.id === SIN_ORIGEN_ID ? 'revisar origen' : `${a.proyecto ?? 'sin proyecto'} · ${(a.tipoOrigen ?? 'auditoría').toLowerCase()}`}
            </span>
            <h3 className="tarjeta__titulo">
              {enlace ? (
                <a href={enlace} target="_blank" rel="noreferrer">
                  {a.nombre}
                </a>
              ) : (
                a.nombre
              )}
            </h3>
          </div>
          {a.estado && <span className={claseSello(a.estado)}>{a.estado.toLowerCase()}</span>}
        </div>

        <div className="tarjeta__cuenta datos">
          <span>
            {t.criticos} {t.criticos === 1 ? 'crítico' : 'críticos'} · {t.secundarios} {t.secundarios === 1 ? 'secundario' : 'secundarios'}
          </span>
          <span>actualizado {t.actualizado}</span>
        </div>

        {t.sugerencia && (
          <div className="sugerencia">
            <span>{t.sugerencia.texto}</span>
            <button type="button" className="btn-texto" onClick={() => acciones.aplicarSugerencia(a.id, t.sugerencia!.estado)}>
              marcar
            </button>
          </div>
        )}

        {t.filas.length === 0 && !t.sugerencia && (
          <div className="manuscrita suave" style={{ fontSize: 21 }}>
            nada que hacer aquí por ahora
          </div>
        )}

        <ul className="lista-limpia" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filas.map(({ p, esCritico, quieto, enHoy }) => (
            <li key={p.id} className="fila">
              <button type="button" className="casilla" aria-label={`Marcar como hecho: ${p.titulo}`} onClick={() => acciones.marcarHecho(p)}>
                <span />
              </button>
              <div className="fila__cuerpo">
                <button type="button" className="fila__texto" onClick={() => acciones.abrir(p)}>
                  {p.titulo}
                </button>
                <div className="fila__meta">
                  {esCritico ? <span className="tag-critico">crítico</span> : <span className="tag-secundario">secundario</span>}
                  {p.categoria && <span className="datos">{p.categoria.toLowerCase()}</span>}
                  {quieto && <span className="tag-quieto">sin movimiento +2 sem</span>}
                </div>
              </div>
              <button
                type="button"
                className="pin"
                aria-pressed={enHoy}
                disabled={!enHoy && lleno}
                title={!enHoy && lleno ? 'Ya elegiste 3 para hoy' : undefined}
                onClick={() => acciones.alternarHoy(p)}
              >
                {enHoy ? 'en hoy' : '+ hoy'}
              </button>
            </li>
          ))}
        </ul>

        {t.filas.length > VISIBLES && (
          <button type="button" className="btn-texto" style={{ alignSelf: 'flex-start' }} aria-expanded={verTodo} onClick={() => setVerTodo(!verTodo)}>
            {verTodo ? 'ver menos' : `ver ${t.filas.length - VISIBLES} más`}
          </button>
        )}

        {t.espera.length > 0 && (
          <div style={{ borderTop: '1px dashed var(--linea-2)', paddingTop: 4, display: 'flex', flexDirection: 'column' }}>
            <button type="button" className="btn-texto btn-texto--rojo" style={{ alignSelf: 'flex-start' }} aria-expanded={verEspera} onClick={() => setVerEspera(!verEspera)}>
              {verEspera ? 'ocultar · ' : ''}esperando a otros · {t.espera.length}
            </button>
            {verEspera && (
              <ul className="lista-limpia" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 6px' }}>
                {t.espera.map((p) => (
                  <li key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button type="button" className="fila__texto" style={{ fontSize: 15 }} onClick={() => acciones.abrir(p)}>
                      {p.titulo}
                    </button>
                    <span className="datos">
                      {p.tipo === 'Crítico' ? 'crítico · ' : ''}
                      {p.nota || 'espera decisión'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Papel>
  )
}
