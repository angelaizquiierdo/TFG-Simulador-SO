import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub-t09',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-09: Modo none (no expropiativo) — FCFS', () => {
  it('P1(0,3), P2(2,2) → P1[0–3], P2[3–5]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfsStub,
    );
    expect(result.intervals).toContainEqual({ pid: 'P1', start: 0, end: 3 });
    expect(result.intervals).toContainEqual({ pid: 'P2', start: 3, end: 5 });
    expect(result.intervals).toHaveLength(2);
  });

  it('P2 no expropia a P1 aunque llegue mientras P1 está en CPU', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfsStub,
    );
    // En ticks 0,1,2 P1 debe estar en CPU
    expect(result.history[0]?.onCPU).toBe('P1');
    expect(result.history[1]?.onCPU).toBe('P1');
    expect(result.history[2]?.onCPU).toBe('P1');
  });
});
