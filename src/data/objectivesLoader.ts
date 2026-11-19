import type { ObjectiveDefinition } from '../types/game';

const rootModules = import.meta.glob('./json/{objectives,objetives}.json', { eager: true });
const folderModules = import.meta.glob('./json/{objectives,objetives}/*.json', { eager: true });

function filenameSlug(path: string): string {
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.json$/i, '');
}

function unwrap(mod: unknown): unknown {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default?: unknown }).default
    : mod;
}

function ingest(raw: unknown, out: Record<string, ObjectiveDefinition>, fallbackId?: string) {
  if (!raw || typeof raw !== 'object') return;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        const def = item as ObjectiveDefinition;
        if (def.kind) out[def.id] = def;
      }
    }
    return;
  }

  const obj = raw as Record<string, unknown>;
  if (fallbackId && 'kind' in obj && typeof obj.kind === 'string') {
    const def = obj as unknown as ObjectiveDefinition;
    const id = def.id || fallbackId;
    out[id] = {
      ...def,
      id,
      description: def.description ?? def.title ?? id,
    };
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object') {
      const def = val as Partial<ObjectiveDefinition>;
      if (!def.kind) continue;
      const id = def.id ?? key;
      out[id] = {
        ...def,
        id,
        kind: def.kind,
        description: def.description ?? def.title ?? id,
      };
    }
  }
}

function parseObjectivesCatalog(): Record<string, ObjectiveDefinition> {
  const out: Record<string, ObjectiveDefinition> = {};
  for (const mod of Object.values(rootModules)) {
    ingest(unwrap(mod), out);
  }
  for (const [path, mod] of Object.entries(folderModules)) {
    ingest(unwrap(mod), out, filenameSlug(path));
  }
  return out;
}

export const OBJECTIVES_CATALOG: Record<string, ObjectiveDefinition> = parseObjectivesCatalog();
