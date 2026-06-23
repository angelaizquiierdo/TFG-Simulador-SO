import { useState } from 'react';
import { useSimulation } from './SimulationContext.js';
import type { Process } from '../core/types/process.js';
import styles from './style/ProcessForm.module.css';

interface DraftProcess {
  id: string;
  arrival_time: string;
  burst_time: string;
  priority: string;
  io_entry: string;
  io_time: string;
}

interface FieldErrors {
  id?: string;
  arrival_time?: string;
  burst_time?: string;
  priority?: string;
  io_entry?: string;
  io_time?: string;
}

function toDraft(p: Process): DraftProcess {
  return {
    id: p.id,
    arrival_time: String(p.arrival_time),
    burst_time: String(p.burst_time),
    priority: p.priority !== undefined ? String(p.priority) : '',
    io_entry: p.io?.[0] !== undefined ? String(p.io[0].io_entry) : '',
    io_time: p.io?.[0] !== undefined ? String(p.io[0].io_time) : '',
  };
}

function validate(
  draft: DraftProcess,
  allIds: string[],
  currentTick: number,
  showPriority: boolean,
  showIO: boolean,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!draft.id.trim()) {
    errors.id = 'ID requerido';
  } else if (allIds.filter(id => id === draft.id).length > 1) {
    errors.id = 'ID duplicado';
  }

  const arrivalNum = Number(draft.arrival_time);
  if (draft.arrival_time === '' || isNaN(arrivalNum) || arrivalNum < 0) {
    errors.arrival_time = 'arrival_time ≥ 0';
  } else if (arrivalNum < currentTick) {
    errors.arrival_time = `arrival_time ≥ tick actual (${String(currentTick)})`;
  }

  const burstNum = Number(draft.burst_time);
  if (draft.burst_time === '' || isNaN(burstNum) || burstNum <= 0) {
    errors.burst_time = 'burst_time > 0';
  }

  if (showPriority && draft.priority !== '') {
    const prioNum = Number(draft.priority);
    if (isNaN(prioNum)) errors.priority = 'Número requerido';
  }

  if (showIO) {
    if (draft.io_entry !== '') {
      const entryNum = Number(draft.io_entry);
      if (isNaN(entryNum) || entryNum <= 0) {
        errors.io_entry = 'io_entry > 0';
      }
    }
    if (draft.io_time !== '') {
      const ioTimeNum = Number(draft.io_time);
      if (isNaN(ioTimeNum) || ioTimeNum <= 0) {
        errors.io_time = 'io_time > 0';
      }
    }
  }

  return errors;
}

function draftToProcess(draft: DraftProcess, showPriority: boolean, showIO: boolean): Process | null {
  const arrival_time = Number(draft.arrival_time);
  const burst_time = Number(draft.burst_time);
  if (isNaN(arrival_time) || isNaN(burst_time)) return null;

  const base: Process = {
    id: draft.id.trim(),
    arrival_time,
    burst_time,
  };

  const withPriority: Process = showPriority && draft.priority !== ''
    ? { ...base, priority: Number(draft.priority) }
    : base;

  if (showIO && draft.io_entry !== '' && draft.io_time !== '') {
    return {
      ...withPriority,
      io: [{ io_entry: Number(draft.io_entry), io_time: Number(draft.io_time) }],
    };
  }

  return withPriority;
}

let nextIdCounter = 1;

