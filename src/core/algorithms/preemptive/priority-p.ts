import type { IAlgorithm, ReadyProcess, SchedulerEvent, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class PriorityP implements IAlgorithm {
  readonly name = 'priority-p';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>(['on-tick']);
  readonly requires = { priority: true  } as const;

  // Prioridad del último proceso seleccionado, para el mensaje de dispatch.
  private lastPriority: number | undefined = undefined;

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
    this.lastPriority = best.priority;
    return best;
  }

  // Mensaje descriptivo del Gantt: dispatch explica el criterio (mayor prioridad);
  // preempted explica el motivo de salida. El motor antepone el PID a { text }.
  onEvent(e: SchedulerEvent): { text: string } | null {
    if (e.type === 'dispatch') {
      const suffix = this.lastPriority !== undefined ? ` (${String(this.lastPriority)})` : '';
      return { text: `entra en CPU por ser el de mayor prioridad${suffix}` };
    }
    if (e.type === 'preempted') {
      return { text: 'es expropiado por un proceso de mayor prioridad' };
    }
    return null;
  }
}
