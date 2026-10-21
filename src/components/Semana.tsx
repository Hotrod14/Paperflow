import { useEffect, useMemo, useState } from 'react'
import type { Ambito } from '../lib/tipos.ts'
import { guionEstructura, guionOral, type VistaSemana } from '../lib/vista.ts'
import { trazoLapiz } from '../lib/sonido.ts'
import { Papel } from './Papel.tsx'
import { SelectorAmbito } from './Hoy.tsx'

function fechaCorta(iso: string) {
  const [, m, d] = iso.split('-')
  return `${Number(d)}/${Number(m)}`
}

/** Reporte del jueves: lo cerrado, lo abierto y lo detenido, más un chequeo de que no falte ninguna auditoría. */
export function Semana({ vista, ambito, onCambiarAmbito }: { vista: VistaSemana; ambito: Ambito; onCambiarAmbito: (a: Ambito) => void }) {
  const ids = useMemo(() => vista.bloques.map((b) => b.auditoria.id), [vista])
  const [incluidos, setIncluidos] = useState<Set<string>>(() => new Set(ids))
  const [copiado, setCopiado] = useState(false)

  // Si aparecen auditorías nuevas (otra lectura, otro ámbito), entran incluidas por defecto.
  useEffect(() => {
    setIncluidos((prev) => {
      const sig = new Set([...prev].filter((id) => ids.includes(id)))
      for (const id of ids) if (!prev.has(id)) sig.add(id)
      return sig
    })
  }, [ids])

  const faltan = vista.bloques.filter((b) => !incluidos.has(b.auditoria.id))
  const guion = guionOral(vista, incluidos)
  const estructura = guionEstructura(vista, incluidos)

  function alternar(id: string) {
    setIncluidos((prev) => {
      const sig = new Set(prev)
      if (sig.has(id)) sig.delete(id)
      else sig.add(id)
      return sig
    })
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(guion)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  const chequeo = (conEnlace: boolean) => (
    <Papel variante="ticket" borde="b" girar={0.4}>
      <div className="ticket" role="group" aria-labelledby={`esta-todo-${conEnlace ? 'a' : 'b'}`}>
        <span id={`esta-todo-${conEnlace ? 'a' : 'b'}`} style={{ fontSize: 15, fontWeight: 700 }}>
          ¿está todo?
        </span>
        {vista.bloques.map((b) => (
          <label key={b.auditoria.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, minHeight: 32, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={incluidos.has(b.auditoria.id)}
              onChange={() => {
                trazoLapiz()
                alternar(b.auditoria.id)
              }}
            />
            <span>{b.sueltas ? `Tareas sueltas · ${b.auditoria.proyecto ?? ''}` : b.auditoria.nombre}</span>
          </label>
        ))}
        {faltan.length > 0 ? (
          <p role="status" style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--critico)' }}>
            {faltan.length === 1 ? 'falta 1 auditoría' : `faltan ${faltan.length} auditorías`} en el reporte
          </p>
        ) : (
          vista.bloques.length > 0 && (
            <p role="status" style={{ margin: '8px 0 0', fontSize: 14 }}>
              todas incluidas
            </p>
          )
        )}
        {conEnlace && vista.bloques.length > 0 && (
          <button
            type="button"
            className="btn-texto"
            style={{ alignSelf: 'flex-start', fontFamily: 'var(--manuscrita)', fontSize: 20 }}
            onClick={() => {
              // Sin tocar el hash: el hash decide la página (#hoy / #semana).
              const destino = document.getElementById('guion')
              destino?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              destino?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
            }}
          >
            ir al guion ↓
          </button>
        )}
      </div>
    </Papel>
  )

  return (
    <>
      <div className="columna-principal">
        <div className="cabecera">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="datos" style={{ fontSize: 13 }}>
              del {fechaCorta(vista.desde)} al {fechaCorta(vista.hasta)}
            </span>
            <h1 className="titulo-pagina">semana</h1>
            <span className="suave" style={{ fontSize: 17 }}>
              {vista.totalCerrados} {vista.totalCerrados === 1 ? 'cierre' : 'cierres'} en {vista.bloques.length}{' '}
              {vista.bloques.length === 1 ? 'auditoría' : 'auditorías'}
            </span>
          </div>
          <SelectorAmbito ambito={ambito} onCambiar={onCambiarAmbito} />
        </div>

        {vista.bloques.length === 0 ? (
          <p className="manuscrita suave" style={{ fontSize: 24, margin: 0 }}>
            nada que reportar en {ambito.toLowerCase()} esta semana.
          </p>
        ) : (
          vista.bloques.map((b, i) => {
            const a = b.auditoria
            const enlace = a.pagina ?? (a.notionUrl || null)
            return (
              <Papel key={a.id} as="article" borde={i % 2 ? 'b' : 'a'} girar={[-0.25, 0.2, -0.1][i % 3]} aria-label={a.nombre}>
                <div className="bloque-semana">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span className="kicker">{b.sueltas ? 'tareas sueltas' : a.proyecto ?? 'sin proyecto'}</span>
                      <h2 className="tarjeta__titulo">
                        {b.sueltas ? (
                          a.proyecto ?? 'Sin proyecto'
                        ) : enlace ? (
                          <a href={enlace} target="_blank" rel="noreferrer">
                            {a.nombre}
                          </a>
                        ) : (
                          a.nombre
                        )}
                      </h2>
                    </div>
                    {b.detenida ? (
                      <span className="sello sello--neutro">detenida</span>
                    ) : (
                      a.estado && !b.sueltas && <span className={`sello ${a.estado === 'Crítico en curso' ? 'sello--curso' : 'sello--ejecutado'}`}>{a.estado.toLowerCase()}</span>
                    )}
                  </div>

                  {b.cerrados.length > 0 ? (
                    <>
                      <span className="datos">✅ se cerraron {b.cerrados.length}</span>
                      <ul className="lista-limpia" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {b.cerrados.map((p) => (
                          <li key={p.id} style={{ fontSize: 17, lineHeight: 1.4 }}>
                            <s style={{ textDecorationColor: 'var(--tinta-2)' }}>{p.titulo}</s>{' '}
                            <span className="datos">
                              {p.fechaCierre ? fechaCorta(p.fechaCierre) : ''}
                              {p.cerradoPor ? ` · ${p.cerradoPor.toLowerCase()}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <span className="datos">💤 sin cierres esta semana</span>
                  )}

                  {b.sueltas ? (
                    <span className="datos">📌 quedan {b.secundarios} {b.secundarios === 1 ? 'tarea' : 'tareas'}</span>
                  ) : (
                  <span className="datos">
                    📌 quedan{' '}
                    <span style={{ color: 'var(--critico)' }}>
                      {b.criticos} {b.criticos === 1 ? 'crítico' : 'críticos'}
                    </span>{' '}
                    ·{' '}
                    <span style={{ color: 'var(--secundario)' }}>
                      {b.secundarios} {b.secundarios === 1 ? 'secundario' : 'secundarios'}
                    </span>
                    {b.espera.length > 0 && ` · ❓ ${b.espera.length} esperan decisión`}
                  </span>
                  )}
                </div>
              </Papel>
            )
          })
        )}

        {vista.bloques.length > 0 && (
          <section id="guion" className="guion-seccion" aria-labelledby="guion-t">
            <div className="guion-seccion__cabecera">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2 id="guion-t" className="titulo-seccion" tabIndex={-1}>
                  guion oral
                </h2>
                <span className="datos" style={{ fontSize: 13 }}>
                  para el jueves · léelo bloque por bloque
                </span>
              </div>
              <button type="button" className="btn-mano" onClick={copiar} disabled={!guion}>
                {copiado ? 'copiado' : 'copiar guion'}
              </button>
            </div>

            <div className="solo-movil">{chequeo(false)}</div>

            <Papel variante="rayado" borde="a" girar={-0.15}>
              <div className="guion">
                {estructura.bloques.length === 0 && !estructura.detenidas.length ? (
                  <p className="manuscrita suave" style={{ fontSize: 22, margin: 0 }}>
                    marca al menos una auditoría en "¿está todo?".
                  </p>
                ) : (
                  <ol className="lista-limpia guion__lista">
                    {estructura.bloques.map((b) => (
                      <li key={b.id} className="guion__bloque">
                        <h3 className="guion__titulo">
                          <span aria-hidden="true" className="guion__numero">
                            {b.numero}
                          </span>
                          {b.titulo}
                        </h3>
                        <p className="guion__linea">
                          <span aria-hidden="true">{b.cerrados.length ? '✅' : '💤'}</span>{' '}
                          {b.cerrados.length ? `Se ${b.cerrados.length === 1 ? 'cerró' : 'cerraron'} ${b.cerrados.length}` : 'Sin cierres esta semana'}
                        </p>
                        {b.cerrados.length > 0 && (
                          <ul className="guion__cerrados">
                            {b.cerrados.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        )}
                        <p className="guion__linea">
                          <span aria-hidden="true">📌</span> {b.quedan}
                        </p>
                        {b.espera > 0 && (
                          <p className="guion__linea">
                            <span aria-hidden="true">❓</span> Esperan decisión: {b.espera}.
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
                {estructura.detenidas.length > 0 && (
                  <p className="guion__detenido">
                    <span aria-hidden="true">⏸️</span> Detenido: {estructura.detenidas.join(', ')}.
                  </p>
                )}
              </div>
            </Papel>
          </section>
        )}
      </div>

      <aside className="columna-lateral solo-escritorio" aria-label="Preparar reporte">
        {chequeo(true)}

      </aside>
    </>
  )
}
