import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Stub FCFS: devuelve el primer proceso (ya viene ordenado por tiebreak)
const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-07: CPU inactiva', () => {
  it('onCPU es null en ticks 0 y 1 cuando P1 llega en t=2', () => {
    const result = run([{ id: 'P1', arrival_time: 2, burst_time: 2 }], fcfsStub);
    const h0 = result.history[0];
    const h1 = result.history[1];
    expect(h0?.onCPU).toBeNull();
    expect(h1?.onCPU).toBeNull();
  });

  it('intervals incluyen hueco {pid:null, start:0, end:2} y P1[2-4]', () => {
    const result = run([{ id: 'P1', arrival_time: 2, burst_time: 2 }], fcfsStub);
    expect(result.intervals).toContainEqual({ pid: null, start: 0, end: 2 });
    expect(result.intervals).toContainEqual({ pid: 'P1', start: 2, end: 4 });
  });
});
