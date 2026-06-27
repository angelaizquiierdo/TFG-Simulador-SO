import type { IAlgorithm, ReadyProcess } from '../../../core/types/algorithm.js';

export class SJF implements IAlgorithm {
  readonly name = 'sjf';
  readonly preemptionMode = 'none' as const;
  readonly requires = { io: false } as const;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // Menor remaining; desempate: menor arrival_time, luego menor id (ya ordenado por motor)
    let best = ready[0];
    if (best === undefined) throw new Error('Cola de listos vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      if (p.remaining < best.remaining) {
        best = p;
      }
    }
    return best;
  }
}
