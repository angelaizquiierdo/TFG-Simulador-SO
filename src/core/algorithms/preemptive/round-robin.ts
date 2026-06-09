import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class RoundRobin implements IAlgorithm {
  readonly name = 'round-robin';
  readonly preemptionMode = 'on-quantum' as const;
  readonly requires = { quantum: true };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos en cola');
    return first;
  }
}
