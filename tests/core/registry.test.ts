import { describe, it, expect, beforeEach } from 'vitest';
import { register, get } from '../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Algoritmo mínimo de prueba
const stubAlgo: IAlgorithm = {
  name: 'stub',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos listos');
    return first;
  },
};

describe('registry', () => {
  beforeEach(() => {
    // Registrar de nuevo en cada test por si el singleton ya tiene el valor
    register(stubAlgo);
  });

  it('recupera el algoritmo registrado por name', () => {
    const algo = get('stub');
    expect(algo.name).toBe('stub');
  });

  it('lanza error con nombre descriptivo cuando el algoritmo no existe', () => {
    expect(() => get('inexistente')).toThrow('inexistente');
  });
});
