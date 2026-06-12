import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Planificación SJF no expropiativa: menor remaining (= burst_time para NP)
export class SJF implements IAlgorithm {
  readonly name = 'SJF';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Lista de listos vacía');
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  }
}
