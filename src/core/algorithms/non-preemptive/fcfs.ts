import type { IAlgorithm, ReadyProcess, SchedulerEvent, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class FCFS implements IAlgorithm {
  readonly name = 'fcfs';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>();
  readonly requires = {} as const;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // La lista ya llega ordenada por arrival_time y luego id (desempate global del motor)
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }

  // Mensaje descriptivo del Gantt: explica el criterio de selección (orden de llegada).
  // El motor antepone el PID al devolver { text } (mismo patrón que VRR/MLFQ).
  onEvent(e: SchedulerEvent): { text: string } | null {
    if (e.type === 'dispatch') {
      return { text: 'entra en CPU por ser el primer proceso en llegar a la cola de listos' };
    }
    return null;
  }
}
