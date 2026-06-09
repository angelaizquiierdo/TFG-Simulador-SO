import { describe, it, expect } from 'vitest';
import { PriorityNP } from '../../../src/core/algorithms/non-preemptive/priority-np.js';
import { run } from '../../../src/core/simulate.js';

const prio = new PriorityNP();

describe('T-20: Prioridad no expropiativa', () => {
  it('P1(0,3,prio=2), P2(0,1,prio=1) → P2[0–1], P1[1–4]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3, priority: 2 },
        { id: 'P2', arrival_time: 0, burst_time: 1, priority: 1 },
      ],
      prio,
    );
    expect(result.intervals).toEqual([
      { pid: 'P2', start: 0, end: 1 },
      { pid: 'P1', start: 1, end: 4 },
    ]);
  });

  it('select elige el proceso con menor priority', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3, priority: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 1, remaining: 1, priority: 1 },
    ] as const;
    expect(prio.select(ready).id).toBe('P2');
  });
});
