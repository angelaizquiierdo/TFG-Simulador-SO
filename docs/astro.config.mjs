// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  integrations: [
    starlight({
      title: 'CPU Scheduler Simulator',
      sidebar: [
        {
          label: 'Guías',
          items: [
            { label: 'Integración del componente', link: '/guide/01-integracion-del-componente' },
            { label: 'Configuración y escenarios', link: '/guide/02-configuracion-y-escenarios' },
            { label: 'Crear nuevo algoritmo',      link: '/guide/03-crear-nuevo-algoritmo' },
          ],
        },
        {
          label: 'No expropiativos',
          items: [
            { label: 'FCFS',           link: '/cpu-scheduler/non-preemptive/fcfs' },
            { label: 'SJF',            link: '/cpu-scheduler/non-preemptive/sjf' },
            { label: 'LJF',            link: '/cpu-scheduler/non-preemptive/ljf' },
            { label: 'Prioridad (NP)', link: '/cpu-scheduler/non-preemptive/prio-n' },
          ],
        },
        {
          label: 'Expropiativos',
          items: [
            { label: 'Round Robin',         link: '/cpu-scheduler/preemptive/round-robin' },
            { label: 'SRTF',               link: '/cpu-scheduler/preemptive/srtf' },
            { label: 'Prioridad (P)',       link: '/cpu-scheduler/preemptive/prio-p' },
            { label: 'Round Robin Virtual', link: '/cpu-scheduler/preemptive/virtual-round-robin' },
            { label: 'MLFQ',               link: '/cpu-scheduler/preemptive/mlfq' },
          ],
        },
      ],
    }),
    react(),
  ],
  vite: {
    resolve: {
      alias: {
        'cpu-scheduler': path.resolve(__dirname, '../src/index.ts'),
      },
    },
  },
});
