/**
 * T-24: Contrato de extensibilidad
 * Algoritmo mínimo definido fuera de src/core/algorithms/ (en el propio test).
 * Lo registramos y ejecutamos run() sin tocar el motor ni los algoritmos existentes.
 */
import { describe, it, expect } from 'vitest';
import { register, get } from '../../../src/core/registry.js';
import { run } from '../../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../../src/core/types/algorithm.js';

// Algoritmo externo mínimo: siempre elige el primer proceso
const externalAlgo: IAlgorithm = {
  name: 'external-test-algo',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-24: Extensibilidad — algoritmo externo', () => {
  it('se puede registrar y recuperar por nombre sin tocar el motor', () => {
    register(externalAlgo);
    const retrieved = get('external-test-algo');
    expect(retrieved.name).toBe('external-test-algo');
  });

  it('el motor ejecuta el algoritmo externo y devuelve SimulationResult válido', () => {
    const algo = get('external-test-algo');
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
      ],
      algo,
    );
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBe(2);
  });
});
