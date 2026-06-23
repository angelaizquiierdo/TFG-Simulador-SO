import { useState } from 'react';
import { useSimulation } from './SimulationContext.js';
import type { AlgorithmParams } from '../core/types/algorithm.js';
import styles from './style/AlgorithmParamsForm.module.css';

interface ParamSchema {
  quantum?: boolean;
  quanta?: boolean;
  boostInterval?: boolean;
}

function getSchema(algoName: string | undefined): ParamSchema | null {
  if (!algoName) return null;
  if (algoName === 'round-robin' || algoName === 'vrr') {
    return { quantum: true };
  }
  if (algoName === 'mlfq') {
    return { quanta: true, boostInterval: true };
  }
  return null;
}

interface Draft { quantum: string; quanta: string; boostInterval: string }

function validateDraft(schema: ParamSchema, draft: Draft): string | null {
  if (schema.quantum) {
    const q = Number(draft.quantum);
    if (isNaN(q) || q <= 0) return 'quantum debe ser un entero > 0';
  }
  if (schema.quanta) {
    const raw = draft.quanta.trim();
    if (!raw) return 'quanta es obligatorio (ej. "2, 4")';
    const parts = raw.split(',').map(s => Number(s.trim()));
    if (parts.length === 0 || parts.some(n => isNaN(n) || n <= 0)) {
      return 'quanta: todos los valores deben ser enteros > 0';
    }
  }
  return null;
}

function draftToParams(schema: ParamSchema, draft: Draft): AlgorithmParams {
  const result: Record<string, unknown> = {};
  if (schema.quantum) {
    result.quantum = Number(draft.quantum);
  }
  if (schema.quanta) {
    result.quanta = draft.quanta.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  }
  if (schema.boostInterval) {
    const raw = draft.boostInterval.trim();
    if (raw !== '') {
      const n = Number(raw);
      if (!isNaN(n) && n > 0) result.boostInterval = n;
    }
  }
  return result;
}

function paramsToDraft(schema: ParamSchema, params: AlgorithmParams): Draft {
  const q = params.quantum;
  const qa = params.quanta;
  const b = params.boostInterval;
  return {
    quantum: schema.quantum ? (typeof q === 'number' ? String(q) : '2') : '',
    quanta: schema.quanta ? (Array.isArray(qa) ? (qa as number[]).join(', ') : '2, 4') : '',
    boostInterval: schema.boostInterval ? (typeof b === 'number' ? String(b) : '') : '',
  };
}

export function AlgorithmParamsForm() {
  const { algo, params, updateParams } = useSimulation();
  const schema = getSchema(algo?.name);

  const [draft, setDraft] = useState<Draft>(() =>
    schema ? paramsToDraft(schema, params) : { quantum: '', quanta: '', boostInterval: '' },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!schema) return null;

  function updateField(key: keyof Draft, value: string) {
    setDraft(d => ({ ...d, [key]: value }));
    setPending(true);
    setError(null);
  }

  function handleApply() {
    // schema is non-null here (we returned early if null above)
    const s = schema;
    if (!s) return;
    const err = validateDraft(s, draft);
    if (err) {
      setError(err);
      return;
    }
    updateParams(draftToParams(s, draft));
    setPending(false);
    setError(null);
  }

  return (
    <div className={styles.form}>
      <div className={styles.title}>Parámetros del algoritmo</div>
      <div className={styles.fields}>
        {schema.quantum && (
          <div className={styles.field}>
            <label htmlFor="apf-quantum">Quantum</label>
            <input
              id="apf-quantum"
              type="number"
              value={draft.quantum}
              className={error ? styles.invalid : ''}
              onChange={e => { updateField('quantum', e.target.value); }}
            />
          </div>
        )}
        {schema.quanta && (
          <div className={styles.field}>
            <label htmlFor="apf-quanta">Quanta (separados por coma)</label>
            <input
              id="apf-quanta"
              value={draft.quanta}
              className={error ? styles.invalid : ''}
              onChange={e => { updateField('quanta', e.target.value); }}
            />
          </div>
        )}
        {schema.boostInterval && (
          <div className={styles.field}>
            <label htmlFor="apf-boost">boostInterval (vacío = sin boost)</label>
            <input
              id="apf-boost"
              type="number"
              value={draft.boostInterval}
              onChange={e => { updateField('boostInterval', e.target.value); }}
            />
          </div>
        )}
      </div>
      {error && <div className={styles.fieldError}>{error}</div>}
      <div className={styles.actions}>
        <button className={styles.applyBtn} onClick={handleApply}>
          Aplicar
        </button>
        {pending && <span className={styles.pending}>Cambios sin aplicar</span>}
      </div>
    </div>
  );
}
