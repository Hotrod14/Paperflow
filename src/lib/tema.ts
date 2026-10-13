import { useEffect, useState } from 'react'

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'paperflow:tema'
const COLOR_BARRA: Record<Tema, string> = { claro: '#C7D0BC', oscuro: '#1B1E19' }

function delSistema(): Tema {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro'
  } catch {
    return 'claro'
  }
}

function guardado(): Tema | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'claro' || v === 'oscuro' ? v : null
  } catch {
    return null
  }
}

function aplicar(tema: Tema) {
  document.documentElement.dataset.tema = tema
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', COLOR_BARRA[tema]))
}

/**
 * Tema elegido a mano (se recuerda en este navegador). Si nunca se eligió,
 * sigue al sistema y cambia solo cuando el sistema cambia.
 */
export function useTema(): [Tema, (t: Tema) => void] {
  const [elegido, setElegido] = useState<Tema | null>(guardado)
  const [sistema, setSistema] = useState<Tema>(delSistema)

  useEffect(() => {
    let mq: MediaQueryList | null = null
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return
    }
    const alCambiar = () => setSistema(mq!.matches ? 'oscuro' : 'claro')
    mq.addEventListener('change', alCambiar)
    return () => mq!.removeEventListener('change', alCambiar)
  }, [])

  const tema = elegido ?? sistema
  useEffect(() => aplicar(tema), [tema])

  function elegir(t: Tema) {
    setElegido(t)
    try {
      localStorage.setItem(CLAVE, t)
    } catch {
      /* sin almacenamiento: vale solo para esta visita */
    }
  }

  return [tema, elegir]
}
