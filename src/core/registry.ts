import type { IAlgorithm } from './types/algorithm.js';

// Mapa interno singleton de algoritmos registrados
const registry = new Map<string, IAlgorithm>();

// Registra un algoritmo por su nombre
export function register(algo: IAlgorithm): void {
  registry.set(algo.name, algo);
}

// Devuelve el algoritmo registrado con el nombre dado; lanza error si no existe
export function get(name: string): IAlgorithm {
  const algo = registry.get(name);
  if (algo === undefined) {
    throw new Error(`Algoritmo no registrado: "${name}"`);
  }
  return algo;
}
