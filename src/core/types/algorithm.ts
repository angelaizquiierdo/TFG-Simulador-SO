export type PreemptionMode = 'none' | 'on-better' | 'on-quantum';

export interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}

export interface IAlgorithm {
  readonly name: string;
  readonly preemptionMode: PreemptionMode;
  readonly requires: { priority?: boolean; quantum?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
}
