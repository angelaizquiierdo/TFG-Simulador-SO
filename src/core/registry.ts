import type { IAlgorithm } from './types/algorithm.js';

const registry = new Map<string, IAlgorithm>();

export function register(algo: IAlgorithm): void {
  registry.set(algo.name, algo);
}

export function get(name: string): IAlgorithm {
  const algo = registry.get(name);
  if (algo === undefined) {
    throw new Error(`Algoritmo no encontrado: "${name}"`);
  }
  return algo;
}
