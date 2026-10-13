import { useEffect, useMemo, useState } from 'react'
import type { Ambito } from '../lib/tipos.ts'
import { guionOral, type VistaSemana } from '../lib/vista.ts'
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
                    <span className="datos">✅ sin cierres esta semana</span>
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
      </div>

      <aside className="columna-lateral" aria-label="Preparar reporte">
        <Papel variante="ticket" borde="b" girar={0.4}>
          <fieldset className="ticket" style={{ border: 0, margin: 0 }}>
            <legend style={{ fontSize: 15, fontWeight: 700, padding: 0, marginBottom: 6 }}>¿está todo?</legend>
            {vista.bloques.map((b) => (
              <label key={b.auditoria.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, minHeight: 32, cursor: 'pointer' }}>
                <input type="checkbox" checked={incluidos.has(b.auditoria.id)} onChange={() => alternar(b.auditoria.id)} />
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
          </fieldset>
        </Papel>

        <Papel variante="rayado" borde="a" girar={-0.4}>
          <div className="nota-lateral">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span className="manuscrita" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
                guion oral
              </span>
              <button type="button" className="btn-mano" onClick={copiar} disabled={!guion}>
                {copiado ? 'copiado' : 'copiar'}
              </button>
            </div>
            <pre className="guion">{guion || 'marca al menos una auditoría.'}</pre>
          </div>
        </Papel>
      </aside>
    </>
  )
}
