import type { DeviceState } from './types/io.js';

export class IOSubsystem {
  private serving: string | null = null;
  private remaining = 0;
  private queue: { pid: string; ioTime: number }[] = [];

  public requestIO(pid: string, ioTime: number): void {
    if (this.serving === null) {
      this.serving = pid;
      this.remaining = ioTime;
    } else {
      this.queue.push({ pid, ioTime });
    }
  }

  /**
   * Avanza el dispositivo 1 tick.
   * @returns PID del proceso que completó su E/S, o null.
   */
  public tick(): string | null {
    if (this.serving === null) return null;
    this.remaining--;
    if (this.remaining <= 0) {
      const completed = this.serving;
      const next = this.queue.shift();
      if (next !== undefined) {
        this.serving = next.pid;
        this.remaining = next.ioTime;
      } else {
        this.serving = null;
        this.remaining = 0;
      }
      return completed;
    }
    return null;
  }

  public getState(): DeviceState {
    return {
      serving: this.serving,
      remaining: this.remaining,
      queue: this.queue.map((item) => item.pid),
    };
  }
}
