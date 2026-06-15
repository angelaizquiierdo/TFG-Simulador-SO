import { describe, it, expect } from 'vitest';
import { SJF } from '../../../../src/core/algorithms/non-preemptive/sjf.js';
import { run } from '../../../../src/core/simulate.js';
import type { Process } from '../../../../src/core/types/process.js';

const algo = new SJF();
function intervalStr(r: ReturnType<typeof run>): string[] {
  return r.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

describe('T-18 · SJF', () => {
  it('select devuelve el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2 },
    ] as const;
    expect(algo.select(ready).id).toBe('P2');
  });

  it('select lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('BEHAVIOURS § SJF caso 1: P1(0,5),P2(1,2),P3(2,4),P4(3,1)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 4 },
      { id: 'P4', arrival_time: 3, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-5]', 'P4[5-6]', 'P2[6-8]', 'P3[8-12]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(3.25);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(6.25);
  });

  it('BEHAVIOURS § SJF caso 2: con dos inactividades', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 3 },
      { id: 'P4', arrival_time: 12, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual([
      'P1[0-2]', 'null[2-5]', 'P2[5-7]', 'P3[7-10]', 'null[10-12]', 'P4[12-13]',
    ]);
  });

  it('BEHAVIOURS § SJF caso 3: desempate por id cuando mismo burst', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P2[0-2]', 'P3[2-5]', 'P1[5-9]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(5.33);
  });
});
