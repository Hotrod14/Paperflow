import type { Ambito, Pendiente } from '../lib/tipos.ts'
import { MAX_PARA_HOY, type VistaHoy } from '../lib/vista.ts'
import { diasHastaJueves, fechaLarga } from '../lib/fechas.ts'
import { abrirTarea, pasarHoja, trazoLapiz } from '../lib/sonido.ts'
import { Papel } from './Papel.tsx'
import { Tarjeta, type AccionesTarjeta } from './Tarjeta.tsx'

export function SelectorAmbito({ ambito, onCambiar }: { ambito: Ambito; onCambiar: (a: Ambito) => void }) {
  return (
    <div role="group" aria-label="Ámbito" className="selector">
      {(['Trabajo', 'Personal'] as const).map((a) => (
        <button
          key={a}
          type="button"
          aria-pressed={ambito === a}
          onClick={() => {
            pasarHoja()
            onCambiar(a)
          }}
        >
          {a.toLowerCase()}
        </button>
      ))}
    </div>
  )
}

export function Hoy({
  vista,
  ambito,
  onCambiarAmbito,
  acciones,
  onDesmarcar,
  onNuevaTarea,
}: {
  vista: VistaHoy
  ambito: Ambito
  onCambiarAmbito: (a: Ambito) => void
  acciones: AccionesTarjeta
  onDesmarcar: (p: Pendiente) => void
  onNuevaTarea: () => void
}) {
  const r = vista.resumen
  const huecos = Math.max(0, MAX_PARA_HOY - vista.abiertosEnHoy)
  const dJueves = diasHastaJueves()
  const sueltas = vista.tarjetas.filter((t) => t.sueltas)
  const auditorias = vista.tarjetas.filter((t) => !t.sueltas)

  return (
    <>
      <div className="columna-principal">
        <div className="cabecera">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="datos" style={{ fontSize: 13 }}>
              {fechaLarga()}
            </span>
            <h1 className="titulo-pagina">¿qué tengo hoy?</h1>
            <span className="suave" style={{ fontSize: 17 }}>
              {r.auditorias} {r.auditorias === 1 ? 'auditoría abierta' : 'auditorías abiertas'} · {r.criticos} críticos · {r.secundarios} secundarios
              {r.sueltas > 0 && ` · ${r.sueltas} ${r.sueltas === 1 ? 'tarea suelta' : 'tareas sueltas'}`}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn-mano btn-nueva"
              onClick={() => {
                abrirTarea()
                onNuevaTarea()
              }}
            >
              + tarea suelta
            </button>
            <SelectorAmbito ambito={ambito} onCambiar={onCambiarAmbito} />
          </div>
        </div>

        <Papel as="section" variante="cinta" borde="cinta" className="para-hoy__hoja" aria-labelledby="parahoy-t" girar={-0.35}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <h2 id="parahoy-t" className="titulo-seccion" style={{ fontSize: 34 }}>
              para hoy
            </h2>
            <span className="datos" style={{ fontSize: 13 }}>
              elegidos por ti · {vista.abiertosEnHoy} de {MAX_PARA_HOY}
            </span>
          </div>
          <ol className="lista-limpia" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vista.paraHoy.map(({ p, auditoria, esCritico, deAyer, hecho }) => (
              <li key={p.id} className={`item-hoy${hecho ? ' item-hoy--hecho' : ''}`}>
                <button
                  type="button"
                  className="casilla"
                  aria-pressed={hecho}
                  aria-label={hecho ? `Desmarcar: ${p.titulo}` : `Marcar como hecho: ${p.titulo}`}
                  onClick={() => {
                    trazoLapiz()
                    if (hecho) onDesmarcar(p)
                    else acciones.marcarHecho(p)
                  }}
                >
                  <span style={{ borderColor: 'var(--tinta)' }}>{hecho ? '×' : ''}</span>
                </button>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <button type="button" className="fila__texto item-hoy__texto" onClick={() => acciones.abrir(p)}>
                    {p.titulo}
                  </button>
                  <div className="fila__meta">
                    <span className="datos">{auditoria ? `${auditoria.nombre} · ${auditoria.proyecto ?? ''}` : 'sin origen'}</span>
                    {esCritico && <span className="tag-critico">crítico</span>}
                    {deAyer && <span className="tag-ayer">de ayer</span>}
                  </div>
                </div>
                {!hecho && (
                  <button
                    type="button"
                    className="btn-texto btn-texto--suave"
                    aria-label={`Soltar de para hoy: ${p.titulo}`}
                    onClick={() => {
                      pasarHoja()
                      acciones.alternarHoy(p)
                    }}
                  >
                    soltar
                  </button>
                )}
              </li>
            ))}
            {huecos > 0 && (
              <li className="hueco">
                {vista.abiertosEnHoy === 0
                  ? 'elige hasta 3 pendientes desde las tarjetas · los críticos van primero'
                  : huecos === 1
                    ? 'elige uno más desde las tarjetas'
                    : `puedes elegir ${huecos} más desde las tarjetas`}
              </li>
            )}
          </ol>
        </Papel>

        {sueltas.length > 0 && (
          <section aria-labelledby="sueltas-t" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <h2 id="sueltas-t" className="titulo-seccion">
                tareas sueltas
              </h2>
              <span className="datos" style={{ fontSize: 13 }}>
                lo espontáneo · por proyecto
              </span>
            </div>
            <div className="grilla">
              {sueltas.map((t, i) => (
                <Tarjeta key={t.auditoria.id} t={t} indice={i + 1} lleno={vista.lleno} acciones={acciones} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="auditorias-t" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <h2 id="auditorias-t" className="titulo-seccion">
              por auditoría
            </h2>
            <span className="datos" style={{ fontSize: 13 }}>
              críticas primero · hechos fuera de la vista
            </span>
          </div>

          {auditorias.length === 0 ? (
            <p className="manuscrita suave" style={{ fontSize: 24, margin: 0 }}>
              no hay pendientes de auditorías en {ambito.toLowerCase()}. buen día.
            </p>
          ) : (
            <div className="grilla">
              {auditorias.map((t, i) => (
                <Tarjeta key={t.auditoria.id} t={t} indice={i} lleno={vista.lleno} acciones={acciones} />
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="columna-lateral" aria-label="Resumen">
        <Papel variante="ticket" borde="b" girar={0.4}>
          <div className="ticket">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>resumen del día</span>
              <span style={{ fontSize: 13, color: 'var(--critico)' }}>{ambito.toLowerCase()}</span>
            </div>
            {[
              ['auditorías abiertas', r.auditorias],
              ['críticos', r.criticos],
              ['secundarios', r.secundarios],
              ['tareas sueltas', r.sueltas],
              ['esperando a otros', r.espera],
              ['quietos +2 semanas', r.quietos],
            ].map(([k, v]) => (
              <div key={k} className="ticket__fila">
                <span>{k}</span>
                <span aria-hidden="true" className="ticket__puntos" />
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </Papel>

        <Papel variante="rayado" borde="a" girar={-0.5}>
          <div className="nota-lateral">
            <span className="manuscrita" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
              jueves: reporte
            </span>
            <span className="suave" style={{ fontSize: 15, lineHeight: 1.45 }}>
              {dJueves === 0 ? 'Es hoy.' : `En ${dJueves} ${dJueves === 1 ? 'día' : 'días'}.`} Semana arma lo cerrado, lo abierto y lo detenido, y avisa si falta alguna auditoría.
            </span>
            <a className="btn-mano" href="#semana" style={{ alignSelf: 'flex-start' }} onClick={pasarHoja}>
              abrir semana
            </a>
          </div>
        </Papel>

        <div className="datos" style={{ lineHeight: 1.7, padding: '0 6px' }}>
          <div style={{ fontWeight: 700 }}>leyenda</div>
          <div>
            <span style={{ color: 'var(--critico)' }}>crítico</span> · problema con el que nació la auditoría
          </div>
          <div>
            <span style={{ color: 'var(--secundario)' }}>secundario</span> · se descubrió en el camino
          </div>
          <div>hechos · tachados en "para hoy", fuera de las tarjetas</div>
        </div>
      </aside>
    </>
  )
}
