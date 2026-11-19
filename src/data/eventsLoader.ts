import { LevelEventDefinition } from '../types/game';

const optionalEventModules = import.meta.glob('./json/events.json', { eager: true }) as Record<
  string,
  { default?: unknown } | unknown
>;

function parseEventsCatalog(): Record<string, LevelEventDefinition> {
  const mod = Object.values(optionalEventModules)[0];
  if (!mod) return {};
  const raw =
    typeof mod === 'object' && mod !== null && 'default' in mod
      ? (mod as { default?: unknown }).default
      : mod;

  if (!raw || typeof raw !== 'object') return {};

  const out: Record<string, LevelEventDefinition> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        out[item.id] = item as LevelEventDefinition;
      }
    }
    return out;
  }

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (val && typeof val === 'object') {
      const def = val as Partial<LevelEventDefinition>;
      out[key] = {
        ...def,
        id: def.id ?? key,
      };
    }
  }
  return out;
}

export const EVENTS_CATALOG: Record<string, LevelEventDefinition> = parseEventsCatalog();
