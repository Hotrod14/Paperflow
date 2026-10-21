import { useEffect, useState } from 'react'

export type Tema = 'claro' | 'oscuro'
export type Fondo = 'salvia' | 'cafe' | 'madera' | 'pizarra' | 'nogal'

/**
 * Fondos de la mesa. Los colores reales viven en app.css ([data-fondo]); aquí solo nombre y muestra.
 * `imagen` es la miniatura de los fondos que son una foto (public/fondos); `muestra` sigue sirviendo de color de relleno.
 */
export const FONDOS: { id: Fondo; nombre: string; muestra: Record<Tema, string>; imagen?: string }[] = [
  { id: 'salvia', nombre: 'salvia', muestra: { claro: '#C7D0BC', oscuro: '#1B1E19' } },
  { id: 'cafe', nombre: 'café crema', muestra: { claro: '#DCC9AD', oscuro: '#2B2420' } },
  { id: 'madera', nombre: 'madera', muestra: { claro: '#CDA983', oscuro: '#2A1E16' } },
  { id: 'pizarra', nombre: 'pizarra', muestra: { claro: '#BFC8D0', oscuro: '#1C2127' } },
  { id: 'nogal', nombre: 'nogal', muestra: { claro: '#2F1A11', oscuro: '#2F1A11' }, imagen: '/fondos/nogal-muestra.jpg' },
]

const CLAVE_TEMA = 'paperflow:tema'
const CLAVE_FONDO = 'paperflow:fondo'

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    /* sin almacenamiento: vale solo para esta visita */
  }
}

function delSistema(): Tema {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

function aplicar(tema: Tema, fondo: Fondo) {
  const raiz = document.documentElement
  raiz.dataset.tema = tema
  if (fondo === 'salvia') delete raiz.dataset.fondo
  else raiz.dataset.fondo = fondo
  const color = FONDOS.find((f) => f.id === fondo)!.muestra[tema]
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color))
}

/**
 * Apariencia elegida a mano (se recuerda en este navegador).
 * Tema: si nunca se eligió, sigue al sistema. Fondo: salvia por defecto.
 */
export function useApariencia() {
  const [elegido, setElegido] = useState<Tema | null>(() => {
    const v = leer(CLAVE_TEMA)
    return v === 'claro' || v === 'oscuro' ? v : null
  })
  const [sistema, setSistema] = useState<Tema>(delSistema)
  const [fondo, setFondoEstado] = useState<Fondo>(() => {
    const v = leer(CLAVE_FONDO)
    return FONDOS.some((f) => f.id === v) ? (v as Fondo) : 'salvia'
  })

  useEffect(() => {
    let mq: MediaQueryList
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const alCambiar = () => setSistema(mq.matches ? 'oscuro' : 'claro')
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  const tema = elegido ?? sistema
  useEffect(() => aplicar(tema, fondo), [tema, fondo])

  return {
    tema,
    fondo,
    setTema: (t: Tema) => {
      setElegido(t)
      guardar(CLAVE_TEMA, t)
    },
    setFondo: (f: Fondo) => {
      setFondoEstado(f)
      guardar(CLAVE_FONDO, f)
    },
  }
}
