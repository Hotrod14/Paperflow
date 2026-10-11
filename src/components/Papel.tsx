import type { ReactNode } from 'react'

type Variante = 'hoja' | 'cinta' | 'ticket' | 'rayado'

/** Una hoja de papel apoyada en la mesa: sombra corta, borde irregular y fibra sutil. */
export function Papel({
  children,
  variante = 'hoja',
  borde = 'a',
  girar = 0,
  className = '',
  as: Etiqueta = 'div',
  ...resto
}: {
  children: ReactNode
  variante?: Variante
  borde?: 'a' | 'b' | 'cinta'
  girar?: number
  className?: string
  as?: 'div' | 'section' | 'article' | 'aside' | 'nav'
  'aria-label'?: string
  'aria-labelledby'?: string
  id?: string
}) {
  const clase = ['papel', variante !== 'hoja' && `papel--${variante}`, `borde-${borde}`, className].filter(Boolean).join(' ')
  return (
    <Etiqueta className="papel-sombra" style={girar ? { transform: `rotate(${girar}deg)` } : undefined} {...resto}>
      <div className={clase}>{children}</div>
    </Etiqueta>
  )
}

export function Ramita() {
  return (
    <svg className="ramita" aria-hidden="true" width="220" height="320" viewBox="0 0 220 320">
      <path d="M40 320 C 70 240, 110 160, 190 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M62 268 C 40 250, 22 252, 8 262 M74 244 C 100 228, 122 232, 136 244 M84 222 C 60 204, 44 204, 30 214 M98 196 C 122 180, 146 184, 158 196 M110 174 C 88 156, 72 156, 58 166 M124 150 C 148 136, 168 140, 178 152 M136 128 C 116 110, 100 110, 88 120 M150 104 C 172 92, 190 96, 198 108 M160 84 C 142 68, 128 68, 118 78"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
