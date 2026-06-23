interface IOOperation {
  readonly io_entry: number;
  readonly io_time: number;
}

interface DeviceState {
  readonly serving: string | null;
  readonly remaining: number;
  readonly queue: readonly string[];
}

export type { IOOperation, DeviceState };
