import type { LevelEventDefinition } from '../types/game';

const legacyModules = import.meta.glob('./json/events.json', { eager: true });
const folderModules = import.meta.glob('./json/events/*.json', { eager: true });

function filenameSlug(path: string): string {
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.json$/i, '');
}

function unwrap(mod: unknown): unknown {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default?: unknown }).default
    : mod;
}

function ingest(raw: unknown, out: Record<string, LevelEventDefinition>, fallbackId?: string) {
  if (!raw || typeof raw !== 'object') return;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        out[item.id] = item as LevelEventDefinition;
      }
    }
    return;
  }

  const obj = raw as Record<string, unknown>;
  if (fallbackId && ('trigger' in obj || 'logic' in obj || 'visual' in obj || 'name' in obj)) {
    const def = obj as Partial<LevelEventDefinition>;
    const id = def.id ?? fallbackId;
    out[id] = { ...def, id };
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object') {
      const def = val as Partial<LevelEventDefinition>;
      const id = def.id ?? key;
      out[id] = { ...def, id };
    }
  }
}

function parseEventsCatalog(): Record<string, LevelEventDefinition> {
  const out: Record<string, LevelEventDefinition> = {};
  for (const mod of Object.values(legacyModules)) {
    ingest(unwrap(mod), out);
  }
  for (const [path, mod] of Object.entries(folderModules)) {
    ingest(unwrap(mod), out, filenameSlug(path));
  }
  return out;
}

export const EVENTS_CATALOG: Record<string, LevelEventDefinition> = parseEventsCatalog();
