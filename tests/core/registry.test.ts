import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const makeAlgo = (name: string): IAlgorithm => ({
  name,
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
});

describe('registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('registra y recupera un algoritmo por su nombre exacto', async () => {
    const { register, get } = await import('../../src/core/registry.js');
    const algo = makeAlgo('fcfs');
    register(algo);
    expect(get('fcfs')).toBe(algo);
  });

  it('sobrescribe silenciosamente al registrar un nombre duplicado', async () => {
    const { register, get } = await import('../../src/core/registry.js');
    const first = makeAlgo('sjf');
    const second = makeAlgo('sjf');
    register(first);
    register(second);
    expect(get('sjf')).toBe(second);
  });

  it('lanza error descriptivo listando disponibles cuando el nombre no existe', async () => {
    const { register, get } = await import('../../src/core/registry.js');
    register(makeAlgo('rr'));
    expect(() => get('no-existe')).toThrow(/rr/);
  });

  it('lanza error con "(ninguno)" cuando el registro está vacío', async () => {
    const { get } = await import('../../src/core/registry.js');
    expect(() => get('cualquiera')).toThrow(/\(ninguno\)/);
  });

  it('devuelve la instancia registrada sin error cuando se pide por el mismo name', async () => {
    const { register, get } = await import('../../src/core/registry.js');
    const algo = makeAlgo('ljf');
    register(algo);
    expect(get('ljf')).toBe(algo);
  });
});
