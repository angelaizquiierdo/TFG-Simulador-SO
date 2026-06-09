import type { History, HistoryEvent } from './types/history.js';

export class Player {
  private readonly _history: History;
  private _tick: number;

  constructor(history: History) {
    this._history = history;
    this._tick = 0;
  }

  get tick(): number {
    return this._tick;
  }

  get atStart(): boolean {
    return this._tick === 0;
  }

  get atEnd(): boolean {
    return this._history.length === 0 || this._tick === this._history.length - 1;
  }

  get current(): HistoryEvent | undefined {
    return this._history[this._tick];
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
    const max = this._history.length > 0 ? this._history.length - 1 : 0;
    this._tick = Math.max(0, Math.min(n, max));
  }
}
