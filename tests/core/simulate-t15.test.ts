// T-15 · Aislamiento de dependencias — el motor corre en Node sin React ni DOM
import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Este archivo se ejecuta en entorno Node (sin jsdom).
// El simple hecho de importar `run` sin errores verifica que no hay imports de React/DOM.

const fcfs: IAlgorithm = {
  name: 'fcfs-node',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
};

describe('T-15 · Simulador independiente de la vista', () => {
  it('importa run() desde Node sin React ni DOM y ejecuta FCFS sin error', () => {
    // Si hubiera imports de React/DOM, este test fallaría en entorno node.
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
      ],
      { algorithm: fcfs },
    );
    expect(result).toBeDefined();
  });

  it('el SimulationResult contiene history, intervals y metrics con al menos un elemento', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 1, burst_time: 3 },
      ],
      { algorithm: fcfs },
    );
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.intervals.length).toBeGreaterThan(0);
    expect(result.metrics.perProcess.length).toBeGreaterThan(0);
  });
});
