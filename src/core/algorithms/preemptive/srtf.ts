import type { IAlgorithm, ReadyProcess, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class SRTF implements IAlgorithm {
  readonly name = 'srtf';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>(['on-tick']);
  readonly requires = {} as const;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // Menor remaining; desempate: motor ya ordenó por arrival_time y luego id
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
