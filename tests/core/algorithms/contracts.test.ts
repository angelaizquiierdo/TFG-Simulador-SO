import { describe, it, expect } from 'vitest';
import { register, get } from '../../../src/core/registry.js';
import { run } from '../../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../../src/core/types/algorithm.js';
import type { Process } from '../../../src/core/types/process.js';

// Algoritmo externo mínimo — implementa IAlgorithm sin tocar el motor ni algoritmos existentes
class ExternalAlgo implements IAlgorithm {
  readonly name = 'external-test';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('La cola de listos está vacía');
    return first;
  }
}

describe('T-24 · Contrato de extensibilidad', () => {
  it('algoritmo externo registrado por nombre se puede recuperar y ejecutar', () => {
    const ext = new ExternalAlgo();
    register(ext);
    const retrieved = get('external-test');
    expect(retrieved.name).toBe('external-test');

    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: retrieved });
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBe(2);
  });

  it('algoritmo externo produce resultado sin modificar el motor', () => {
    const ext = new ExternalAlgo();
    const processes: Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 3 }];
    const result = run(processes, { algorithm: ext });
    expect(result.intervals[0]?.pid).toBe('P1');
    expect(result.metrics.perProcess[0]?.completion).toBe(3);
  });

  it('BEHAVIOURS § select con cola vacía lanza error', () => {
    const ext = new ExternalAlgo();
    expect(() => ext.select([])).toThrow('La cola de listos está vacía');
  });
});