export function ProcessForm() {
  const { processes, algo, tick, updateProcesses } = useSimulation();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftProcess[]>(() => processes.map(toDraft));

  const showPriority =
    algo?.requires.priority === true ||
    processes.some(p => p.priority !== undefined);
  const showIO = algo?.requires.io === true;

  // Sync drafts when processes change from outside
  // (simple approach: overwrite drafts only if length changed)
  if (drafts.length !== processes.length && processes.length < drafts.length) {
    setDrafts(processes.map(toDraft));
  }

  const allIds = drafts.map(d => d.id);

  function applyIfValid(updatedDrafts: DraftProcess[]) {
    const allValid = updatedDrafts.every(draft => {
      const errors = validate(draft, updatedDrafts.map(d => d.id), tick, showPriority, showIO);
      return Object.keys(errors).length === 0;
    });

    if (allValid) {
      const ps = updatedDrafts.map(d => draftToProcess(d, showPriority, showIO)).filter((p): p is Process => p !== null);
      updateProcesses(ps);
    }
  }

  function updateDraft(index: number, field: keyof DraftProcess, value: string) {
    const updated = drafts.map((d, i) => i === index ? { ...d, [field]: value } : d);
    setDrafts(updated);
    applyIfValid(updated);
  }

  function addProcess() {
    const id = `P${String(nextIdCounter++)}`;
    const newDraft: DraftProcess = {
      id,
      arrival_time: String(tick),
      burst_time: '1',
      priority: '',
      io_entry: '',
      io_time: '',
    };
    const updated = [...drafts, newDraft];
    setDrafts(updated);
    applyIfValid(updated);
  }

  function removeProcess(index: number) {
    const updated = drafts.filter((_, i) => i !== index);
    setDrafts(updated);
    applyIfValid(updated);
  }

  return (
    <div className={styles.panel}>
      <div
        className={[styles.header, open ? styles.open : ''].join(' ')}
        onClick={() => { setOpen(o => !o); }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
      >
        <span>Editar procesos</span>
        <span className={styles.toggle}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className={styles.body}>
          {drafts.map((draft, index) => {
            const errors = validate(draft, allIds, tick, showPriority, showIO);
            return (
              <div key={index} className={styles.processRow}>
                <div className={styles.field}>
                  <label>ID</label>
                  <input
                    value={draft.id}
                    className={errors.id ? styles.invalid : ''}
                    onChange={e => { updateDraft(index, 'id', e.target.value); }}
                  />
                  {errors.id && <span className={styles.fieldError}>{errors.id}</span>}
                </div>
                <div className={styles.field}>
                  <label>Llegada</label>
                  <input
                    type="number"
                    value={draft.arrival_time}
                    className={errors.arrival_time ? styles.invalid : ''}
                    onChange={e => { updateDraft(index, 'arrival_time', e.target.value); }}
                  />
                  {errors.arrival_time && <span className={styles.fieldError}>{errors.arrival_time}</span>}
                </div>
                <div className={styles.field}>
                  <label>Ráfaga</label>
                  <input
                    type="number"
                    value={draft.burst_time}
                    className={errors.burst_time ? styles.invalid : ''}
                    onChange={e => { updateDraft(index, 'burst_time', e.target.value); }}
                  />
                  {errors.burst_time && <span className={styles.fieldError}>{errors.burst_time}</span>}
                </div>
                {showPriority && (
                  <div className={styles.field}>
                    <label>Prioridad</label>
                    <input
                      type="number"
                      value={draft.priority}
                      className={errors.priority ? styles.invalid : ''}
                      onChange={e => { updateDraft(index, 'priority', e.target.value); }}
                    />
                    {errors.priority && <span className={styles.fieldError}>{errors.priority}</span>}
                  </div>
                )}
                {showIO && (
                  <>
                    <div className={styles.field}>
                      <label>E/S entrada</label>
                      <input
                        type="number"
                        value={draft.io_entry}
                        className={errors.io_entry ? styles.invalid : ''}
                        onChange={e => { updateDraft(index, 'io_entry', e.target.value); }}
                      />
                      {errors.io_entry && <span className={styles.fieldError}>{errors.io_entry}</span>}
                    </div>
                    <div className={styles.field}>
                      <label>E/S tiempo</label>
                      <input
                        type="number"
                        value={draft.io_time}
                        className={errors.io_time ? styles.invalid : ''}
                        onChange={e => { updateDraft(index, 'io_time', e.target.value); }}
                      />
                      {errors.io_time && <span className={styles.fieldError}>{errors.io_time}</span>}
                    </div>
                  </>
                )}
                <button
                  className={styles.removeBtn}
                  onClick={() => { removeProcess(index); }}
                  aria-label={`Eliminar proceso ${draft.id}`}
                >
                  Eliminar
                </button>
              </div>
            );
          })}
          <button className={styles.addBtn} onClick={addProcess}>
            + Añadir proceso
          </button>
        </div>
      )}
    </div>
  );
}
