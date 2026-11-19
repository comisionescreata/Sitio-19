import type { CharacterDefinition } from '../types/game';

const legacyModules = import.meta.glob('./json/characters.json', { eager: true });
const folderModules = import.meta.glob('./json/characters/*.json', { eager: true });

function filenameSlug(path: string): string {
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.json$/i, '');
}

function unwrap(mod: unknown): unknown {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default?: unknown }).default
    : mod;
}

function ingest(raw: unknown, out: Record<string, CharacterDefinition>, fallbackId?: string) {
  if (!raw || typeof raw !== 'object') return;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item) {
        const charDef = item as CharacterDefinition;
        if (charDef.id) out[charDef.id] = charDef;
      }
    }
    return;
  }

  const obj = raw as Record<string, unknown>;
  // Single character object in characters/<id>.json (must have name or expressions/defaultPortrait)
  if (
    fallbackId &&
    ('name' in obj || 'expressions' in obj || 'defaultPortrait' in obj || 'title' in obj)
  ) {
    const charDef = obj as unknown as CharacterDefinition;
    const id = charDef.id || fallbackId;
    out[id] = { ...charDef, id };
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object') {
      const charDef = val as CharacterDefinition;
      const id = charDef.id || key;
      out[id] = { ...charDef, id };
    }
  }
}

function parseCharactersCatalog(): Record<string, CharacterDefinition> {
  const out: Record<string, CharacterDefinition> = {};
  for (const mod of Object.values(legacyModules)) {
    ingest(unwrap(mod), out);
  }
  for (const [path, mod] of Object.entries(folderModules)) {
    ingest(unwrap(mod), out, filenameSlug(path));
  }
  return out;
}

export const CHARACTERS_CATALOG: Record<string, CharacterDefinition> = parseCharactersCatalog();
