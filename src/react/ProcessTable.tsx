import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/ProcessTable.module.css';

/** Tabla de procesos del escenario activo. */
export function ProcessTable(): React.ReactElement {
  const { processes, requires } = useSimulation();

  const showPriority = requires.priority === true;
  const showIO = requires.io === true;
  
  return (
    <table className={styles.table} data-testid="process-table">
      <thead>
        <tr>
          <th>ID</th>
          <th className={styles.numeric}>Llegada</th>
          <th className={styles.numeric}>Ráfaga</th>
          {showPriority && <th className={styles.numeric}>Prioridad</th>}
          {showIO && (
            <>
              <th className={styles.numeric}>Entrada E/S</th>
              <th className={styles.numeric}>Tiempo E/S</th>
              <th className={styles.numeric}>Salida E/S</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {processes.map((p) => {
          if (!showIO) {
            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td className={styles.numeric}>{p.arrival_time}</td>
                <td className={styles.numeric}>{p.burst_time}</td>
                {showPriority && <td className={styles.numeric}>{p.priority ?? '—'}</td>}
              </tr>
            );
          }

          const ioOps = p.io ?? [];

          if (ioOps.length === 0) {
            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td className={styles.numeric}>{p.arrival_time}</td>
                <td className={styles.numeric}>{p.burst_time}</td>
                {showPriority && <td className={styles.numeric}>{p.priority ?? '—'}</td>}
                <td className={styles.numeric}>—</td>
                <td className={styles.numeric}>—</td>
                <td className={styles.numeric}>—</td>
              </tr>
            );
          }

          const span = ioOps.length;
          return (
            <React.Fragment key={p.id}>
              {ioOps.map((op, j) => (
                <tr
                  key={`${p.id}-${String(j)}`}
                  data-testid={`process-row-${p.id}-io-${String(j)}`}
                >
                  {j === 0 && (
                    <>
                      <td rowSpan={span}>{p.id}</td>
                      <td rowSpan={span} className={styles.numeric}>{p.arrival_time}</td>
                      <td rowSpan={span} className={styles.numeric}>{p.burst_time}</td>
                      {showPriority && (
                        <td rowSpan={span} className={styles.numeric}>{p.priority ?? '—'}</td>
                      )}
                    </>
                  )}
                  <td className={styles.numeric}>{op.io_entry}</td>
                  <td className={styles.numeric}>{op.io_time}</td>
                  <td className={styles.numeric}>{op.io_entry + op.io_time}</td>
                </tr>
              ))}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
