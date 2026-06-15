import { describe, it, expect } from 'vitest';
import { FCFS } from '../../../../src/core/algorithms/non-preemptive/fcfs.js';
import { run } from '../../../../src/core/simulate.js';
import type { Process } from '../../../../src/core/types/process.js';

const algo = new FCFS();

function intervalStr(result: ReturnType<typeof run>): string[] {
  return result.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

describe('T-17 · FCFS', () => {
  it('select devuelve el primer proceso de la lista (FIFO)', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2 },
    ] as const;
    expect(algo.select(ready).id).toBe('P1');
  });

  it('select lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow('La cola de listos está vacía');
  });

  it('preemptionMode es none', () => {
    expect(algo.preemptionMode).toBe('none');
  });

  it('BEHAVIOURS § Simular FCFS caso 1: P1(0,3),P2(2,2),P3(1,4)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'P3[3-7]', 'P2[7-9]']);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(2.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(5.33);
  });

  it('BEHAVIOURS § Simular FCFS caso 2: con CPU inactiva', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual(['P1[0-3]', 'null[3-5]', 'P2[5-7]', 'P3[7-11]']);
  });
});
