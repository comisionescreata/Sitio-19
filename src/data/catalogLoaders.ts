import type {
  DesignCatalog,
  EffectDefinition,
  EnemyDefinition,
  GameConfig,
  RawLevelConfig,
  TowerDefinition,
} from '../types/game';
import configJson from './json/config.json';
import baseDesignsJson from './json/designs.json';
import { CHARACTERS_CATALOG } from './charactersLoader';
import { DIALOGUES_CATALOG } from './dialoguesLoader';
import { EVENTS_CATALOG } from './eventsLoader';
import { OBJECTIVES_CATALOG } from './objectivesLoader';
import { PARTICLES_CATALOG } from './particlesLoader';

export {
  CHARACTERS_CATALOG,
  DIALOGUES_CATALOG,
  EVENTS_CATALOG,
  OBJECTIVES_CATALOG,
  PARTICLES_CATALOG,
};

export const GAME_CONFIG = configJson as GameConfig;
export const GRID_ROWS = GAME_CONFIG.grid.rows;
export const GRID_COLS = GAME_CONFIG.grid.cols;
export const SECTOR_BACKDROP_IMAGE = GAME_CONFIG.app.sectorBackdropImage;

function filenameSlug(path: string): string {
  const base = path.split('/').pop() ?? '';
  return base.replace(/\.json$/i, '');
}

function unwrap(mod: unknown): unknown {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default?: unknown }).default
    : mod;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMergeDesign(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (k.startsWith('_') || v === undefined) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMergeDesign(out[k] as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// --- Designs (designs.json + optional designs/*.json overrides) ---
const designFolderModules = import.meta.glob('./json/designs/*.json', { eager: true });

function loadDesignCatalog(): DesignCatalog {
  let merged = { ...(baseDesignsJson as Record<string, unknown>) };
  const knownSections = new Set([
    'board',
    'zones',
    'gates',
    'doors079',
    'statuses',
    'badges',
    'customShapes',
    'defaultTower',
    'defaultEnemy',
    'defaultProjectile',
    'towers',
    'enemies',
    'projectiles',
    'obstacles',
    'tileModifiers',
    'effects',
    'fonts',
    'ui',
    'hudTheme',
  ]);
  for (const [path, mod] of Object.entries(designFolderModules)) {
    const raw = unwrap(mod);
    if (!isPlainObject(raw)) continue;
    const slug = filenameSlug(path);
    // If file is named like designs/board.json and doesn't already wrap { board: ... }, wrap under slug
    const hasTopLevelKey = Object.keys(raw).some((k) => knownSections.has(k));
    if (!hasTopLevelKey && knownSections.has(slug)) {
      merged = deepMergeDesign(merged, { [slug]: raw });
    } else {
      merged = deepMergeDesign(merged, raw);
    }
  }
  return merged as unknown as DesignCatalog;
}

export const DESIGN_CATALOG: DesignCatalog = loadDesignCatalog();

// --- Effects (effects.json + effects/*.json) ---
const legacyEffectsModules = import.meta.glob('./json/effects.json', { eager: true });
const folderEffectsModules = import.meta.glob('./json/effects/*.json', { eager: true });

function loadEffectsCatalog(): Record<string, EffectDefinition> {
  const out: Record<string, EffectDefinition> = {};
  const ingest = (raw: unknown, fallbackId?: string) => {
    if (!raw || typeof raw !== 'object') return;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (isPlainObject(item) && typeof item.id === 'string') {
          out[item.id] = item as unknown as EffectDefinition;
        }
      }
      return;
    }
    const obj = raw as Record<string, unknown>;
    if (fallbackId && ('kind' in obj || 'trigger' in obj || 'modifiers' in obj || 'name' in obj)) {
      const fx = obj as unknown as EffectDefinition;
      const id = fx.id || fallbackId;
      out[id] = { ...fx, id };
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('_') || !isPlainObject(val)) continue;
      const fx = val as unknown as EffectDefinition;
      const id = fx.id || key;
      out[id] = { ...fx, id };
    }
  };
  for (const mod of Object.values(legacyEffectsModules)) ingest(unwrap(mod));
  for (const [path, mod] of Object.entries(folderEffectsModules)) {
    ingest(unwrap(mod), filenameSlug(path));
  }
  return out;
}

export const EFFECTS_CATALOG: Record<string, EffectDefinition> = loadEffectsCatalog();

// --- Towers (towers.json + towers/*.json) ---
const legacyTowerModules = import.meta.glob('./json/towers.json', { eager: true });
const folderTowerModules = import.meta.glob('./json/towers/*.json', { eager: true });

