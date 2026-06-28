import type { IAlgorithm, ReadyProcess } from '../../../core/types/algorithm.js';

export class LJF implements IAlgorithm {
  readonly name = 'ljf';
  readonly preemptionMode = 'none' as const;
  readonly requires = {} as const;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // Mayor burst_time; desempate: menor arrival_time, luego menor id (motor ya ordenó)
    let best = ready[0];
    if (best === undefined) throw new Error('Cola de listos vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      if (p.burst_time > best.burst_time) {
        best = p;
      }
    }
    return best;
  }
}
