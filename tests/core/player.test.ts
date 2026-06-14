// T-16 — Tests de navegación manual (BEHAVIOURS § Navegación manual)

import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/core/player.js';
import type { History } from '../../src/core/types/history.js';

/** Historial sintético de 6 ticks (0–5). */
const makeHistory = (length: number): History =>
  Array.from({ length }, (_, i) => ({
    tick: i,
    onCPU: null,
    ready: [],
    pending: [],
    completed: [],
    message: 'tick',
  }));

describe('Player — navegación manual', () => {
  let player: Player;

  beforeEach(() => {
    // Historial de 6 ticks (índices 0..5)
    player = new Player(makeHistory(6));
    player.goTo(3); // situamos en tick 3
  });

  it('tick 3 → adelante → tick 4', () => {
    player.stepForward();
    expect(player.tick).toBe(4);
  });

  it('tick 3 → atrás → tick 2', () => {
    player.stepBackward();
    expect(player.tick).toBe(2);
  });

  it('tick 0 → atrás → permanece en tick 0', () => {
    player.goTo(0);
    player.stepBackward();
    expect(player.tick).toBe(0);
    expect(player.atStart).toBe(true);
  });

  it('último tick → adelante → permanece en el último tick', () => {
    player.goTo(5);
    expect(player.atEnd).toBe(true);
    player.stepForward();
    expect(player.tick).toBe(5);
    expect(player.atEnd).toBe(true);
  });

  it('goTo(N) salta directamente sin recalcular', () => {
    player.goTo(2);
    expect(player.tick).toBe(2);
  });

  it('current devuelve el HistoryEvent del tick actual', () => {
    player.goTo(4);
    expect(player.current?.tick).toBe(4);
  });

  it('atStart es true solo en tick 0', () => {
    player.goTo(0);
    expect(player.atStart).toBe(true);
    player.stepForward();
    expect(player.atStart).toBe(false);
  });

  it('atEnd es true solo en el último tick', () => {
    player.goTo(5);
    expect(player.atEnd).toBe(true);
    player.goTo(4);
    expect(player.atEnd).toBe(false);
  });

  it('historial vacío: atEnd es true, stepForward y stepBackward no lanzan error', () => {
    const empty = new Player([]);
    expect(empty.atEnd).toBe(true);
    expect(empty.atStart).toBe(true);
    expect(() => { empty.stepForward(); }).not.toThrow();
    expect(() => { empty.stepBackward(); }).not.toThrow();
    expect(empty.tick).toBe(0);
  });
});
