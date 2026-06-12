import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Planificación por prioridad expropiativa: menor número de prioridad = mayor prioridad
export class PriorityP implements IAlgorithm {
  readonly name = 'Priority-P';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = { priority: true as const };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Lista de listos vacía');
    for (const p of ready) {
      const pPrio = p.priority ?? Infinity;
      const bestPrio = best.priority ?? Infinity;
      if (pPrio < bestPrio) best = p;
    }
    return best;
  }
}
