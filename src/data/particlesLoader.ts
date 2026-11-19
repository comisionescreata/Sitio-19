import type { ParticlePresetDefinition } from '../types/game';

const legacyModules = import.meta.glob('./json/particles.json', { eager: true });
const folderModules = import.meta.glob('./json/particles/*.json', { eager: true });

function filenameSlug(path: string): string {
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.json$/i, '');
}

function unwrap(mod: unknown): unknown {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default?: unknown }).default
    : mod;
}

function ingest(raw: unknown, out: Record<string, ParticlePresetDefinition>, fallbackId?: string) {
  if (!raw || typeof raw !== 'object') return;

  const sourceObj =
    'presets' in raw &&
    typeof (raw as { presets?: unknown }).presets === 'object' &&
    (raw as { presets?: unknown }).presets !== null
      ? (raw as { presets: unknown }).presets
      : raw;

  if (Array.isArray(sourceObj)) {
    for (const item of sourceObj) {
      if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
        const def = item as Partial<ParticlePresetDefinition>;
        out[item.id] = {
          ...def,
          id: item.id,
          emitters: Array.isArray(def.emitters) ? def.emitters : [],
        };
      }
    }
    return;
  }

  const obj = sourceObj as Record<string, unknown>;
  if (fallbackId && Array.isArray(obj.emitters)) {
    const def = obj as Partial<ParticlePresetDefinition>;
    const id = def.id ?? fallbackId;
    out[id] = {
      ...def,
      id,
      emitters: def.emitters ?? [],
    };
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object') {
      const def = val as Partial<ParticlePresetDefinition>;
      const id = def.id ?? key;
      out[id] = {
        ...def,
        id,
        emitters: Array.isArray(def.emitters) ? def.emitters : [],
      };
    }
  }
}

function parseParticlesCatalog(): Record<string, ParticlePresetDefinition> {
  const out: Record<string, ParticlePresetDefinition> = {};
  for (const mod of Object.values(legacyModules)) {
    ingest(unwrap(mod), out);
  }
  for (const [path, mod] of Object.entries(folderModules)) {
    ingest(unwrap(mod), out, filenameSlug(path));
  }
  return out;
}

export const PARTICLES_CATALOG: Record<string, ParticlePresetDefinition> = parseParticlesCatalog();
