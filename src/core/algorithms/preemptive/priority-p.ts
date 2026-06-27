import type { IAlgorithm, ReadyProcess } from '../../../core/types/algorithm.js';

export class PriorityP implements IAlgorithm {
  readonly name = 'priority-p';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = { io: false } as const;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // Menor priority (mayor prioridad); procesos sin priority → Infinity
    // Desempate: motor ya ordenó por arrival_time y luego id
    let best = ready[0];
    if (best === undefined) throw new Error('Cola de listos vacía');
    let bestPrio = best.priority ?? Infinity;
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      const pPrio = p.priority ?? Infinity;
      if (pPrio < bestPrio) {
        best = p;
        bestPrio = pPrio;
      }
    }
    return best;
  }
}
