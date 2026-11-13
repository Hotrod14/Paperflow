import { describe, expect, it } from 'vitest'
import {
  alternarBloque,
  alternarCasilla,
  alternarMarca,
  aplicarColor,
  bloqueDe,
  enLinea,
  enterEnLista,
  sinFormato,
} from './formato.ts'

const aplicar = (t: string, c: { inicio: number; fin: number; texto: string }) => t.slice(0, c.inicio) + c.texto + t.slice(c.fin)

describe('bloques', () => {
  it('reconoce títulos, listas, casillas, destacados y separadores', () => {
    expect(bloqueDe('# Hola')).toEqual({ tipo: 'h1', texto: 'Hola' })
    expect(bloqueDe('### Sección')).toEqual({ tipo: 'h3', texto: 'Sección' })
    expect(bloqueDe('- [x] listo')).toEqual({ tipo: 'casilla', texto: 'listo', hecho: true })
    expect(bloqueDe('- punto')).toEqual({ tipo: 'lista', texto: 'punto' })
    expect(bloqueDe('> ojo')).toEqual({ tipo: 'cita', texto: 'ojo' })
    expect(bloqueDe('---').tipo).toBe('separador')
    expect(bloqueDe('#sin espacio').tipo).toBe('parrafo')
  })
})

describe('formato dentro de la línea', () => {
  it('negrita gana a cursiva y se anidan colores', () => {
    expect(enLinea('a **b** c')).toEqual(['a ', { tipo: 'b', hijos: ['b'] }, ' c'])
    expect(enLinea('{rojo:**urgente**}')).toEqual([{ tipo: 'color', color: 'rojo', hijos: [{ tipo: 'b', hijos: ['urgente'] }] }])
    expect(enLinea('`user_id` *x*')).toEqual([{ tipo: 'code', texto: 'user_id' }, ' ', { tipo: 'i', hijos: ['x'] }])
  })

  it('sinFormato deja solo el texto', () => {
    expect(sinFormato('# Título\n- [ ] {azul:**hola**} ==ya==\n---')).toBe('Título\nhola ya\n')
  })
})

describe('edición', () => {
  it('envuelve y desenvuelve una marca', () => {
    const t = 'hola mundo'
    const c = alternarMarca(t, 5, 10, '**')
    const t2 = aplicar(t, c)
    expect(t2).toBe('hola **mundo**')
    expect(aplicar(t2, alternarMarca(t2, c.selInicio, c.selFin, '**'))).toBe('hola mundo')
  })

  it('aplica, cambia y quita colores', () => {
    const t = 'aviso'
    const c = aplicarColor(t, 0, 5, 'rojo')
    const t2 = aplicar(t, c)
    expect(t2).toBe('{rojo:aviso}')
    expect(aplicar(t2, aplicarColor(t2, c.selInicio, c.selFin, 'azul'))).toBe('{azul:aviso}')
    expect(aplicar(t2, aplicarColor(t2, c.selInicio, c.selFin, null))).toBe('aviso')
  })

  it('pone y quita bloques en varias líneas', () => {
    const t = 'uno\ndos'
    const t2 = aplicar(t, alternarBloque(t, 0, t.length, '- '))
    expect(t2).toBe('- uno\n- dos')
    expect(aplicar(t2, alternarBloque(t2, 0, t2.length, '- '))).toBe('uno\ndos')
    expect(aplicar('## a', alternarBloque('## a', 1, 1, '# '))).toBe('# a')
  })

  it('Enter sigue la lista y la termina si el ítem está vacío', () => {
    const t = '- [x] hecho'
    expect(aplicar(t, enterEnLista(t, t.length)!)).toBe('- [x] hecho\n- [ ] ')
    expect(aplicar('a\n- ', enterEnLista('a\n- ', 4)!)).toBe('a\n')
    expect(enterEnLista('texto', 5)).toBeNull()
  })

  it('marca la casilla correcta', () => {
    expect(alternarCasilla('- [ ] a\nx\n- [ ] b', 1)).toBe('- [ ] a\nx\n- [x] b')
  })
})
