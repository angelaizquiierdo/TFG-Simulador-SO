import { describe, it, expect } from 'vitest';
import { RoundRobin } from '../../../../src/core/algorithms/preemptive/round-robin.js';
import { run } from '../../../../src/core/simulate.js';
import type { Process } from '../../../../src/core/types/process.js';

const algo = new RoundRobin();
function intervalStr(r: ReturnType<typeof run>): string[] {
  return r.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}
function r2(n: number): number { return Math.round(n * 100) / 100; }

describe('T-23 · Round Robin', () => {
  it('select devuelve el primer proceso (FIFO)', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 4, remaining: 4 },
    ] as const;
    expect(algo.select(ready).id).toBe('P1');
  });

  it('select lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('preemptionMode es on-quantum', () => {
    expect(algo.preemptionMode).toBe('on-quantum');
  });

  it('requires.quantum es true', () => {
    expect(algo.requires.quantum).toBe(true);
  });

  it('BEHAVIOURS § RR caso 1: P1(0,5),P2(1,4),P3(2,2),q=2', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: algo, quantum: 2 });
    expect(intervalStr(result)).toEqual([
      'P1[0-2]', 'P2[2-4]', 'P3[4-6]', 'P1[6-8]', 'P2[8-10]', 'P1[10-11]',
    ]);
    expect(r2(result.metrics.aggregate.avgWaiting)).toBe(4.33);
    expect(r2(result.metrics.aggregate.avgTurnaround)).toBe(8);
  });

  it('BEHAVIOURS § RR caso 2: con inactividades', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ];
    const result = run(processes, { algorithm: algo, quantum: 3 });
    const idleIntervals = result.intervals.filter((i) => i.pid === null);
    expect(idleIntervals).toEqual([
      { pid: null, start: 2, end: 5 },
      { pid: null, start: 9, end: 12 },
    ]);
    expect(result.metrics.perProcess.find((m) => m.id === 'P2')?.completion).toBe(9);
  });

  it('BEHAVIOURS § RR caso 3: P1(0,3),P2(0,2),P3(0,1),q=1', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: algo, quantum: 1 });
    expect(intervalStr(result)).toEqual([
      'P1[0-1]', 'P2[1-2]', 'P3[2-3]', 'P1[3-4]', 'P2[4-5]', 'P1[5-6]',
    ]);
    const m = result.metrics.perProcess;
    expect(m.find((x) => x.id === 'P3')?.completion).toBe(3);
    expect(m.find((x) => x.id === 'P2')?.completion).toBe(5);
    expect(m.find((x) => x.id === 'P1')?.completion).toBe(6);
  });
});
