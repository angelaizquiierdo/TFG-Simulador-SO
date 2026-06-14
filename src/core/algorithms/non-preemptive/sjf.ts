import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Shortest-Job-First no expropiativo: selecciona el proceso con menor ráfaga restante
export class SJF implements IAlgorithm {
  readonly name = 'sjf';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const initial = ready[0];
    if (initial === undefined) {
      throw new Error('select() llamado con la cola de listos vacía');
    }
    // El motor pre-ordena por desempate (arrival_time, id). Aquí aplicamos criterio primario.
    let best = initial;
    for (const p of ready) {
      if (p.remaining < best.remaining) {
        best = p;
      }
    }
    return best;
  }
}
