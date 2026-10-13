import type { Tema } from '../lib/tema.ts'

function Sol() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </svg>
  )
}

function Luna() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  )
}

/** Dos botones con ícono y palabra: el activo queda marcado. `compacto` deja solo los íconos (con nombre accesible). */
export function SelectorTema({ tema, onCambiar, compacto = false }: { tema: Tema; onCambiar: (t: Tema) => void; compacto?: boolean }) {
  return (
    <div role="group" aria-label="Tema" className={`tema${compacto ? ' tema--compacto' : ''}`}>
      <button type="button" aria-pressed={tema === 'claro'} title="Tema claro" onClick={() => onCambiar('claro')}>
        <Sol />
        <span className="tema__texto">claro</span>
      </button>
      <button type="button" aria-pressed={tema === 'oscuro'} title="Tema oscuro" onClick={() => onCambiar('oscuro')}>
        <Luna />
        <span className="tema__texto">oscuro</span>
      </button>
    </div>
  )
}
