interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}

// Disparadores atómicos de reevaluación/expropiación. Cada algoritmo declara el
// conjunto que le aplica; el motor reacciona a ellos en lugar de ramificar por un modo.
type PreemptionTrigger =
  | 'on-tick' // reevaluar cada tick (SRTF, Prioridad expropiativa)
  | 'on-arrival' // reevaluar cuando llega un proceso nuevo
  | 'on-io-return' // reevaluar cuando un proceso vuelve de E/S
  | 'on-quantum' // ceder la CPU al agotar el quantum
  | 'on-boost'; // reevaluar en un priority-boost

type SchedulerEvent =
  | { readonly type: 'arrival'; readonly id: string; readonly tick: number }
  | { readonly type: 'dispatch'; readonly id: string; readonly tick: number }
  | { readonly type: 'quantum-expiry'; readonly id: string; readonly tick: number }
  | { readonly type: 'preempted'; readonly id: string; readonly tick: number }
  | { readonly type: 'io-start'; readonly id: string; readonly tick: number }
  | { readonly type: 'io-return'; readonly id: string; readonly tick: number }
  | { readonly type: 'completed'; readonly id: string; readonly tick: number }
  | { readonly type: 'priority-boost'; readonly tick: number };

type AlgorithmParams = Readonly<Record<string, unknown>>;

interface IAlgorithm {
  readonly name: string;
  
  readonly triggers: ReadonlySet<PreemptionTrigger>;
  readonly requires: { priority?: boolean; quantum?: boolean; io?: boolean; levels?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
  quantumFor?(p: ReadyProcess): number | null;
  onEvent?(e: SchedulerEvent): string | { text: string } | null;
  
  levelSnapshot?(): Readonly<Record<string, number>>;
}

export type {
  ReadyProcess,
  PreemptionTrigger,
  SchedulerEvent,
  AlgorithmParams,
  IAlgorithm,
};
