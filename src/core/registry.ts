import type { IAlgorithm } from './types/algorithm.js';

// Mapa singleton interno — un único registro por proceso
const _registry = new Map<string, IAlgorithm>();

// Registra un algoritmo; sobrescribe si el nombre ya existe
export function register(algo: IAlgorithm): void {
  _registry.set(algo.name, algo);
}

// Devuelve el algoritmo registrado bajo `name` o lanza un error descriptivo
export function get(name: string): IAlgorithm {
  const algo = _registry.get(name);
  if (algo !== undefined) return algo;

  const available = _registry.size === 0
    ? '(ninguno)'
    : [..._registry.keys()].join(', ');

  throw new Error(
    `Algoritmo "${name}" no registrado. Disponibles: ${available}`
  );
}
