import type { CharacterDefinition } from '../types/game';

const modules = import.meta.glob('./json/characters.json', { eager: true });

function normalizeCharacters(raw: unknown): Record<string, CharacterDefinition> {
  const result: Record<string, CharacterDefinition> = {};
  if (!raw || typeof raw !== 'object') return result;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item) {
        const charDef = item as CharacterDefinition;
        if (charDef.id) {
          result[charDef.id] = charDef;
        }
      }
    }
    return result;
  }

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object') {
      const charDef = val as CharacterDefinition;
      const id = charDef.id || key;
      result[id] = { ...charDef, id };
    }
  }
  return result;
}

const rawModule = modules['./json/characters.json'] as { default?: unknown } | undefined;
export const CHARACTERS_CATALOG: Record<string, CharacterDefinition> = normalizeCharacters(
  rawModule?.default ?? rawModule
);
