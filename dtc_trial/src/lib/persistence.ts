import { createStore, del, get, set } from 'idb-keyval';
import type { Project, ProjectSummary } from '../types';
import { SCHEMA_VERSION } from '../types';
import { countProject } from './tree';
import { newId } from './id';

const store = createStore('dt-configurator', 'projects');
const INDEX_KEY = 'index';
const projectKey = (id: string) => `project:${id}`;

export function summarize(p: Project): ProjectSummary {
  return { id: p.id, name: p.name, client: p.client, industry: p.industry, updatedAt: p.updatedAt, ...countProject(p) };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const index = (await get<ProjectSummary[]>(INDEX_KEY, store)) ?? [];
  return index.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const p = await get<Project>(projectKey(id), store);
  return p && migrate(p);
}

export async function saveProject(p: Project): Promise<void> {
  await set(projectKey(p.id), p, store);
  const index = (await get<ProjectSummary[]>(INDEX_KEY, store)) ?? [];
  const next = [summarize(p), ...index.filter((s) => s.id !== p.id)];
  await set(INDEX_KEY, next, store);
}

export async function deleteProject(id: string): Promise<void> {
  await del(projectKey(id), store);
  const index = (await get<ProjectSummary[]>(INDEX_KEY, store)) ?? [];
  await set(INDEX_KEY, index.filter((s) => s.id !== id), store);
}

/** Upgrades older saved/imported projects to the current schema. Add steps here as the schema evolves. */
export function migrate(raw: Project): Project {
  const p = structuredClone(raw);
  if (!p.schemaVersion) p.schemaVersion = 1;
  // if (p.schemaVersion === 1) { ...; p.schemaVersion = 2; }
  p.schemaVersion = SCHEMA_VERSION;
  return p;
}

export function parseImportedProject(text: string, { asCopy }: { asCopy: boolean }): Project {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !data.plant || !Array.isArray(data.plant.departments)) {
    throw new Error('File is not a Digital Twin configuration');
  }
  const p = migrate(data as Project);
  if (asCopy) {
    p.id = newId('prj');
    p.updatedAt = new Date().toISOString();
  }
  return p;
}
