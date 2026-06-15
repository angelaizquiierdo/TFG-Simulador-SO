import { describe, it, expect } from 'vitest';
import { LJF } from '../../../../src/core/algorithms/non-preemptive/ljf.js';
import { run } from '../../../../src/core/simulate.js';
import type { Process } from '../../../../src/core/types/process.js';

const algo = new LJF();
function intervalStr(r: ReturnType<typeof run>): string[] {
  return r.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

describe('T-19 · LJF', () => {
  it('select devuelve el proceso con mayor burst_time', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4, remaining: 4 },
    ] as const;
    expect(algo.select(ready).id).toBe('P2');
  });

  it('select lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('BEHAVIOURS § LJF caso 1: P1(0,2),P2(0,4),P3(0,3)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4 },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P2[0-4]', 'P3[4-7]', 'P1[7-9]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(3.67);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(6.67);
  });

  it('BEHAVIOURS § LJF caso 2: con inactividad', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
      { id: 'P3', arrival_time: 6, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P2[0-3]', 'P1[3-5]', 'null[5-6]', 'P3[6-9]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(1);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(3.67);
  });
});
