import { compileLevelMetadata } from '../engine/levelParser';
import { EnemyType, LevelConfig } from '../types/game';
import {
  CHARACTERS_CATALOG,
  DESIGN_CATALOG,
  DIALOGUES_CATALOG,
  EFFECTS_CATALOG,
  ENEMY_CATALOG,
  EVENTS_CATALOG,
  GAME_CONFIG,
  GRID_COLS,
  GRID_ROWS,
  OBJECTIVES_CATALOG,
  PARTICLES_CATALOG,
  RAW_LEVEL_CATALOG,
  SECTOR_BACKDROP_IMAGE,
  TOWER_CATALOG,
} from './catalogLoaders';

export {
  CHARACTERS_CATALOG,
  DESIGN_CATALOG,
  DIALOGUES_CATALOG,
  EFFECTS_CATALOG,
  ENEMY_CATALOG,
  EVENTS_CATALOG,
  GAME_CONFIG,
  GRID_COLS,
  GRID_ROWS,
  OBJECTIVES_CATALOG,
  PARTICLES_CATALOG,
  RAW_LEVEL_CATALOG,
  SECTOR_BACKDROP_IMAGE,
  TOWER_CATALOG,
};

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
