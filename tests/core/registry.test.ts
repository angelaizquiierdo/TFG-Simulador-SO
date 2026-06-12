import { describe, it, expect, beforeEach } from 'vitest';
import { register, get } from '../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Algoritmo mínimo para tests
const minimalAlgo: IAlgorithm = {
  name: 'test-algo',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    return ready[0]!;
  },
};

// Limpiar el registro entre tests no es posible directamente (singleton),
// pero los nombres únicos evitan colisiones.

describe('registry', () => {
  it('registra un algoritmo y lo recupera por nombre', () => {
    register(minimalAlgo);
    const retrieved = get('test-algo');
    expect(retrieved).toBe(minimalAlgo);
  });

  it('lanza error descriptivo para un nombre no registrado', () => {
    expect(() => get('algoritmo-inexistente')).toThrow('algoritmo-inexistente');
  });
});
