import type { IAlgorithm, ReadyProcess, SchedulerEvent, PreemptionTrigger } from '../../../core/types/algorithm.js';

export class LJF implements IAlgorithm {
  readonly name = 'ljf';
  readonly triggers: ReadonlySet<PreemptionTrigger> = new Set<PreemptionTrigger>();
  readonly requires = {} as const;

  // Ráfaga de CPU del último proceso seleccionado, para el mensaje de dispatch.
  private lastBurst = 0;

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');
    // Mayor burst_time; desempate: menor arrival_time, luego menor id (motor ya ordenó)
    let best = ready[0];
    if (best === undefined) throw new Error('Cola de listos vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      if (p.burst_time > best.burst_time) {
        best = p;
      }
    }
    this.lastBurst = best.burst_time;
    return best;
  }

  // Mensaje descriptivo del Gantt: explica el criterio de selección (ráfaga más larga).
  onEvent(e: SchedulerEvent): { text: string } | null {
    if (e.type === 'dispatch') {
      return { text: `entra en CPU por tener la ráfaga de CPU más larga (${String(this.lastBurst)})` };
    }
    return null;
  }
}
