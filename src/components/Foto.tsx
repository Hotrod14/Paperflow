import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Una foto pegada en la hoja con cinta. Su alto se redondea a renglones completos
 * para que el texto que sigue caiga sobre las líneas.
 */
export function Foto({ url, alt, onFalla, onAbrir }: { url?: string; alt: string; onFalla?: () => void; onAbrir?: () => void }) {
  const marcoRef = useRef<HTMLSpanElement>(null)
  const [alto, setAlto] = useState<number | undefined>(undefined)
  useLayoutEffect(() => {
    const m = marcoRef.current
    if (!m) return
    const medir = () => {
      const r = renglonDe(m)
      setAlto(Math.ceil((m.offsetHeight + 24) / r) * r)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(m)
    return () => ro.disconnect()
  }, [url])
  return (
    <figure className="foto" style={{ height: alto }}>
      <span className="foto__marco" ref={marcoRef}>
        {url ? (
          <button type="button" className="foto__abrir" onClick={onAbrir} title="ver en tamaño completo">
            <img src={url} alt={alt} loading="lazy" onError={onFalla} />
          </button>
        ) : (
          <span className="foto__vacia datos">cargando imagen…</span>
        )}
      </span>
    </figure>
  )
}

const RENGLON = 32
/** Alto de renglón vigente en la hoja (depende de la densidad elegida). */
export const renglonDe = (el: Element) => parseFloat(getComputedStyle(el).getPropertyValue('--renglon')) || RENGLON

