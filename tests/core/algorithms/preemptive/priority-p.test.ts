import { describe, it, expect } from 'vitest';
import { PriorityP } from '../../../../src/core/algorithms/preemptive/priority-p.js';
import { run } from '../../../../src/core/simulate.js';
import type { Process } from '../../../../src/core/types/process.js';

const algo = new PriorityP();
function intervalStr(r: ReturnType<typeof run>): string[] {
  return r.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

describe('T-22 · Prioridad P (expropiativa)', () => {
  it('select devuelve el proceso con menor priority', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 4, remaining: 4, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, remaining: 2, priority: 1 },
    ] as const;
    expect(algo.select(ready).id).toBe('P3');
  });

  it('select lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('BEHAVIOURS § Prioridad P caso 1: P1(0,4,p2),P2(1,2,p2),P3(2,2,p1)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-2]', 'P3[2-4]', 'P1[4-6]', 'P2[6-8]']);
    const m = result.metrics.perProcess;
    expect(m.find((x) => x.id === 'P3')?.completion).toBe(4);
    expect(m.find((x) => x.id === 'P1')?.completion).toBe(6);
    expect(m.find((x) => x.id === 'P2')?.completion).toBe(8);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(5);
  });

  it('BEHAVIOURS § Prioridad P caso 2: P1(0,5,p3),P2(1,3,p2),P3(2,2,p1)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 3, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual([
      'P1[0-1]', 'P2[1-2]', 'P3[2-4]', 'P2[4-6]', 'P1[6-10]',
    ]);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(5.67);
  });

  it('BEHAVIOURS § Prioridad P caso 3: con inactividad', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2, priority: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 4, priority: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual([
      'P1[0-2]', 'null[2-4]', 'P2[4-5]', 'P3[5-7]', 'P2[7-10]',
    ]);
  });

  it('BEHAVIOURS § Prioridad P caso 4: sin expropiación (P1 ya tiene la mejor prioridad)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 3 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'P2[3-5]', 'P3[5-7]']);
  });

  it('BEHAVIOURS § proceso sin priority se trata con Infinity', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 1, priority: 1 },
    ];
    expect(() => run(processes, { algorithm: algo })).not.toThrow();
  });
});
