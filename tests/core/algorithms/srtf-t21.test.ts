import { describe, it, expect } from 'vitest';
import { SRTF } from '../../../src/core/algorithms/preemptive/srtf.js';
import { run } from '../../../src/core/simulate.js';

const srtf = new SRTF();

describe('T-21: SRTF (expropiativo)', () => {
  it('P1(0,5), P2(1,2) → P1[0–1], P2[1–3], P1[3–7]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 5 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
      ],
      srtf,
    );
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 1 },
      { pid: 'P2', start: 1, end: 3 },
      { pid: 'P1', start: 3, end: 7 },
    ]);
  });

  it('P2 finaliza en tick 3 y P1 en tick 7', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 5 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
      ],
      srtf,
    );
    const p1 = result.metrics.perProcess.find(m => m.id === 'P1');
    const p2 = result.metrics.perProcess.find(m => m.id === 'P2');
    expect(p2?.completion).toBe(3);
    expect(p1?.completion).toBe(7);
  });
});
