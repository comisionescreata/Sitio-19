import type { DialogueDefinition } from '../types/game';

const legacyModules = import.meta.glob('./json/dialogues.json', { eager: true });
const folderModules = import.meta.glob('./json/dialogues/*.json', { eager: true });

function filenameSlug(path: string): string {
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.json$/i, '');
}

function unwrap(mod: unknown): unknown {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default?: unknown }).default
    : mod;
}

function ingest(raw: unknown, out: Record<string, DialogueDefinition>, fallbackId?: string) {
  if (!raw || typeof raw !== 'object') return;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item) {
        const dlg = item as DialogueDefinition;
        if (dlg.id && Array.isArray(dlg.lines)) {
          out[dlg.id] = dlg;
        }
      }
    }
    return;
  }

  const obj = raw as Record<string, unknown>;
  if (fallbackId && Array.isArray(obj.lines)) {
    const dlg = obj as unknown as DialogueDefinition;
    const id = dlg.id || fallbackId;
    out[id] = { ...dlg, id };
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object') {
      const dlg = val as DialogueDefinition;
      if (!Array.isArray(dlg.lines)) continue;
      const id = dlg.id || key;
      out[id] = { ...dlg, id };
    }
  }
}

function parseDialoguesCatalog(): Record<string, DialogueDefinition> {
  const out: Record<string, DialogueDefinition> = {};
  for (const mod of Object.values(legacyModules)) {
    ingest(unwrap(mod), out);
  }
  for (const [path, mod] of Object.entries(folderModules)) {
    ingest(unwrap(mod), out, filenameSlug(path));
  }
  return out;
}

export const DIALOGUES_CATALOG: Record<string, DialogueDefinition> = parseDialoguesCatalog();
