import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/ProcessTable.module.css';

/**
 * Tabla de procesos del escenario activo.
 * Lee `processes` y `requires` del contexto.
 * Columnas condicionales: `priority` (si requires.priority),
 * `io_entry`, `io_time`, `io_exit` derivado (si requires.io).
 */
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
          const ioOps = p.io ?? [];
          return (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td className={styles.numeric}>{p.arrival_time}</td>
              <td className={styles.numeric}>{p.burst_time}</td>
              {showPriority && (
                <td className={styles.numeric}>
                  {p.priority ?? '—'}
                </td>
              )}
              {showIO && (
                <>
                  <td className={styles.numeric}>
                    {ioOps.length > 0
                      ? ioOps.map((op) => op.io_entry).join(', ')
                      : '—'}
                  </td>
                  <td className={styles.numeric}>
                    {ioOps.length > 0
                      ? ioOps.map((op) => op.io_time).join(', ')
                      : '—'}
                  </td>
                  <td className={styles.numeric}>
                    {ioOps.length > 0
                      ? ioOps.map((op) => op.io_entry + op.io_time).join(', ')
                      : '—'}
                  </td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