function loadTowerCatalog(): TowerDefinition[] {
  const map = new Map<string, TowerDefinition>();
  const ingest = (raw: unknown, fallbackType?: string) => {
    if (!raw || typeof raw !== 'object') return;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (isPlainObject(item) && typeof item.type === 'string') {
          map.set(item.type, item as unknown as TowerDefinition);
        }
      }
      return;
    }
    const obj = raw as Record<string, unknown>;
    if (fallbackType && ('name' in obj || 'category' in obj || 'cost' in obj)) {
      const def = obj as unknown as TowerDefinition;
      const type = def.type || fallbackType;
      map.set(type, { ...def, type, unlockLevel: def.unlockLevel ?? 0 });
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('_') || !isPlainObject(val)) continue;
      const def = val as unknown as TowerDefinition;
      const type = def.type || key;
      map.set(type, { ...def, type, unlockLevel: def.unlockLevel ?? 0 });
    }
  };

  for (const mod of Object.values(legacyTowerModules)) ingest(unwrap(mod));
  for (const [path, mod] of Object.entries(folderTowerModules)) {
    ingest(unwrap(mod), filenameSlug(path));
  }

  const list = Array.from(map.values());
  const order = GAME_CONFIG.towerOrder;
  if (order && order.length > 0) {
    const orderIdx = new Map(order.map((t, i) => [t, i]));
    list.sort((a, b) => {
      const ia = orderIdx.get(a.type) ?? Number.MAX_SAFE_INTEGER;
      const ib = orderIdx.get(b.type) ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return (a.unlockLevel ?? 0) - (b.unlockLevel ?? 0) || a.cost - b.cost;
    });
  } else {
    list.sort((a, b) => (a.unlockLevel ?? 0) - (b.unlockLevel ?? 0) || a.cost - b.cost);
  }
  return list;
}

export const TOWER_CATALOG: TowerDefinition[] = loadTowerCatalog();

// --- SCPs (scps.json + scps/*.json) ---
const legacyScpModules = import.meta.glob('./json/scps.json', { eager: true });
const folderScpModules = import.meta.glob('./json/scps/*.json', { eager: true });

function loadEnemyCatalog(): EnemyDefinition[] {
  const map = new Map<string, EnemyDefinition>();
  const ingest = (raw: unknown, fallbackType?: string) => {
    if (!raw || typeof raw !== 'object') return;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (isPlainObject(item) && typeof item.type === 'string') {
          map.set(item.type, item as unknown as EnemyDefinition);
        }
      }
      return;
    }
    const obj = raw as Record<string, unknown>;
    if (fallbackType && ('name' in obj || 'code' in obj || 'hp' in obj)) {
      const def = obj as unknown as EnemyDefinition;
      const type = def.type || fallbackType;
      map.set(type, { ...def, type });
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('_') || !isPlainObject(val)) continue;
      const def = val as unknown as EnemyDefinition;
      const type = def.type || key;
      map.set(type, { ...def, type });
    }
  };

  for (const mod of Object.values(legacyScpModules)) ingest(unwrap(mod));
  for (const [path, mod] of Object.entries(folderScpModules)) {
    ingest(unwrap(mod), filenameSlug(path));
  }

  const list = Array.from(map.values());
  const order = GAME_CONFIG.scpOrder;
  if (order && order.length > 0) {
    const orderIdx = new Map(order.map((t, i) => [t, i]));
    list.sort((a, b) => {
      const ia = orderIdx.get(a.type) ?? Number.MAX_SAFE_INTEGER;
      const ib = orderIdx.get(b.type) ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.code.localeCompare(b.code);
    });
  }
  return list;
}

export const ENEMY_CATALOG: EnemyDefinition[] = loadEnemyCatalog();

// --- Levels (levels.json + numbered levels/<N>.json ordered by config.levelOrder) ---
const legacyLevelModules = import.meta.glob('./json/levels.json', { eager: true });
const folderLevelModules = import.meta.glob('./json/levels/*.json', { eager: true });

function loadRawLevels(): RawLevelConfig[] {
  const byNumber = new Map<number, RawLevelConfig>();
  const ingest = (raw: unknown, fallbackNum?: number) => {
    if (!raw || typeof raw !== 'object') return;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (isPlainObject(item) && typeof item.level === 'number') {
          byNumber.set(item.level, item as unknown as RawLevelConfig);
        }
      }
      return;
    }
    const lvlObj = raw as RawLevelConfig;
    const lvlNum = typeof lvlObj.level === 'number' ? lvlObj.level : fallbackNum;
    if (lvlNum !== undefined && Number.isFinite(lvlNum)) {
      byNumber.set(lvlNum, { ...lvlObj, level: lvlNum });
    }
  };

  for (const mod of Object.values(legacyLevelModules)) ingest(unwrap(mod));
  for (const [path, mod] of Object.entries(folderLevelModules)) {
    const slug = filenameSlug(path);
    const parsed = Number(slug);
    const fallbackNum = Number.isFinite(parsed) && slug !== '' ? parsed : undefined;
    ingest(unwrap(mod), fallbackNum);
  }

  const configuredOrder = GAME_CONFIG.levelOrder;
  if (configuredOrder && configuredOrder.length > 0) {
    const ordered: RawLevelConfig[] = [];
    const used = new Set<number>();
    for (const num of configuredOrder) {
      const found = byNumber.get(num);
      if (found && !used.has(num)) {
        ordered.push(found);
        used.add(num);
      }
    }
    const rest = Array.from(byNumber.entries())
      .filter(([num]) => !used.has(num))
      .sort(([a], [b]) => a - b)
      .map(([, cfg]) => cfg);
    return [...ordered, ...rest];
  }

  return Array.from(byNumber.entries())
    .sort(([a], [b]) => a - b)
    .map(([, cfg]) => cfg);
}

export const RAW_LEVEL_CATALOG: RawLevelConfig[] = loadRawLevels();
