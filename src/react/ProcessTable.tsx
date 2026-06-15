import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/ProcessTable.module.css';

export function ProcessTable(): React.ReactElement | null {
  const { processes, algorithm } = useSimulation();

  if (processes.length === 0) return null;

  const showPriority = algorithm?.requires.priority === true;
  const showQuantum = algorithm?.requires.quantum === true;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Llegada</th>
          <th>Ráfaga</th>
          {showPriority && <th>Prioridad</th>}
          {showQuantum && <th>Quantum</th>}
        </tr>
      </thead>
      <tbody>
        {processes.map((p, i) => (
          <tr key={p.id} className={styles.row} data-row={String(i)}>
            <td>{p.id}</td>
            <td>{p.arrival_time}</td>
            <td>{p.burst_time}</td>
            {showPriority && <td>{p.priority ?? '—'}</td>}
            {showQuantum && <td>—</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
