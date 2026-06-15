import { describe, it, expect, beforeEach } from 'vitest';
import { register, get } from '../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Algoritmo mínimo de prueba
const minimalAlgo: IAlgorithm = {
  name: 'test-algo',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('No hay procesos listos');
    return first;
  },
};

describe('registry', () => {
  beforeEach(() => {
    // Registrar el algoritmo antes de cada test
    register(minimalAlgo);
  });

  it('recupera un algoritmo registrado por name', () => {
    const algo = get('test-algo');
    expect(algo).toBe(minimalAlgo);
    expect(algo.name).toBe('test-algo');
  });

  it('lanza error con mensaje descriptivo si el nombre no existe', () => {
    expect(() => get('algoritmo-inexistente')).toThrow(
      'Algoritmo no registrado: "algoritmo-inexistente"',
    );
  });
});
