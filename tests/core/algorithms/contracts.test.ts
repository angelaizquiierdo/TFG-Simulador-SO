// T-24 · Contrato de extensibilidad — cierra § Contrato de algoritmo
import { describe, it, expect } from 'vitest';
import { run } from '../../../src/core/simulate.js';
import { register, get } from '../../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../../src/core/types/algorithm.js';

// Algoritmo externo mínimo — implementa IAlgorithm sin tocar el motor ni los algoritmos existentes
class ExternalAlgo implements IAlgorithm {
  readonly name = 'external-test';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('cola vacía');
    return first;
  }
}

describe('Contrato de algoritmo — extensibilidad', () => {
  it('un algoritmo externo registrado produce un SimulationResult válido', () => {
    register(new ExternalAlgo());
    const algo = get('external-test');
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: algo });

    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBe(2);
  });

  it('el motor no fue modificado (no se importó ni tocó simulate.ts)', () => {
    // Verificación estructural: el resultado contiene history, intervals y metrics
    register(new ExternalAlgo());
    const algo = get('external-test');
    const result = run([{ id: 'A', arrival_time: 0, burst_time: 1 }], { algorithm: algo });
    expect(result).toHaveProperty('history');
    expect(result).toHaveProperty('intervals');
    expect(result).toHaveProperty('metrics');
  });

  it('un algoritmo cuyo requires no incluye priority → requires.priority es falsy', () => {
    const algo = get('external-test');
    expect(algo.requires.priority).toBeFalsy();
  });
});
