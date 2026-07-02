import type { IAlgorithm, ReadyProcess, SchedulerEvent, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class SRTF implements IAlgorithm {
  readonly name = 'srtf';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>(['on-tick']);
  readonly requires = {} as const;

  // Tiempo restante del último proceso seleccionado, para el mensaje de dispatch.
  private lastRemaining = 0;

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
    this.lastRemaining = best.remaining;
    return best;
  }

  // Mensaje descriptivo del Gantt: dispatch explica el criterio (menor tiempo restante);
  // preempted explica el motivo de salida. El motor antepone el PID a { text }.
  onEvent(e: SchedulerEvent): { text: string } | null {
    if (e.type === 'dispatch') {
      return { text: `entra en CPU por tener el menor tiempo restante (${String(this.lastRemaining)})` };
    }
    if (e.type === 'preempted') {
      return { text: 'es expropiado por un proceso con menor tiempo restante' };
    }
    return null;
  }
}
