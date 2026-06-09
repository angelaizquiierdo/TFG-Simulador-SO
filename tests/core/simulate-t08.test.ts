import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub-t08',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-08: Determinismo y desempate', () => {
  it('dos ejecuciones con los mismos datos producen historiales idénticos', () => {
    const procs = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
    ];
    const r1 = run(procs, fcfsStub);
    const r2 = run(procs, fcfsStub);
    expect(r1.history).toEqual(r2.history);
  });

  it('desempate por id numérico: P2 va antes que P10 (mismo arrival_time)', () => {
    // Con FCFS y mismo arrival_time, P2 (num=2) debe ir antes que P10 (num=10)
    const procs = [
      { id: 'P10', arrival_time: 0, burst_time: 1 },
      { id: 'P2', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(procs, fcfsStub);
    // El primer tick debe tener P2 en CPU, no P10
    expect(result.history[0]?.onCPU).toBe('P2');
  });
});
