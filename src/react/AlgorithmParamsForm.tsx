import React, { useState } from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/AlgorithmParamsForm.module.css';

interface DraftParams {
  quantum: string;
  boostInterval: string;
}

function paramsToDraft(params: Readonly<Record<string, unknown>>): DraftParams {
  return {
    quantum: typeof params.quantum === 'number' ? String(params.quantum) : '',
    boostInterval: typeof params.boostInterval === 'number' ? String(params.boostInterval) : '',
  };
}

interface ValidationResult {
  readonly errors: Record<string, string>;
  readonly params: Readonly<Record<string, unknown>> | null;
}

function validateDraft(draft: DraftParams): ValidationResult {
  const errors: Record<string, string> = {};
  const result: Record<string, unknown> = {};

  if (draft.quantum !== '') {
    const q = Number(draft.quantum);
    if (!Number.isFinite(q) || q <= 0) {
      errors.quantum = 'quantum debe ser un entero positivo';
    } else {
      result.quantum = q;
    }
  }

  if (draft.boostInterval !== '') {
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

  const hasParams = requires.quantum === true || requires.io === true;
  // Los parámetros de quantum aplican a Round-Robin y similares
  const showQuantum = requires.quantum === true;
  // boostInterval aplica a MLFQ (no se puede detectar desde requires, se muestra siempre si hay params)
  const showBoost = hasParams;

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
  if (!showQuantum && !showBoost) return null;

  function handleApply(): void {
    const { errors: errs, params: parsed } = validateDraft(draft);
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
