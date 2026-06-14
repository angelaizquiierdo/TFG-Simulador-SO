import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/core/player.js';
import type { History } from '../../src/core/types/history.js';

const makeHistory = (length: number): History =>
  Array.from({ length }, (_, i) => ({
    tick: i,
    onCPU: null,
    ready: [],
    pending: [],
    completed: [],
    message: `tick ${i.toString()}`,
  }));

describe('Player — Navegación manual', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(makeHistory(6)); // ticks 0..5
    player.goTo(3);
  });

  it('tick 3 → stepForward → tick 4', () => {
    player.stepForward();
    expect(player.tick).toBe(4);
  });

  it('tick 3 → stepBackward → tick 2', () => {
    player.stepBackward();
    expect(player.tick).toBe(2);
  });

  it('tick 0 → stepBackward → permanece en 0', () => {
    player.goTo(0);
    player.stepBackward();
    expect(player.tick).toBe(0);
  });

  it('último tick → stepForward → permanece en el último', () => {
    player.goTo(5);
    player.stepForward();
    expect(player.tick).toBe(5);
    expect(player.atEnd).toBe(true);
  });

  it('goTo(N) posiciona directamente sin recalcular', () => {
    player.goTo(2);
    expect(player.tick).toBe(2);
  });

  it('current devuelve el HistoryEvent del tick actual', () => {
    player.goTo(1);
    expect(player.current?.tick).toBe(1);
  });

  it('atStart es true en tick 0', () => {
    player.goTo(0);
    expect(player.atStart).toBe(true);
  });

  it('atStart es false cuando tick > 0', () => {
    expect(player.atStart).toBe(false);
  });

  it('historial vacío — goTo se ignora y permanece en tick 0', () => {
    const empty = new Player([]);
    empty.goTo(3);
    expect(empty.tick).toBe(0);
  });

  it('historial vacío — stepForward no modifica tick', () => {
    const empty = new Player([]);
    empty.stepForward();
    expect(empty.tick).toBe(0);
  });

  it('historial vacío — atEnd es true', () => {
    const empty = new Player([]);
    expect(empty.atEnd).toBe(true);
  });
});
