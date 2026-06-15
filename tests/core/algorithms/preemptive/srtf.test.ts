import { describe, it, expect } from 'vitest';
import { SRTF } from '../../../../src/core/algorithms/preemptive/srtf.js';
import { run } from '../../../../src/core/simulate.js';
import type { Process } from '../../../../src/core/types/process.js';

const algo = new SRTF();
function intervalStr(r: ReturnType<typeof run>): string[] {
  return r.intervals.map((i) => `${i.pid ?? 'null'}[${String(i.start)}-${String(i.end)}]`);
}

describe('T-21 · SRTF', () => {
  it('select devuelve el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 8, remaining: 7 },
      { id: 'P2', arrival_time: 1, burst_time: 4, remaining: 4 },
    ] as const;
    expect(algo.select(ready).id).toBe('P2');
  });

  it('select lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('preemptionMode es on-better', () => {
    expect(algo.preemptionMode).toBe('on-better');
  });

  it('BEHAVIOURS § SRTF caso 1: P1(0,8),P2(1,4),P3(2,2),P4(4,1)', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual([
      'P1[0-1]', 'P2[1-2]', 'P3[2-4]', 'P4[4-5]', 'P2[5-8]', 'P1[8-15]',
    ]);
    const m = result.metrics.perProcess;
    expect(m.find((x) => x.id === 'P3')?.completion).toBe(4);
    expect(m.find((x) => x.id === 'P4')?.completion).toBe(5);
    expect(m.find((x) => x.id === 'P2')?.completion).toBe(8);
    expect(m.find((x) => x.id === 'P1')?.completion).toBe(15);
  });

  it('BEHAVIOURS § SRTF caso 2: con inactividad', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual([
      'P1[0-2]', 'null[2-4]', 'P2[4-5]', 'P3[5-6]', 'P2[6-8]',
    ]);
  });

  it('BEHAVIOURS § SRTF caso 3: múltiples inactividades', () => {
    const processes: Process[] = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
      { id: 'P2', arrival_time: 6, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: algo });
    expect(intervalStr(result)).toEqual([
      'null[0-2]', 'P1[2-4]', 'null[4-6]', 'P2[6-10]', 'null[10-12]', 'P3[12-14]',
    ]);
  });
});
