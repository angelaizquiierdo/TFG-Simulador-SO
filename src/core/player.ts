import type { History } from './types/history.js';

// Cursor de solo lectura sobre un History calculado.
export class Player {
  private _tick = 0;
  private readonly _history: History;

  constructor(history: History) {
    this._history = history;
  }

  get tick(): number {
    return this._tick;
  }

  get atStart(): boolean {
    return this._tick === 0;
  }

  get atEnd(): boolean {
    return this._tick === this._history.length - 1;
  }

  stepForward(): void {
    if (this._tick < this._history.length - 1) {
      this._tick++;
    }
  }

  stepBackward(): void {
    if (this._tick > 0) {
      this._tick--;
    }
  }

  goTo(n: number): void {
    this._tick = n;
  }

  get current() {
    return this._history[this._tick];
  }
}
