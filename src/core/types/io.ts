export interface IOOperation {
  readonly io_entry: number;  // CPU acumulada antes de bloquearse (>0, <burst_time)
  readonly io_time: number;   // duración del servicio (>0)
  readonly device?: string;   // por defecto '0' (un único dispositivo en v02)
}

export interface DeviceState {
  readonly id: string;                // '0' en v02
  readonly serving: string | null;    // pid en servicio
  readonly remaining: number;         // ticks restantes del servicio
  readonly queue: readonly string[];  // cola FCFS de pids esperando
}
