import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub-t14',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-14: Casos límite', () => {
  it('sin procesos → history vacío sin error', () => {
    const result = run([], fcfsStub);
    expect(result.history).toEqual([]);
    expect(result.intervals).toEqual([]);
    expect(result.metrics.perProcess).toEqual([]);
  });

  it('burst_time=0 → lanza error "La ráfaga debe ser mayor que 0"', () => {
    expect(() =>
      run([{ id: 'P1', arrival_time: 0, burst_time: 0 }], fcfsStub),
    ).toThrow('La ráfaga debe ser mayor que 0');
  });
});
