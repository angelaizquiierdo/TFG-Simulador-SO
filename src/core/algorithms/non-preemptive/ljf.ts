import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Planificación LJF no expropiativa: mayor burst_time
export class LJF implements IAlgorithm {
  readonly name = 'LJF';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Lista de listos vacía');
    for (const p of ready) {
      if (p.burst_time > best.burst_time) best = p;
    }
    return best;
  }
}
