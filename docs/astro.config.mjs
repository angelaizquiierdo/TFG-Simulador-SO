// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'CPU Scheduler Simulator',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/angelaizquiierdo/TFG-Simulador-SO' }],
      sidebar: [
        {
          label: 'No expropiativos',
          items: [
            { label: 'FCFS',          link: '/cpu-scheduler/non-preemptive/fcfs' },
            { label: 'SJF',           link: '/cpu-scheduler/non-preemptive/sjf' },
            { label: 'LJF',           link: '/cpu-scheduler/non-preemptive/ljf' },
            { label: 'Prioridad (NP)', link: '/cpu-scheduler/non-preemptive/prio-n' },
          ],
        },
        {
          label: 'Expropiativos',
          items: [
            { label: 'Round Robin', link: '/cpu-scheduler/preemptive/round-robin' },
            { label: 'SRTF',        link: '/cpu-scheduler/preemptive/srtf' },
            { label: 'Prioridad (P)', link: '/cpu-scheduler/preemptive/prio-p' },
          ],
        },
      ],
    }),
    react(),
  ],
  vite: {
    resolve: {
      alias: {
        'cpu-scheduler': resolve(__dirname, '../src/index.ts'),
      },
    },
  },
});
