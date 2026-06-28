declare module 'astro:content' {
	interface Render {
		'.mdx': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	}
}

declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"docs": {
"cpu-scheduler/non-preemptive/fcfs.mdx": {
	id: "cpu-scheduler/non-preemptive/fcfs.mdx";
  slug: "cpu-scheduler/non-preemptive/fcfs";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/non-preemptive/ljf.mdx": {
	id: "cpu-scheduler/non-preemptive/ljf.mdx";
  slug: "cpu-scheduler/non-preemptive/ljf";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/non-preemptive/prio-n.mdx": {
	id: "cpu-scheduler/non-preemptive/prio-n.mdx";
  slug: "cpu-scheduler/non-preemptive/prio-n";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/non-preemptive/sjf.mdx": {
	id: "cpu-scheduler/non-preemptive/sjf.mdx";
  slug: "cpu-scheduler/non-preemptive/sjf";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/preemptive/mlfq.mdx": {
	id: "cpu-scheduler/preemptive/mlfq.mdx";
  slug: "cpu-scheduler/preemptive/mlfq";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/preemptive/prio-p.mdx": {
	id: "cpu-scheduler/preemptive/prio-p.mdx";
  slug: "cpu-scheduler/preemptive/prio-p";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/preemptive/round-robin.mdx": {
	id: "cpu-scheduler/preemptive/round-robin.mdx";
  slug: "cpu-scheduler/preemptive/round-robin";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/preemptive/srtf.mdx": {
	id: "cpu-scheduler/preemptive/srtf.mdx";
  slug: "cpu-scheduler/preemptive/srtf";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"cpu-scheduler/preemptive/virtual-round-robin.mdx": {
	id: "cpu-scheduler/preemptive/virtual-round-robin.mdx";
  slug: "cpu-scheduler/preemptive/virtual-round-robin";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"guide/01-integracion-del-componente.mdx": {
	id: "guide/01-integracion-del-componente.mdx";
  slug: "guide/01-integracion-del-componente";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"guide/02-configuracion-y-escenarios.mdx": {
	id: "guide/02-configuracion-y-escenarios.mdx";
  slug: "guide/02-configuracion-y-escenarios";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"guide/03-crear-nuevo-algoritmo.mdx": {
	id: "guide/03-crear-nuevo-algoritmo.mdx";
  slug: "guide/03-crear-nuevo-algoritmo";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
"index.mdx": {
	id: "index.mdx";
  slug: "index";
  body: string;
  collection: "docs";
  data: any
} & { render(): Render[".mdx"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = never;
}
