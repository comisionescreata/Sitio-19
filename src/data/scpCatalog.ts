import { compileLevelMetadata } from '../engine/levelParser';
import {
  DesignCatalog,
  EffectDefinition,
  EnemyDefinition,
  EnemyType,
  GameConfig,
  LevelConfig,
  RawLevelConfig,
  TowerDefinition,
} from '../types/game';
import { CHARACTERS_CATALOG } from './charactersLoader';
import { DIALOGUES_CATALOG } from './dialoguesLoader';
import { EVENTS_CATALOG } from './eventsLoader';
import configJson from './json/config.json';
import designsJson from './json/designs.json';
import effectsJson from './json/effects.json';
import levelsJson from './json/levels.json';
import scpsJson from './json/scps.json';
import towersJson from './json/towers.json';

export { CHARACTERS_CATALOG, DIALOGUES_CATALOG, EVENTS_CATALOG };
export const GAME_CONFIG = configJson as GameConfig;
export const GRID_ROWS = GAME_CONFIG.grid.rows;
export const GRID_COLS = GAME_CONFIG.grid.cols;
export const SECTOR_BACKDROP_IMAGE = GAME_CONFIG.app.sectorBackdropImage;

export const DESIGN_CATALOG = designsJson as DesignCatalog;
export const EFFECTS_CATALOG = effectsJson as Record<string, EffectDefinition>;
export const TOWER_CATALOG = towersJson as TowerDefinition[];
export const ENEMY_CATALOG = scpsJson as EnemyDefinition[];
export const RAW_LEVEL_CATALOG = levelsJson as RawLevelConfig[];
export const LEVEL_CATALOG: LevelConfig[] = RAW_LEVEL_CATALOG.map(compileLevelMetadata);

const seenScps = new Set<EnemyType>();
export const NEW_SCP_MILESTONES: Set<number> = (() => {
  const milestones = new Set<number>();
  const summonTypes = new Set(ENEMY_CATALOG.filter((e) => e.isSummon).map((e) => e.type));
  for (const lvl of LEVEL_CATALOG) {
    for (const enemyType of lvl.enemiesPresent) {
      if (!summonTypes.has(enemyType) && !seenScps.has(enemyType)) {
        seenScps.add(enemyType);
        milestones.add(lvl.level);
      }
    }
  }
  return milestones;
})();
