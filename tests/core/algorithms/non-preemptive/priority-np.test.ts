import { describe, it, expect } from 'vitest';
import { PriorityNP } from '../../../../src/core/algorithms/non-preemptive/priority-np.js';
import { run } from '../../../../src/core/simulate.js';
import type { Process } from '../../../../src/core/types/process.js';

const algo = new PriorityNP();
function intervalStr(r: ReturnType<typeof run>): string[] {
  return r.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

describe('T-20 · Prioridad NP', () => {
  it('select devuelve el proceso con menor priority', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2, priority: 1 },
    ] as const;
    expect(algo.select(ready).id).toBe('P2');
  });

  it('select lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('requires.priority es true', () => {
    expect(algo.requires.priority).toBe(true);
  });

  it('BEHAVIOURS § Prioridad NP caso 1: P1(0,3,p3),P2(1,2,p2),P3(2,2,p2)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 2 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'P2[3-5]', 'P3[5-7]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(1.67);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(4);
  });

  it('BEHAVIOURS § Prioridad NP caso 2: P1(0,3,p3),P2(1,2,p1),P3(2,4,p2)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 1 },
      { id: 'P3', arrival_time: 2, burst_time: 4, priority: 2 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'P2[3-5]', 'P3[5-9]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(1.67);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(4.67);
  });

  it('BEHAVIOURS § Prioridad NP caso 3: con inactividad', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2, priority: 1 },
      { id: 'P2', arrival_time: 4, burst_time: 2, priority: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 2, priority: 2 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-2]', 'null[2-4]', 'P2[4-6]', 'P3[6-8]']);
  });

  it('BEHAVIOURS § Prioridad NP caso 4: desempate por id', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4, priority: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 3, priority: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P3[0-2]', 'P2[2-5]', 'P1[5-9]']);
  });

  it('BEHAVIOURS § proceso sin priority se trata con Infinity (prioridad más baja)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 1, priority: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    // P2 con priority=1 gana sobre P1 sin priority (Infinity)
    expect(result.intervals[0]?.pid).toBe('P2');
    expect(() => run(processes, { algorithm: algo })).not.toThrow();
  });
});
