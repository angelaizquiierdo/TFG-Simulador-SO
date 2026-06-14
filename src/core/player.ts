import type { History, HistoryEvent } from './types/history.js';

/**
 * Cursor de solo lectura sobre un History calculado.
 * Sin lógica de animación (eso corresponde a PlaybackControls).
 */
export class Player {
  private _tick = 0;

  constructor(private readonly history: History) {}

  get tick(): number {
    return this._tick;
  }

  get atStart(): boolean {
    return this._tick === 0;
  }

  get atEnd(): boolean {
    return this.history.length === 0 || this._tick === this.history.length - 1;
  }

  get current(): HistoryEvent | undefined {
    return this.history[this._tick];
  }

  stepForward(): void {
    if (this.history.length === 0) return;
    if (this._tick < this.history.length - 1) {
      this._tick++;
    }
  }

  stepBackward(): void {
    if (this._tick > 0) {
      this._tick--;
    }
  }

  goTo(n: number): void {
    if (this.history.length === 0) return;
    if (n >= 0 && n < this.history.length) {
      this._tick = n;
    }
  }
}
