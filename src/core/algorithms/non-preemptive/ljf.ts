import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class LJF implements IAlgorithm {
  readonly name = 'ljf';
  readonly preemptionMode = 'none' as const;
  readonly requires = { priority: false, quantum: false, io: false };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('select: cola vacía');
    let best = ready[0];
    if (best === undefined) throw new Error('select: cola vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      if (p.burst_time > best.burst_time) best = p;
    }
    return best;
  }
}
