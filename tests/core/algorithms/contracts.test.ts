import { describe, it, expect } from 'vitest';
import type { IAlgorithm, ReadyProcess } from '../../../src/core/types/algorithm.js';
import { register } from '../../../src/core/registry.js';
import { run } from '../../../src/core/simulate.js';

// Algoritmo externo mínimo creado fuera de src/core/algorithms/
// Solo implementa select() — sin lógica del motor.
class TestAlgorithm implements IAlgorithm {
  readonly name = 'test-algo';
  readonly preemptionMode = 'none' as const;
  readonly requires: { priority?: boolean; quantum?: boolean } = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) {
      throw new Error('select() llamado con la cola de listos vacía');
    }
    const first = ready[0];
    if (first === undefined) throw new Error('select() llamado con la cola de listos vacía');
    return first;
  }
}

describe('Contrato de algoritmo (extensibilidad)', () => {
  it('un algoritmo externo registrado produce resultado sin modificar el motor', () => {
    register(new TestAlgorithm());
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: 'test-algo' });
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBe(2);
  });

  it('un algoritmo cuyo requires no incluye priority → requires.priority es falsy', () => {
    const algo = new TestAlgorithm();
    expect(algo.requires.priority).toBeFalsy();
  });

  it('lanza error cuando la cola de listos está vacía', () => {
    const algo = new TestAlgorithm();
    expect(() => algo.select([])).toThrow();
  });
});
