import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class RoundRobin implements IAlgorithm {
  readonly name = 'round-robin';
  readonly preemptionMode = 'on-quantum' as const;
  readonly requires = { priority: false, quantum: true, io: false };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('select: cola vacía');
    const first = ready[0];
    if (first === undefined) throw new Error('select: cola vacía');
    return first;
  }
}
