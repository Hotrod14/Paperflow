import { describe, expect, it } from 'vitest'
import { alternarCasilla, bloqueDe, enLinea, sinFormato } from './formato.ts'

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
    expect(enLinea('_ojo_ con user_id')).toEqual([{ tipo: 'i', hijos: ['ojo'] }, ' con user_id'])
  })

  it('sinFormato deja solo el texto', () => {
    expect(sinFormato('# Título\n- [ ] {azul:**hola**} ==ya==\n---')).toBe('Título\nhola ya\n')
  })
})

describe('casillas', () => {
  it('marca la casilla correcta', () => {
    expect(alternarCasilla('- [ ] a\nx\n- [ ] b', 1)).toBe('- [ ] a\nx\n- [x] b')
  })
})
