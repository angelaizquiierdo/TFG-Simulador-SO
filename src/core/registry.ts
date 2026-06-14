import type { IAlgorithm } from './types/algorithm.js';
import { FCFS } from './algorithms/non-preemptive/fcfs.js';
import { SJF } from './algorithms/non-preemptive/sjf.js';
import { LJF } from './algorithms/non-preemptive/ljf.js';
import { PriorityNP } from './algorithms/non-preemptive/priority-np.js';
import { SRTF } from './algorithms/preemptive/srtf.js';
import { PriorityP } from './algorithms/preemptive/priority-p.js';
import { RoundRobin } from './algorithms/preemptive/round-robin.js';

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

// Registro de algoritmos predefinidos
register(new FCFS());
register(new SJF());
register(new LJF());
register(new PriorityNP());
register(new SRTF());
register(new PriorityP());
register(new RoundRobin());

