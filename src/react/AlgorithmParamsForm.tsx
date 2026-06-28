import React, { useState } from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/AlgorithmParamsForm.module.css';

interface DraftParams {
  quantum: string;
  quantum0: string;
  quantum1: string;
  boostInterval: string;
}

// Default de quanta por nivel (coincide con el constructor de MLFQ). Evita que un
// sessionStorage obsoleto (formato antiguo de un solo `quantum`, sin `quanta`) deje
// los campos vacíos y bloquee "Aplicar".
const DEFAULT_QUANTA = [2, 4] as const;

function paramsToDraft(params: Readonly<Record<string, unknown>>): DraftParams {
  const quanta = Array.isArray(params.quanta) ? params.quanta : undefined;
  const q0 = typeof quanta?.[0] === 'number' ? quanta[0] : DEFAULT_QUANTA[0];
  const q1 = typeof quanta?.[1] === 'number' ? quanta[1] : DEFAULT_QUANTA[1];
  return {
    quantum: typeof params.quantum === 'number' ? String(params.quantum) : '',
    quantum0: String(q0),
    quantum1: String(q1),
    boostInterval: typeof params.boostInterval === 'number' ? String(params.boostInterval) : '',
  };
}

// Qué campos están activos según el algoritmo: quanta por nivel (MLFQ) o quantum único (RR/VRR)
interface FieldVisibility {
  readonly showQuanta: boolean;
  readonly showQuantum: boolean;
  readonly showBoost: boolean;
}

interface ValidationResult {
  readonly errors: Record<string, string>;
  readonly params: Readonly<Record<string, unknown>> | null;
}

function validateDraft(draft: DraftParams, vis: FieldVisibility): ValidationResult {
  const errors: Record<string, string> = {};
  const result: Record<string, unknown> = {};

  // Quantum único (Round Robin / VRR): opcional, solo se valida si tiene valor
  if (vis.showQuantum && draft.quantum !== '') {
    const q = Number(draft.quantum);
    if (!Number.isFinite(q) || q <= 0) {
      errors.quantum = 'quantum debe ser un entero positivo';
    } else {
      result.quantum = q;
    }
  }

  // Quanta por nivel (MLFQ): ambos campos obligatorios y enteros positivos
  if (vis.showQuanta) {
    const q0 = Number(draft.quantum0);
    const q1 = Number(draft.quantum1);
    if (draft.quantum0 === '' || !Number.isFinite(q0) || q0 <= 0) {
      errors.quantum0 = 'el quantum del nivel 0 debe ser un entero positivo';
    }
    if (draft.quantum1 === '' || !Number.isFinite(q1) || q1 <= 0) {
      errors.quantum1 = 'el quantum del nivel 1 debe ser un entero positivo';
    }
    if (errors.quantum0 === undefined && errors.quantum1 === undefined) {
      result.quanta = [q0, q1];
    }
  }

  // boostInterval (MLFQ): opcional; vacío equivale a "sin priority boost"
  if (vis.showBoost && draft.boostInterval !== '') {
    const b = Number(draft.boostInterval);
    if (!Number.isFinite(b) || b <= 0) {
      errors.boostInterval = 'boostInterval debe ser un entero positivo';
    } else {
      result.boostInterval = b;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, params: null };
  }
  return { errors: {}, params: result };
}

/**
 * Formulario de parámetros del algoritmo activo.
 * Usa estado draft/applied: los cambios no se aplican hasta pulsar "Aplicar".
 * Se resetea al cambiar de algoritmo.
 */
export function AlgorithmParamsForm(): React.ReactElement | null {
  const { requires, algorithmName, params, updateParams } = useSimulation();

  // MLFQ declara `levels: true` → quanta por nivel (2 campos) + boostInterval.
  // Round Robin / VRR declaran `quantum: true` sin `levels` → un único quantum.
  const showQuanta = requires.levels === true;
  const showQuantum = requires.quantum === true && !showQuanta;
  const showBoost = showQuanta;

  const [prevAlgName, setPrevAlgName] = useState(algorithmName);
  const [draft, setDraft] = useState<DraftParams>(() => paramsToDraft(params));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Reset al cambiar de algoritmo (patrón de estado derivado sin useEffect)
  if (algorithmName !== prevAlgName) {
    setPrevAlgName(algorithmName);
    setDraft(paramsToDraft(params));
    setErrors({});
    setIsDirty(false);
  }

  // No mostrar si el algoritmo no tiene parámetros configurables
  if (!showQuantum && !showQuanta && !showBoost) return null;

  function handleApply(): void {
    const { errors: errs, params: parsed } = validateDraft(draft, {
      showQuanta,
      showQuantum,
      showBoost,
    });
    setErrors(errs);
    if (parsed !== null) {
      updateParams(parsed);
      setIsDirty(false);
    }
  }

  return (
    <div data-testid="algorithm-params-form" className={styles.container}>
      <span className={styles.title}>Parámetros del algoritmo</span>
      {showQuantum && (
        <label className={styles.field}>
          <span>Quantum</span>
          <input
            type="number"
            min={1}
            value={draft.quantum}
            data-testid="input-quantum"
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, quantum: e.target.value }));
              setIsDirty(true);
            }}
          />
          {errors.quantum !== undefined && (
            <span className={styles.error} role="alert">
              {errors.quantum}
            </span>
          )}
        </label>
      )}
      {showQuanta && (
        <>
          <label className={styles.field}>
            <span>Quantum nivel 0</span>
            <input
              type="number"
              min={1}
              value={draft.quantum0}
              data-testid="input-quantum-0"
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, quantum0: e.target.value }));
                setIsDirty(true);
              }}
            />
            {errors.quantum0 !== undefined && (
              <span className={styles.error} role="alert">
                {errors.quantum0}
              </span>
            )}
          </label>
          <label className={styles.field}>
            <span>Quantum nivel 1</span>
            <input
              type="number"
              min={1}
              value={draft.quantum1}
              data-testid="input-quantum-1"
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, quantum1: e.target.value }));
                setIsDirty(true);
              }}
            />
            {errors.quantum1 !== undefined && (
              <span className={styles.error} role="alert">
                {errors.quantum1}
              </span>
            )}
          </label>
        </>
      )}
      {showBoost && (
        <label className={styles.field}>
          <span>Boost interval (vacío = sin boost)</span>
          <input
            type="number"
            min={1}
            value={draft.boostInterval}
            data-testid="input-boost-interval"
            placeholder="sin boost"
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, boostInterval: e.target.value }));
              setIsDirty(true);
            }}
          />
          {errors.boostInterval !== undefined && (
            <span className={styles.error} role="alert">
              {errors.boostInterval}
            </span>
          )}
        </label>
      )}
      <button
        type="button"
        className={styles.applyButton}
        data-testid="apply-params-button"
        disabled={!isDirty}
        onClick={handleApply}
      >
        Aplicar
      </button>
    </div>
  );
}
