import type { IAlgorithm, ReadyProcess, SchedulerEvent, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class PriorityNP implements IAlgorithm {
  readonly name = 'priority-np';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>();
  readonly requires = { priority: true } as const;

  // Prioridad del último proceso seleccionado, para el mensaje de dispatch.
  private lastPriority: number | undefined = undefined;

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
    this.lastPriority = best.priority;
    return best;
  }

  // Mensaje descriptivo del Gantt: explica el criterio de selección (mayor prioridad).
  onEvent(e: SchedulerEvent): { text: string } | null {
    if (e.type === 'dispatch') {
      const suffix = this.lastPriority !== undefined ? ` (${String(this.lastPriority)})` : '';
      return { text: `entra en CPU por ser el de mayor prioridad${suffix}` };
    }
    return null;
  }
}
