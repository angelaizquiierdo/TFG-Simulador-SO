import type { IAlgorithm, ReadyProcess, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class PriorityNP implements IAlgorithm {
  readonly name = 'priority-np';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>();
  readonly requires = { priority: true } as const;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // Menor priority (mayor prioridad); procesos sin priority → Infinity
    // Desempate: menor arrival_time, luego menor id (motor ya ordenó)
    let best = ready[0];
    if (best === undefined) throw new Error('Cola de listos vacía');
    const bestPrio = best.priority ?? Infinity;
    let bestPrioVal = bestPrio;
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      const pPrio = p.priority ?? Infinity;
      if (pPrio < bestPrioVal) {
        best = p;
        bestPrioVal = pPrio;
      }
    }
    return best;
  }
}
