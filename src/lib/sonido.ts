/** Sonidos de la mesa de papel: acompañan a los botones que cambian, despliegan o marcan el papel. */

/** Un sonido de /public/sonidos: ogg con mp3 de respaldo, cargado al primer uso o al precargar. */
function crearSonido(nombre: string, volumen: number) {
  const fuentes = [
    { url: `/sonidos/${nombre}.ogg`, tipo: 'audio/ogg; codecs="vorbis"' },
    { url: `/sonidos/${nombre}.mp3`, tipo: 'audio/mpeg' },
  ]
  let audio: HTMLAudioElement | null = null

  function obtener(): HTMLAudioElement | null {
    if (audio) return audio
    try {
      const nuevo = new Audio()
      const fuente = fuentes.find((f) => nuevo.canPlayType(f.tipo) !== '') ?? fuentes[fuentes.length - 1]
      nuevo.preload = 'auto'
      nuevo.volume = volumen
      nuevo.src = fuente.url
      audio = nuevo
    } catch {
      /* sin audio en este entorno: la interfaz sigue igual, solo en silencio */
    }
    return audio
  }

  return {
    precargar: () => void obtener(),
    /** Si se pulsa de nuevo antes de terminar, el sonido arranca otra vez desde el principio. */
    reproducir: () => {
      const a = obtener()
      if (!a) return
      try {
        a.currentTime = 0
        a.play().catch(() => {
          /* el navegador puede bloquearlo hasta que haya un gesto del usuario */
        })
      } catch {
        /* ídem */
      }
    },
  }
}

const hoja = crearSonido('pasar-hoja', 0.6)
const lapiz = crearSonido('lapiz', 0.5)
const tarea = crearSonido('abrir-tarea', 1)

/** Hoja pasando: navegar, cambiar de ámbito, desplegar, soltar o fijar en "hoy". */
export const pasarHoja = hoja.reproducir
/** Trazo de lápiz: casillas y "releer". */
export const trazoLapiz = lapiz.reproducir
/** Abrir la hoja de una tarea suelta nueva. */
export const abrirTarea = tarea.reproducir

/** Descarga los sonidos con anticipación para que el primer clic no llegue tarde. */
export function precargarSonidos() {
  hoja.precargar()
  lapiz.precargar()
  tarea.precargar()
}
