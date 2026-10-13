import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/api.ts'
import { Papel, Ramita } from './Papel.tsx'
import { SelectorTema } from './SelectorTema.tsx'
import type { Tema } from '../lib/tema.ts'

/** Acceso con enlace mágico. No hay registro: solo el correo creado en Supabase puede entrar. */
export function Login({ tema, onCambiarTema }: { tema: Tema; onCambiarTema: (t: Tema) => void }) {
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado' | 'error'>('listo')
  const [mensaje, setMensaje] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    })
    if (error) {
      setEstado('error')
      setMensaje('No se pudo enviar el enlace. Revisa el correo e intenta de nuevo.')
    } else {
      setEstado('enviado')
    }
  }

  return (
    <div className="mesa" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
      <Ramita />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 5 }}>
        <SelectorTema tema={tema} onCambiar={onCambiarTema} />
      </div>
      <Papel as="section" borde="b" girar={-0.4} aria-labelledby="login-t">
        <form onSubmit={enviar} style={{ width: 'min(420px, 88vw)', padding: '32px 30px 30px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="marca">paperflow</span>
          <h1 id="login-t" className="titulo-seccion" style={{ fontSize: 30 }}>
            entra con tu correo
          </h1>
          {estado === 'enviado' ? (
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5 }}>
              Te envié un enlace a <strong>{correo}</strong>. Ábrelo en este mismo navegador.
            </p>
          ) : (
            <>
              <div className="campo">
                <label htmlFor="correo" className="datos">
                  correo
                </label>
                <input id="correo" type="email" required autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
              </div>
              <button className="btn-mano" type="submit" disabled={estado === 'enviando'} style={{ alignSelf: 'flex-start' }}>
                {estado === 'enviando' ? 'enviando…' : 'enviar enlace'}
              </button>
              {estado === 'error' && (
                <p role="alert" style={{ margin: 0, color: 'var(--critico)' }}>
                  {mensaje}
                </p>
              )}
            </>
          )}
        </form>
      </Papel>
    </div>
  )
}
