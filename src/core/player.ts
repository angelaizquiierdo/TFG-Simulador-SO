import type { History, HistoryEvent } from './types/history.js';

export class Player {
  private readonly history: History;
  private _tick: number;

  constructor(history: History) {
    this.history = history;
    this._tick = 0;
  }

  get tick(): number {
    return this._tick;
  }

  get current(): HistoryEvent | undefined {
    return this.history[this._tick];
  }

  get atStart(): boolean {
    return this._tick === 0;
  }

  get atEnd(): boolean {
    return this._tick === this.history.length - 1;
  }

  stepForward(): void {
    if (!this.atEnd) {
      this._tick++;
    }
  }

  stepBackward(): void {
    if (!this.atStart) {
      this._tick--;
    }
  }

  goTo(n: number): void {
    const max = this.history.length - 1;
    this._tick = Math.max(0, Math.min(n, max));
  }
}
