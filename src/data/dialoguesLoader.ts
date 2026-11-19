import type { DialogueDefinition } from '../types/game';

const modules = import.meta.glob('./json/dialogues.json', { eager: true });

function normalizeDialogues(raw: unknown): Record<string, DialogueDefinition> {
  const result: Record<string, DialogueDefinition> = {};
  if (!raw || typeof raw !== 'object') return result;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item) {
        const dlg = item as DialogueDefinition;
        if (dlg.id && Array.isArray(dlg.lines)) {
          result[dlg.id] = dlg;
        }
      }
    }
    return result;
  }

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (key.startsWith('_')) continue;
    if (val && typeof val === 'object') {
      const dlg = val as DialogueDefinition;
      if (!Array.isArray(dlg.lines)) continue;
      const id = dlg.id || key;
      result[id] = { ...dlg, id };
    }
  }
  return result;
}

const rawModule = modules['./json/dialogues.json'] as { default?: unknown } | undefined;
export const DIALOGUES_CATALOG: Record<string, DialogueDefinition> = normalizeDialogues(
  rawModule?.default ?? rawModule
);
