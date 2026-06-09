import { describe, it, expect } from 'vitest';
import { PriorityP } from '../../../src/core/algorithms/preemptive/priority-p.js';
import { run } from '../../../src/core/simulate.js';

const prio = new PriorityP();

describe('T-22: Prioridad expropiativa', () => {
  it('P1(0,4,prio=3), P2(2,2,prio=1) → P1[0–2], P2[2–4], P1[4–6]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4, priority: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2, priority: 1 },
      ],
      prio,
    );
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 2 },
      { pid: 'P2', start: 2, end: 4 },
      { pid: 'P1', start: 4, end: 6 },
    ]);
  });

  it('select elige el proceso con menor priority', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 4, remaining: 2, priority: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2, remaining: 2, priority: 1 },
    ] as const;
    expect(prio.select(ready).id).toBe('P2');
  });
});
