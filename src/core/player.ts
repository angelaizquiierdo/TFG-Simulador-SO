import type { History, HistoryEvent } from './types/history.js';

// Cursor de solo lectura sobre un History ya calculado.
// No contiene lógica de animación ni temporizadores.
export class Player {
  private readonly history: History;
  private _tick = 0;

  constructor(history: History) {
    this.history = history;
  }

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
    if (this.history.length === 0) return;
    if (n < 0) return;
    if (n >= this.history.length) return;
    this._tick = n;
  }
}
