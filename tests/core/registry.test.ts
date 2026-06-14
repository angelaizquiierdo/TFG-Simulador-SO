import { describe, it, expect } from 'vitest';
import { register, get } from '../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Algoritmo mínimo para pruebas
const stubAlgo: IAlgorithm = {
  name: 'stub-registry',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

describe('registry', () => {
  it('recupera un algoritmo registrado por su nombre exacto', () => {
    register(stubAlgo);
    expect(get('stub-registry')).toBe(stubAlgo);
  });

  it('sobrescribe un algoritmo si se registra con el mismo nombre', () => {
    const updated: IAlgorithm = { ...stubAlgo };
    register(updated);
    expect(get('stub-registry')).toBe(updated);
  });

  it('lanza error cuando el nombre no existe, con lista de disponibles', () => {
    register(stubAlgo); // asegura que haya al menos un algoritmo
    expect(() => get('no-existe')).toThrow(/no-existe/);
    expect(() => get('no-existe')).toThrow(/stub-registry/);
  });

  it('el mensaje de error incluye el nombre buscado', () => {
    register(stubAlgo);
    let msg = '';
    try { get('algoritmo-fantasma'); } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain('algoritmo-fantasma');
  });
});
