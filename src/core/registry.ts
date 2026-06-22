import type { IAlgorithm } from './types/algorithm.js';

// Registro singleton de algoritmos. register() sobrescribe silenciosamente si el nombre ya existe.
const store = new Map<string, IAlgorithm>();

export function register(algo: IAlgorithm): void {
  store.set(algo.name, algo);
}

export function get(name: string): IAlgorithm {
  const algo = store.get(name);
  if (algo !== undefined) return algo;
  const available = store.size === 0 ? '(ninguno)' : [...store.keys()].join(', ');
  throw new Error(`Algoritmo "${name}" no encontrado. Disponibles: ${available}`);
}
