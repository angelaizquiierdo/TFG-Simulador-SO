export interface Process {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly priority?: number;
}
