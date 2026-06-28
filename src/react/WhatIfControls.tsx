import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/WhatIfControls.module.css';

/**
 * Panel de control para la rama what-if.
 * Solo se muestra cuando el reproductor está en un tick intermedio
 * (0 < tick_actual < último tick).
 */
export function WhatIfControls(): React.ReactElement | null {
  const { result, currentEvent, whatIfBranch, createWhatIf, discardWhatIf } = useSimulation();

  if (result === null || currentEvent === undefined) return null;

  const lastTick = result.history.length - 1;
  const currentTick = currentEvent.tick;

  // Solo visible en tick intermedio (no en el inicio ni al final)
  if (currentTick <= 0 || currentTick >= lastTick) return null;

  return (
    <div data-testid="whatif-controls" className={styles.container}>
      {whatIfBranch === null ? (
        <button
          type="button"
          className={styles.createButton}
          data-testid="create-whatif-button"
          onClick={() => {
            createWhatIf({});
          }}
        >
          Crear rama what-if
        </button>
      ) : (
        <div className={styles.branchIndicator}>
          <span className={styles.branchLabel} data-testid="whatif-branch-indicator">
            Rama what-if activa
          </span>
          <button
            type="button"
            className={styles.discardButton}
            data-testid="discard-whatif-button"
            onClick={() => {
              discardWhatIf();
            }}
          >
            Descartar rama
          </button>
        </div>
      )}
    </div>
  );
}
