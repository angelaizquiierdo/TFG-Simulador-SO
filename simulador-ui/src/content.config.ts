import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
/**
 * @description USo de la interfaz
 * - id : que es y que realiza
 * 
 */
export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};