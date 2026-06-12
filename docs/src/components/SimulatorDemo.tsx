// Componente de demostración para páginas MDX.
// Agrupa SimulationProvider + los cuatro componentes visuales en un único island de React.
import React from 'react';
import {
  SimulationProvider,
  ProcessTable,
  GanttChart,
  PlaybackControls,
  MetricsTable,
} from 'cpu-scheduler';
import type { Process } from 'cpu-scheduler';

interface SimulatorDemoProps {
  readonly algorithm: string;
  readonly processes: Process[];
  readonly params?: { quantum?: number };
}

export function SimulatorDemo({ algorithm, processes, params }: SimulatorDemoProps): React.ReactElement {
  return (
    <SimulationProvider algorithm={algorithm} processes={processes} params={params}>
      <ProcessTable />
      <GanttChart />
      <PlaybackControls />
      <MetricsTable />
    </SimulationProvider>
  );
}
