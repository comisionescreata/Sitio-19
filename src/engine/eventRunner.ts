import { EVENTS_CATALOG } from '../data/eventsLoader';
import { EFFECTS_CATALOG, ENEMY_CATALOG, GAME_CONFIG } from '../data/scpCatalog';
import {
  BoardDesignConfig,
  BoardObstacle,
  BoardObstacleConfig,
  EffectDefinition,
  Enemy,
  EnemyImmunity,
  EnemyTargetFilter,
  EnemyType,
  LevelConfig,
  LevelEventDefinition,
  LevelEventSpawnEntry,
  ResolvedSpawnTarget,
  Tower,
  WeatherParticleKind,
} from '../types/game';
import {
  applyDeclarativeEffectToEnemy,
  applyDeclarativeEffectToTower,
  initEntityEffectTimers,
  playEffectSound,
  spawnParticleBurst,
} from './effectRunner';
import { resolveSpawnTargetsForSpec } from './levelParser';
import type { SimState, WaveSpawnOverrides } from './simulation';

export interface ActiveScriptEventState {
  def: LevelEventDefinition;
  timer: number;
  cooldown: number;
  triggersCount: number;
  wasConditionTrue: boolean;
  lastNumericValue?: number;
}

export interface PendingStaggeredSpawn {
  delay: number;
  type: EnemyType;
  target: ResolvedSpawnTarget;
  col: number;
  packId?: string;
  waveOpts?: WaveSpawnOverrides;
}

export interface PendingChainedEvent {
  delay: number;
  eventId: string;
  overrides?: Partial<LevelEventDefinition>;
}

export interface ActiveGlobalModifier {
  remaining: number;
  enemySpeedMultiplier?: number;
  enemyDamageMultiplier?: number;
  towerFireRateMultiplier?: number;
  towerDamageMultiplier?: number;
  energyGenerationMultiplier?: number;
  autoCollectEnergy?: boolean;
}

export interface ActiveBoardOverride {
  remaining: number;
  override: Partial<BoardDesignConfig>;
}

export interface ActiveScreenTint {
  rgb: string;
  alpha: number;
  pulseSpeed?: number;
  remaining: number;
}

export interface ActiveWeatherState {
  kind: WeatherParticleKind;
  color?: string;
  density?: number;
  speed?: number;
  remaining: number;
}

export interface ActiveLaneHighlight {
  rows?: number[];
  cols?: number[];
  color: string;
  strokeColor?: string;
  label?: string;
  pulseSpeed?: number;
  remaining: number;
}

export interface CustomBannerState {
  text: string;
  color?: string;
  borderColor?: string;
  style?: 'info' | 'warning' | 'danger' | 'horde';
  remaining: number;
}

export type SpawnEnemyFn = (
  s: SimState,
  type: EnemyType,
  target: ResolvedSpawnTarget,
  col: number,
  packId?: string,
  waveOpts?: WaveSpawnOverrides
) => void;

export type HasEnemyImmunityFn = (
  type: EnemyType,
  immunity: EnemyImmunity,
  enemy?: Enemy
) => boolean;

export interface EventEngineCallbacks {
  spawnObstacle?: (s: SimState, cfg: BoardObstacleConfig) => BoardObstacle | null;
  destroyObstacle?: (s: SimState, ob: BoardObstacle, triggerDestroyEffects?: boolean) => void;
}

export function resolveEventDefinition(
  eventId?: string,
  overrides?: Partial<LevelEventDefinition>,
  inline?: Partial<LevelEventDefinition>
): LevelEventDefinition | null {
  const base = eventId ? EVENTS_CATALOG[eventId] : undefined;
  const srcA = overrides;
  const srcB = inline;
  if (!base && !srcA && !srcB) return null;

  const mergedLogic = {
    ...(base?.logic ?? {}),
    ...(srcA?.logic ?? {}),
    ...(srcB?.logic ?? {}),
  };
  const mergedVisual = {
    ...(base?.visual ?? {}),
    ...(srcA?.visual ?? {}),
    ...(srcB?.visual ?? {}),
  };

  return {
    id: srcB?.id ?? srcA?.id ?? base?.id ?? eventId ?? 'inline_event',
    name: srcB?.name ?? srcA?.name ?? base?.name,
    description: srcB?.description ?? srcA?.description ?? base?.description,
    trigger: srcB?.trigger ?? srcA?.trigger ?? base?.trigger,
    time: srcB?.time ?? srcA?.time ?? base?.time,
    initialDelaySec: srcB?.initialDelaySec ?? srcA?.initialDelaySec ?? base?.initialDelaySec,
    intervalSec: srcB?.intervalSec ?? srcA?.intervalSec ?? base?.intervalSec,
    durationSec: srcB?.durationSec ?? srcA?.durationSec ?? base?.durationSec,
    cooldownSec: srcB?.cooldownSec ?? srcA?.cooldownSec ?? base?.cooldownSec,
    maxTriggers: srcB?.maxTriggers ?? srcA?.maxTriggers ?? base?.maxTriggers,
    chance: srcB?.chance ?? srcA?.chance ?? base?.chance,
    threshold: srcB?.threshold ?? srcA?.threshold ?? base?.threshold,
    progressRatio: srcB?.progressRatio ?? srcA?.progressRatio ?? base?.progressRatio,
    targetDialogueId: srcB?.targetDialogueId ?? srcA?.targetDialogueId ?? base?.targetDialogueId,
    targetEnemyType: srcB?.targetEnemyType ?? srcA?.targetEnemyType ?? base?.targetEnemyType,
    hpThresholdRatio: srcB?.hpThresholdRatio ?? srcA?.hpThresholdRatio ?? base?.hpThresholdRatio,
    waveIndex: srcB?.waveIndex ?? srcA?.waveIndex ?? base?.waveIndex,
    logic: Object.keys(mergedLogic).length > 0 ? mergedLogic : undefined,
    visual: Object.keys(mergedVisual).length > 0 ? mergedVisual : undefined,
  };
}

export function filterAndSortEnemies(enemies: Enemy[], filter?: EnemyTargetFilter): Enemy[] {
  let matched = enemies.filter((e) => e.hp > 0);
  if (!filter) return matched;

  matched = matched.filter((e) => {
    if (filter.types && filter.types.length > 0 && !filter.types.includes(e.type)) {
      return false;
    }
    if (filter.excludeTypes && filter.excludeTypes.includes(e.type)) {
      return false;
    }
    if (filter.packIds && filter.packIds.length > 0 && (!e.packId || !filter.packIds.includes(e.packId))) {
      return false;
    }
    if (filter.eliteOnly && !e.customBadge) return false;
    if (filter.nonEliteOnly && e.customBadge) return false;
    if (
      filter.eliteBadges &&
      filter.eliteBadges.length > 0 &&
      (!e.customBadge || !filter.eliteBadges.includes(e.customBadge.label))
    ) {
      return false;
    }
    if (filter.rows && filter.rows.length > 0 && !e.occupiedRows.some((r) => filter.rows!.includes(r))) {
      return false;
    }
    if (filter.cols && filter.cols.length > 0 && !filter.cols.includes(Math.round(e.col))) {
      return false;
    }
    if (filter.colRange) {
      const [minC, maxC] = filter.colRange;
      if (e.col < minC || e.col > maxC) return false;
    }
    const hpRatio = e.hp / Math.max(1, e.maxHp);
    if (filter.minHpRatio !== undefined && hpRatio < filter.minHpRatio) return false;
    if (filter.maxHpRatio !== undefined && hpRatio > filter.maxHpRatio) return false;
    if (filter.isAttacking !== undefined && e.isAttacking !== filter.isAttacking) return false;
    if (filter.hasEffectIds && filter.hasEffectIds.length > 0) {
      const activeIds = new Set([
        ...(e.extraEffects ?? []),
        ...Object.keys(e.activeEffects ?? {}),
      ]);
      if (!filter.hasEffectIds.some((id) => activeIds.has(id))) return false;
    }
    return true;
  });

  if (filter.sortBy) {
    if (filter.sortBy === 'random') {
      matched = [...matched].sort(() => Math.random() - 0.5);
    } else if (filter.sortBy === 'closest_to_breach') {
      matched = [...matched].sort((a, b) => a.col - b.col);
    } else if (filter.sortBy === 'furthest_from_breach') {
      matched = [...matched].sort((a, b) => b.col - a.col);
    } else if (filter.sortBy === 'lowest_hp') {
      matched = [...matched].sort((a, b) => a.hp - b.hp);
    } else if (filter.sortBy === 'highest_hp') {
      matched = [...matched].sort((a, b) => b.hp - a.hp);
    } else if (filter.sortBy === 'fastest') {
      matched = [...matched].sort((a, b) => b.currentSpeed - a.currentSpeed);
    }
  }

  if (filter.maxTargets !== undefined && filter.maxTargets > 0 && matched.length > filter.maxTargets) {
    matched = matched.slice(0, filter.maxTargets);
  }

  return matched;
}

function buildAdHocEffect(
  id: string,
  base: Partial<EffectDefinition> | undefined,
  inline: Partial<EffectDefinition> | undefined
): EffectDefinition {
  return {
    id,
    name: inline?.name ?? base?.name ?? id,
    description: inline?.description ?? base?.description ?? '',
    engineMode: 'declarative',
    color: inline?.color ?? base?.color ?? '#38BDF8',
    badgeLabel: inline?.badgeLabel ?? base?.badgeLabel,
    badgeTextColor: inline?.badgeTextColor ?? base?.badgeTextColor,
    trigger: inline?.trigger ?? base?.trigger ?? 'on_spawn',
    targetSide: inline?.targetSide ?? base?.targetSide,
    targetCategories: inline?.targetCategories ?? base?.targetCategories,
    targetTypes: inline?.targetTypes ?? base?.targetTypes,
    excludeTypes: inline?.excludeTypes ?? base?.excludeTypes,
    areaShape: inline?.areaShape ?? base?.areaShape,
    radiusCells: inline?.radiusCells ?? base?.radiusCells,
    radiusRows: inline?.radiusRows ?? base?.radiusRows,
    radiusCols: inline?.radiusCols ?? base?.radiusCols,
    durationSec: inline?.durationSec ?? base?.durationSec,
    stackMode: inline?.stackMode ?? base?.stackMode,
    modifiers: {
      ...(base?.modifiers ?? {}),
      ...(inline?.modifiers ?? {}),
    },
    visual: {
      ...(base?.visual ?? {}),
      ...(inline?.visual ?? {}),
    },
  };
}

function scheduleOrSpawnEntry(
  s: SimState,
  sp: LevelEventSpawnEntry,
  nextId: (prefix: string) => string,
  spawnEnemyFn: SpawnEnemyFn
) {
  const targets = resolveSpawnTargetsForSpec(
    sp.type as EnemyType,
    sp.row,
    sp.rows,
    sp.count,
    s.gridRows
  );
  if (targets.length === 0) return;

  const baseCol = sp.col ?? s.gridCols - 0.15;
  const packId = targets.length > 1 ? nextId('pack') : undefined;
  const waveOpts: WaveSpawnOverrides = {
    hpMultiplier: sp.hpMultiplier,
    speedMultiplier: sp.speedMultiplier,
    dpsMultiplier: sp.dpsMultiplier,
    extraEffects: sp.extraEffects,
    immunities: sp.immunities,
    eliteBadge: sp.eliteBadge,
    eliteColor: sp.eliteColor,
  };

  const stagger = sp.staggerSec ?? 0;
  targets.forEach((target, idx) => {
    const col = baseCol + (stagger <= 0 && packId ? idx * 0.2 : 0);
    if (idx === 0 || stagger <= 0) {
      spawnEnemyFn(s, sp.type as EnemyType, target, col, packId, waveOpts);
    } else {
      s.pendingStaggeredSpawns.push({
        delay: idx * stagger,
        type: sp.type as EnemyType,
        target,
        col,
        packId,
        waveOpts,
      });
    }
  });
}

function defaultBuildObstacle(cfg: BoardObstacleConfig, gridRows: number, gridCols: number): BoardObstacle | null {
  const row = Math.max(0, Math.min(gridRows - 1, Math.round(cfg.row)));
  const col = Math.max(0, Math.min(gridCols - 1, Math.round(cfg.col)));
  const kind = cfg.kind ?? 'tombstone';
  const destructible = cfg.destructible ?? (cfg.hp === undefined ? true : cfg.hp > 0);
  const maxHp = Math.max(1, cfg.hp ?? (kind === 'tombstone' ? 320 : 450));
  return {
    id: cfg.id ?? `obs_${row}_${col}_${Math.random().toString(36).slice(2, 6)}`,
    kind,
    row,
    col,
    hp: maxHp,
    maxHp,
    destructible,
    blocksPlacement: cfg.blocksPlacement ?? true,
    blocksProjectiles: cfg.blocksProjectiles ?? true,
    blocksEnemies: cfg.blocksEnemies ?? (kind === 'barricade' || kind === 'debris'),
    blocksEnemySpawn: cfg.blocksEnemySpawn ?? false,
    canSpawnEnemies: cfg.canSpawnEnemies ?? kind === 'tombstone',
    allowCounterPlacement: cfg.allowCounterPlacement ?? kind === 'tombstone',
    counterTowerTypes: cfg.counterTowerTypes ?? (kind === 'tombstone' ? ['engineer', 'grenadier'] : undefined),
    counterDamageMultiplier: cfg.counterDamageMultiplier ?? 4.0,
    absorbsSplash: cfg.absorbsSplash ?? true,
    rewardEnergy: cfg.rewardEnergy ?? (kind === 'tombstone' ? 25 : 0),
    spawnOnDestroy: cfg.spawnOnDestroy,
    triggerEventOnDestroy: cfg.triggerEventOnDestroy,
    sprite: cfg.sprite,
    crackedSprite: cfg.crackedSprite,
    color: cfg.color,
    strokeColor: cfg.strokeColor,
    crackedColor: cfg.crackedColor,
    label: cfg.label,
    widthRatio: cfg.widthRatio,
    heightRatio: cfg.heightRatio,
    hitFlash: 0,
  };
}

function mutateEnemyType(s: SimState, enemy: Enemy, newType: EnemyType, nextId: (p: string) => string) {
  const newDef = ENEMY_CATALOG.find((e) => e.type === newType);
  if (!newDef) return;
  const ratio = enemy.hp / Math.max(1, enemy.maxHp);
  const ruleHp = s.rules?.enemyHpMultiplier ?? 1;
  const ruleSpd = s.rules?.enemySpeedMultiplier ?? 1;
  const ruleDps = s.rules?.enemyDpsMultiplier ?? 1;
  enemy.type = newDef.type;
  enemy.maxHp = Math.max(1, Math.round(newDef.hp * ruleHp));
  enemy.hp = Math.max(1, Math.round(enemy.maxHp * ratio));
  enemy.baseSpeed = newDef.speed * ruleSpd;
  enemy.currentSpeed = enemy.baseSpeed;
  enemy.dps = newDef.dps * ruleDps;
  const laneSpan = newDef.behavior?.laneSpan ?? 1;
  if (laneSpan === 2 && enemy.occupiedRows.length < 2 && s.gridRows > 1) {
    const second = enemy.row + 1 < s.gridRows ? enemy.row + 1 : Math.max(0, enemy.row - 1);
    enemy.occupiedRows = [...new Set([enemy.row, second])].sort((a, b) => a - b);
    enemy.row = enemy.occupiedRows[0];
  } else if (laneSpan === 1) {
    enemy.occupiedRows = [enemy.row];
  }
  initEntityEffectTimers(enemy, [...(newDef.effects ?? []), ...(enemy.extraEffects ?? [])]);
  s.effects.push({
    id: nextId('fx'),
    kind: 'revive_ring',
    row: enemy.row,
    col: enemy.col,
    timer: 0,
    duration: 0.55,
  });
}

export function executeLevelEvent(
  s: SimState,
  def: LevelEventDefinition,
  nextId: (prefix: string) => string,
  spawnEnemyFn: SpawnEnemyFn,
  hasEnemyImmunityFn: HasEnemyImmunityFn,
  contextPos?: { row: number; col: number },
  callbacks?: EventEngineCallbacks
): boolean {
  if (def.chance !== undefined && def.chance < 1 && Math.random() > def.chance) {
    return false;
  }

  const logic = def.logic;
  const visual = def.visual;

  if (logic) {
    if (logic.spawns) {
      for (const sp of logic.spawns) {
        if (!sp.type) continue;
        scheduleOrSpawnEntry(s, sp, nextId, spawnEnemyFn);
      }
    }

    // PvZ-style Tombstone / Obstacle Ambush Spawn
    if (logic.spawnFromObstacles) {
      const cfg = logic.spawnFromObstacles;
      let matchingObs = s.obstacles.filter((ob) => {
        if (!ob.canSpawnEnemies) return false;
        if (cfg.obstacleKind && ob.kind !== cfg.obstacleKind) return false;
        if (cfg.rows && cfg.rows.length > 0 && !cfg.rows.includes(ob.row)) return false;
        if (cfg.cols && cfg.cols.length > 0 && !cfg.cols.includes(ob.col)) return false;
        return true;
      });
      if (cfg.maxObstacles !== undefined && matchingObs.length > cfg.maxObstacles) {
        matchingObs = [...matchingObs].sort(() => Math.random() - 0.5).slice(0, cfg.maxObstacles);
      }
      if (matchingObs.length > 0) {
        playEffectSound('portal');
      }
      for (const ob of matchingObs) {
        s.effects.push({
          id: nextId('fx'),
          kind: 'pocket_portal',
          row: ob.row,
          col: ob.col,
          timer: 0,
          duration: 0.65,
        });
        spawnParticleBurst(s, ob.row, ob.col, '#A855F7', 10, 85, 0.55, 3.5, nextId);
        s.effects.push({
          id: nextId('fx'),
          kind: 'text',
          row: ob.row,
          col: ob.col,
          timer: 0,
          duration: 0.95,
          text: '¡EMERGE!',
          color: '#E879F9',
        });
        const countPer = Math.max(1, cfg.countPerObstacle ?? 1);
        for (const sp of cfg.types ?? []) {
          if (!sp.type) continue;
          const total = Math.max(1, sp.count ?? 1) * countPer;
          for (let i = 0; i < total; i++) {
            const eDef = ENEMY_CATALOG.find((d) => d.type === sp.type);
            const laneSpan = eDef?.behavior?.laneSpan ?? 1;
            const occupied =
              laneSpan === 2 && s.gridRows > 1
                ? [ob.row, ob.row + 1 < s.gridRows ? ob.row + 1 : ob.row - 1].sort((a, b) => a - b)
                : [ob.row];
            spawnEnemyFn(
              s,
              sp.type as EnemyType,
              { row: occupied[0], occupiedRows: occupied },
              Math.max(0.15, ob.col - i * 0.15),
              undefined,
              {
                hpMultiplier: sp.hpMultiplier,
                speedMultiplier: sp.speedMultiplier,
                dpsMultiplier: sp.dpsMultiplier,
                extraEffects: sp.extraEffects,
                immunities: sp.immunities,
                eliteBadge: sp.eliteBadge,
                eliteColor: sp.eliteColor,
              }
            );
          }
        }
        if (cfg.destroyObstacleAfter) {
          if (callbacks?.destroyObstacle) {
            callbacks.destroyObstacle(s, ob, false);
          } else {
            s.obstacles = s.obstacles.filter((o) => o.id !== ob.id);
          }
        }
      }
    }

    if (logic.spawnObstacles) {
      for (const obCfg of logic.spawnObstacles) {
        const created = callbacks?.spawnObstacle
          ? callbacks.spawnObstacle(s, obCfg)
          : defaultBuildObstacle(obCfg, s.gridRows, s.gridCols);
        if (created) {
          const exists = s.obstacles.some((o) => o.row === created.row && o.col === created.col);
          if (!exists) {
            if (!callbacks?.spawnObstacle) {
              s.obstacles.push(created);
            }
            spawnParticleBurst(s, created.row, created.col, created.strokeColor ?? '#94A3B8', 8, 70, 0.45, 3, nextId);
          }
        }
      }
    }

    if (logic.destroyObstacles) {
      const dCfg = logic.destroyObstacles;
      const toRemove = s.obstacles.filter((ob) => {
        if (dCfg.kind && ob.kind !== dCfg.kind) return false;
        if (dCfg.rows && dCfg.rows.length > 0 && !dCfg.rows.includes(ob.row)) return false;
        if (dCfg.cols && dCfg.cols.length > 0 && !dCfg.cols.includes(ob.col)) return false;
        return true;
      });
      for (const ob of toRemove) {
        if (callbacks?.destroyObstacle) {
          callbacks.destroyObstacle(s, ob, dCfg.triggerDestroyEffects ?? false);
        } else {
          s.obstacles = s.obstacles.filter((o) => o.id !== ob.id);
          s.obstacleDestroyedCount += 1;
          spawnParticleBurst(s, ob.row, ob.col, '#94A3B8', 10, 75, 0.45, 3, nextId);
        }
      }
    }

    if (logic.addTileModifiers) {
      for (const tm of logic.addTileModifiers) {
        s.tileModifiers.push({
          ...tm,
          id: tm.id ?? nextId('tmod'),
          remaining: tm.durationSec ?? Infinity,
        });
      }
    }

    if (logic.removeTileModifiers) {
      const rm = logic.removeTileModifiers;
      s.tileModifiers = s.tileModifiers.filter((tm) => {
        if (rm.id && tm.id !== rm.id) return true;
        if (rm.kind && tm.kind !== rm.kind) return true;
        if (rm.rows && rm.rows.length > 0) {
          const tmRows = tm.rows ?? (tm.row !== undefined ? [tm.row] : []);
          if (!tmRows.some((r) => rm.rows!.includes(r))) return true;
        }
        if (rm.cols && rm.cols.length > 0) {
          const tmCols = tm.cols ?? (tm.col !== undefined ? [tm.col] : []);
          if (!tmCols.some((c) => rm.cols!.includes(c))) return true;
        }
        return false;
      });
    }

    if (logic.addBlockedCells) {
      for (const bc of logic.addBlockedCells) {
        if (!s.blockedCells.some((e) => e.row === bc.row && e.col === bc.col)) {
          s.blockedCells.push({ ...bc });
        }
      }
    }

    if (logic.removeBlockedCells) {
      const rb = logic.removeBlockedCells;
      s.blockedCells = s.blockedCells.filter((bc) => {
        const rowMatch = !rb.rows || rb.rows.length === 0 || rb.rows.includes(bc.row);
        const colMatch = !rb.cols || rb.cols.length === 0 || rb.cols.includes(bc.col);
        return !(rowMatch && colMatch);
      });
    }

    // Specific Zombie / SCP Targeting & Mutations
    if (logic.mutateEnemies) {
      for (const mut of logic.mutateEnemies) {
        const targets = filterAndSortEnemies(s.enemies, mut.filter);
        for (const e of targets) {
          if (mut.damageInstant) {
            const absorbed = Math.min(e.shieldHp ?? 0, mut.damageInstant);
            if (e.shieldHp) e.shieldHp -= absorbed;
            e.hp -= Math.max(0, mut.damageInstant - absorbed);
            e.hitFlash = 0.7;
          }
          if (mut.damagePercentMaxHp) {
            e.hp -= e.maxHp * mut.damagePercentMaxHp;
            e.hitFlash = 0.7;
          }
          if (mut.hpMultiplier && mut.hpMultiplier > 0 && mut.hpMultiplier !== 1) {
            e.maxHp = Math.max(1, Math.round(e.maxHp * mut.hpMultiplier));
            e.hp = Math.max(1, Math.round(e.hp * mut.hpMultiplier));
          }
          if (mut.healAmount) {
            e.hp = Math.min(e.maxHp, e.hp + mut.healAmount);
          }
          if (mut.healPercent) {
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * mut.healPercent);
          }
          if (mut.shieldHp && mut.shieldHp > 0) {
            e.shieldHp = (e.shieldHp ?? 0) + mut.shieldHp;
            if (mut.shieldColor) e.shieldColor = mut.shieldColor;
          }
          if (mut.speedMultiplier && mut.speedMultiplier > 0) {
            e.baseSpeed *= mut.speedMultiplier;
            e.currentSpeed *= mut.speedMultiplier;
          }
          if (mut.dpsMultiplier && mut.dpsMultiplier > 0) {
            e.dps *= mut.dpsMultiplier;
          }
          if (mut.stunSec) {
            e.stunTimer = Math.max(e.stunTimer ?? 0, mut.stunSec);
          }
          if (mut.slowFactor && mut.slowSec) {
            e.slowFactor = Math.max(e.slowFactor, mut.slowFactor);
            e.slowTimer = Math.max(e.slowTimer, mut.slowSec);
          }
          if (mut.burnDps && mut.burnSec) {
            e.burnDps = Math.max(e.burnDps, mut.burnDps);
            e.burnTimer = Math.max(e.burnTimer, mut.burnSec);
          }
          if (mut.silenceSec) {
            e.silenceTimer = Math.max(e.silenceTimer ?? 0, mut.silenceSec);
          }
          if (mut.knockbackCols) {
            e.col = Math.min(s.gridCols - 0.15, e.col + mut.knockbackCols);
          }
          if (mut.advanceCols) {
            e.col = Math.max(-0.15, e.col - mut.advanceCols);
          }
          if (mut.teleportToCol !== undefined) {
            e.col = Math.max(-0.15, Math.min(s.gridCols - 0.15, mut.teleportToCol));
          }
          if (mut.shiftLane !== undefined && mut.shiftLane !== 0 && s.gridRows > 1) {
            const span = e.occupiedRows.length;
            const nextMin = Math.max(0, Math.min(s.gridRows - span, e.occupiedRows[0] + mut.shiftLane));
            e.occupiedRows = Array.from({ length: span }, (_, idx) => nextMin + idx);
            e.row = e.occupiedRows[0];
          }
          if (mut.addEffects && mut.addEffects.length > 0) {
            e.extraEffects = Array.from(new Set([...(e.extraEffects ?? []), ...mut.addEffects]));
            initEntityEffectTimers(e, mut.addEffects);
          }
          if (mut.removeEffects && mut.removeEffects.length > 0) {
            if (e.extraEffects) {
              e.extraEffects = e.extraEffects.filter((id) => !mut.removeEffects!.includes(id));
            }
            if (e.activeEffects) {
              for (const rid of mut.removeEffects) delete e.activeEffects[rid];
            }
          }
          if (mut.addImmunities && mut.addImmunities.length > 0) {
            e.extraImmunities = Array.from(new Set([...(e.extraImmunities ?? []), ...mut.addImmunities]));
          }
          if (mut.removeImmunities && e.extraImmunities) {
            e.extraImmunities = e.extraImmunities.filter((im) => !mut.removeImmunities!.includes(im));
          }
          if (mut.eliteBadge) {
            e.customBadge = {
              label: mut.eliteBadge,
              color: mut.eliteColor ?? '#F59E0B',
              textColor: mut.eliteColor ?? '#FDE68A',
            };
          }
          if (mut.eliteColor) {
            e.customTintColor = mut.eliteColor;
          }
          if (mut.transformToType) {
            mutateEnemyType(s, e, mut.transformToType as EnemyType, nextId);
          }
          if (mut.triggerEffectId) {
            const fx = EFFECTS_CATALOG[mut.triggerEffectId];
            if (fx) {
              applyDeclarativeEffectToEnemy(s, fx, e, undefined, nextId, true, hasEnemyImmunityFn);
            }
          }
          if (mut.floatingText) {
            s.effects.push({
              id: nextId('fx'),
              kind: 'text',
              row: e.row,
              col: e.col,
              timer: 0,
              duration: 1.0,
              text: mut.floatingText,
              color: mut.floatingTextColor ?? '#FBBF24',
            });
          }
        }
        if (targets.length > 0 && mut.sound) {
          playEffectSound(mut.sound);
        }
      }
    }

    if (logic.energyDelta !== undefined && logic.energyDelta !== 0) {
      s.energy = Math.max(0, s.energy + logic.energyDelta);
      if (s.rules?.energyCap !== undefined) {
        s.energy = Math.min(s.rules.energyCap, s.energy);
      }
      const textRow = contextPos?.row ?? Math.floor(s.gridRows / 2);
      const textCol = contextPos?.col ?? Math.floor(s.gridCols / 2);
      s.effects.push({
        id: nextId('fx'),
        kind: 'text',
        row: textRow,
        col: textCol,
        timer: 0,
        duration: 0.9,
        text: `${logic.energyDelta > 0 ? '+' : ''}${logic.energyDelta} EN`,
        color: logic.energyDelta > 0 ? '#FBBF24' : '#F87171',
      });
    }

    if (logic.energyDrops) {
      const count = Math.max(1, logic.energyDrops.count ?? 1);
      const amount = logic.energyDrops.amount ?? GAME_CONFIG.gameplay.energyDropAmount;
      for (let i = 0; i < count; i++) {
        const targetRow =
          logic.energyDrops.row !== undefined
            ? Math.max(0, Math.min(s.gridRows - 1, logic.energyDrops.row))
            : Math.floor(Math.random() * s.gridRows);
        const targetCol =
          logic.energyDrops.col !== undefined
            ? Math.max(0, Math.min(s.gridCols - 1, logic.energyDrops.col))
            : Math.floor(Math.random() * s.gridCols);
        s.energyDrops.push({
          id: nextId('energy'),
          xCol: targetCol + (Math.random() * 0.28 - 0.14),
          yRow: -0.35,
          targetRow,
          amount,
          lifetime: 0,
          maxLifetime: GAME_CONFIG.gameplay.energyDropLifetimeSec,
          collecting: false,
          fromSky: true,
        });
      }
    }

    if (logic.applyEffects) {
      const towersToRemove = new Set<string>();
      for (const entry of logic.applyEffects) {
        const baseFx = entry.effectId ? EFFECTS_CATALOG[entry.effectId] : undefined;
        if (!baseFx && !entry.inlineEffect) continue;
        const fx = buildAdHocEffect(
          entry.effectId ?? nextId('evfx'),
          baseFx,
          entry.inlineEffect
        );
        const dur = entry.durationOverrideSec ?? fx.durationSec;

        let allowedRows: Set<number> | null = null;
        if (entry.rows === 'random') {
          allowedRows = new Set([Math.floor(Math.random() * s.gridRows)]);
        } else if (Array.isArray(entry.rows) && entry.rows.length > 0) {
          allowedRows = new Set(entry.rows);
        } else if (entry.areaShape === 'lane' && contextPos) {
          allowedRows = new Set([contextPos.row]);
        }

        let allowedCols: Set<number> | null = null;
        if (Array.isArray(entry.cols) && entry.cols.length > 0) {
          allowedCols = new Set(entry.cols);
        }

        const side =
          entry.targetSide ??
          (fx.targetSide === 'towers' ? 'towers' : fx.targetSide === 'enemies' ? 'enemies' : 'all');

        const matchesSpatial = (rows: number[], col: number): boolean => {
          if (allowedRows && !rows.some((r) => allowedRows!.has(r))) return false;
          if (allowedCols && !allowedCols.has(Math.round(col))) return false;
          if (entry.areaShape === 'square' && contextPos) {
            const rad = entry.radiusCells ?? fx.radiusCells ?? 1;
            const rowOk = rows.some((r) => Math.abs(r - contextPos.row) <= rad);
            const colOk = Math.abs(col - contextPos.col) <= rad;
            if (!rowOk || !colOk) return false;
          }
          return true;
        };

        if (side === 'towers' || side === 'all') {
          let targets: Tower[] = s.towers.filter((t) => {
            if (t.hp <= 0 || towersToRemove.has(t.id)) return false;
            if (entry.targetCategories && entry.targetCategories.length > 0 && !entry.targetCategories.includes(t.category)) {
              return false;
            }
            if (entry.targetTypes && entry.targetTypes.length > 0 && !entry.targetTypes.includes(t.type)) {
              return false;
            }
            if (entry.excludeTypes && entry.excludeTypes.includes(t.type)) {
              return false;
            }
            return matchesSpatial([t.row], t.col);
          });
          if (entry.areaShape === 'random') {
            targets = targets.sort(() => Math.random() - 0.5);
          }
          if (entry.maxTargets && targets.length > entry.maxTargets) {
            targets = targets.slice(0, entry.maxTargets);
          }
          for (const t of targets) {
            applyDeclarativeEffectToTower(s, fx, t, dur, towersToRemove, nextId, true);
          }
        }

        if (side === 'enemies' || side === 'all') {
          const basePool = entry.enemyFilter
            ? filterAndSortEnemies(s.enemies, entry.enemyFilter)
            : s.enemies;
          let targets: Enemy[] = basePool.filter((e) => {
            if (e.hp <= 0 || e.skyOffsetRows > 0.3) return false;
            if (entry.targetTypes && entry.targetTypes.length > 0 && !entry.targetTypes.includes(e.type)) {
              return false;
            }
            if (entry.excludeTypes && entry.excludeTypes.includes(e.type)) {
              return false;
            }
            return matchesSpatial(e.occupiedRows, e.col);
          });
          if (entry.areaShape === 'random') {
            targets = targets.sort(() => Math.random() - 0.5);
          }
          if (entry.maxTargets && targets.length > entry.maxTargets) {
            targets = targets.slice(0, entry.maxTargets);
          }
          for (const e of targets) {
            applyDeclarativeEffectToEnemy(s, fx, e, dur, nextId, true, hasEnemyImmunityFn);
          }
        }
      }
      if (towersToRemove.size > 0) {
        s.towers = s.towers.filter((t) => !towersToRemove.has(t.id));
      }
    }

    if (logic.clearNegativeTowerStatuses) {
      for (const t of s.towers) {
        t.stunTimer = 0;
        t.deafTimer = 0;
        t.suppressed = false;
        t.hypnotized = false;
        if (t.activeEffects) {
          for (const [eid, st] of Object.entries(t.activeEffects)) {
            if (st.dotDps || st.disableTowerActions || st.hypnotizeTower || (st.vulnerableMultiplier ?? 1) > 1) {
              delete t.activeEffects[eid];
            }
          }
        }
      }
    }

    if (logic.clearNegativeEnemyStatuses) {
      for (const e of s.enemies) {
        e.slowTimer = 0;
        e.slowFactor = 0;
        e.burnTimer = 0;
        e.burnDps = 0;
        e.stunTimer = 0;
        e.silenceTimer = 0;
        if (e.activeEffects) {
          for (const [eid, st] of Object.entries(e.activeEffects)) {
            if (st.dotDps || st.slowFactor || st.silence || (st.vulnerableMultiplier ?? 1) > 1) {
              delete e.activeEffects[eid];
            }
          }
        }
      }
    }

    if (logic.spawnDoors079 && logic.spawnDoors079.count > 0) {
      const { toggleMinSec, toggleVarianceSec, minCol: defaultMinCol } = GAME_CONFIG.gameplay.doors079;
      const minC = Math.max(0, Math.min(s.gridCols - 1, logic.spawnDoors079.minCol ?? defaultMinCol));
      const maxC = Math.max(minC, Math.min(s.gridCols - 1, logic.spawnDoors079.maxCol ?? s.gridCols - 1));
      const occupied = new Set(s.doors079.map((d) => `${d.row},${d.col}`));
      const pool: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < s.gridRows; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (!occupied.has(`${r},${c}`)) pool.push({ row: r, col: c });
        }
      }
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const total = Math.min(logic.spawnDoors079.count, pool.length);
      for (let i = 0; i < total; i++) {
        s.doors079.push({
          id: nextId('door'),
          row: pool[i].row,
          col: pool[i].col,
          isOpen: false,
          toggleTimer: toggleMinSec + Math.random() * toggleVarianceSec,
          remainingLifetime: logic.spawnDoors079.durationSec,
        });
      }
      playEffectSound('door');
    }

    if (logic.clearDoors079) {
      s.doors079 = [];
    }

    if (logic.teslaGateAction) {
      const { action, rows } = logic.teslaGateAction;
      for (const gate of s.gates) {
        if (rows && rows.length > 0 && !rows.includes(gate.row)) continue;
        if (action === 'fire') {
          gate.available = false;
          gate.firingTimer = GAME_CONFIG.gameplay.teslaGate.firingDurationSec;
          gate.sweepCol = 0;
        } else if (action === 'disable') {
          gate.available = false;
        } else if (action === 'enable' || action === 'recharge') {
          gate.available = true;
        }
      }
      if (action === 'fire') {
        playEffectSound('alert');
      }
    }

    if (logic.globalModifiers) {
      const gm = logic.globalModifiers;
      s.activeGlobalModifiers.push({
        remaining: gm.durationSec ?? def.durationSec ?? Infinity,
        enemySpeedMultiplier: gm.enemySpeedMultiplier,
        enemyDamageMultiplier: gm.enemyDamageMultiplier,
        towerFireRateMultiplier: gm.towerFireRateMultiplier,
        towerDamageMultiplier: gm.towerDamageMultiplier,
        energyGenerationMultiplier: gm.energyGenerationMultiplier,
        autoCollectEnergy: gm.autoCollectEnergy,
      });
    }

    if (logic.boardOverride) {
      s.activeBoardOverrides.push({
        remaining: logic.boardOverrideDurationSec ?? def.durationSec ?? Infinity,
        override: logic.boardOverride,
      });
    }

    if (logic.dialogueId || logic.inlineDialogue) {
      s.pendingDialogues.push({
        dialogueId: logic.dialogueId,
        inlineDialogue: logic.inlineDialogue,
      });
    }

    if (logic.chainEventId) {
      s.pendingChainedEvents.push({
        delay: Math.max(0, logic.chainDelaySec ?? 0),
        eventId: logic.chainEventId,
      });
    }

    if (logic.announcement) {
      s.announcement = logic.announcement;
      s.announcementTimer = GAME_CONFIG.gameplay.announcementDurationSec;
    }

    if (logic.bannerText) {
      s.customBanner = {
        text: logic.bannerText,
        style: logic.bannerStyle ?? 'info',
        color: visual?.bannerColor,
        borderColor: visual?.bannerBorderColor,
        remaining: visual?.bannerDurationSec ?? 4.0,
      };
    }
  }

  if (visual) {
    if (visual.screenTintRgb) {
      s.activeScreenTints.push({
        rgb: visual.screenTintRgb,
        alpha: visual.screenTintAlpha ?? 0.2,
        pulseSpeed: visual.screenTintPulseSpeed,
        remaining: visual.screenTintDurationSec ?? def.durationSec ?? 5.0,
      });
    }

    if (visual.flashRgb) {
      s.flashRgb = visual.flashRgb;
      s.flashAlpha = Math.max(s.flashAlpha, visual.flashAlpha ?? 0.5);
      s.flashDecaySpeed = visual.flashDecaySpeed ?? 2.4;
    }

    if (visual.shakeIntensity && visual.shakeIntensity > 0) {
      s.shakeIntensity = Math.max(s.shakeIntensity, visual.shakeIntensity);
      s.shakeTimer = Math.max(s.shakeTimer, visual.shakeDurationSec ?? 0.55);
    }

    if (visual.weather) {
      s.activeWeather =
        visual.weather === 'none'
          ? null
          : {
              kind: visual.weather,
              color: visual.weatherColor,
              density: visual.weatherDensity,
              speed: visual.weatherSpeed,
              remaining: visual.weatherDurationSec ?? def.durationSec ?? 12.0,
            };
    }

    if (visual.laneHighlight) {
      const lh = visual.laneHighlight;
      s.activeLaneHighlights.push({
        rows: lh.rows,
        cols: lh.cols,
        color: lh.color ?? 'rgba(239, 68, 68, 0.18)',
        strokeColor: lh.strokeColor ?? 'rgba(248, 113, 113, 0.85)',
        label: lh.label,
        pulseSpeed: lh.pulseSpeed ?? 5,
        remaining: lh.durationSec ?? 3.5,
      });
    }

    const effRow = visual.waveRow ?? contextPos?.row ?? Math.floor(s.gridRows / 2);
    const effCol = visual.waveCol ?? contextPos?.col ?? Math.floor(s.gridCols / 2);

    if (visual.waveKind) {
      s.effects.push({
        id: nextId('fx'),
        kind: visual.waveKind,
        row: effRow,
        col: effCol,
        timer: 0,
        duration: visual.waveDurationSec ?? 0.6,
        color: visual.waveColorRgb ?? '#F59E0B',
        radiusPx: visual.waveRadiusPx,
      });
    }

    if (visual.particleBurst) {
      const pb = visual.particleBurst;
      spawnParticleBurst(
        s,
        effRow,
        effCol,
        pb.color || '#F59E0B',
        pb.count ?? 12,
        pb.speedPx ?? 90,
        pb.durationSec ?? 0.6,
        pb.sizePx ?? 3.5,
        nextId
      );
    }

    if (visual.floatingText) {
      s.effects.push({
        id: nextId('fx'),
        kind: 'text',
        row: effRow,
        col: effCol,
        timer: 0,
        duration: 1.1,
        text: visual.floatingText,
        color: visual.floatingTextColor ?? '#FBBF24',
      });
    }

    if (visual.bannerText) {
      s.customBanner = {
        text: visual.bannerText,
        style: logic?.bannerStyle ?? 'warning',
        color: visual.bannerColor,
        borderColor: visual.bannerBorderColor,
        remaining: visual.bannerDurationSec ?? 4.0,
      };
    }

    if (visual.sound) {
      playEffectSound(visual.sound);
    }
  }

  return true;
}

export function initLevelScriptEvents(
  s: SimState,
  levelConfig: LevelConfig,
  nextId: (prefix: string) => string,
  spawnEnemyFn: SpawnEnemyFn,
  hasEnemyImmunityFn: HasEnemyImmunityFn,
  callbacks?: EventEngineCallbacks
) {
  const entries = levelConfig.levelEvents ?? [];
  for (const item of entries) {
    let def: LevelEventDefinition | null = null;
    if (typeof item === 'string') {
      def = resolveEventDefinition(item);
    } else {
      def = resolveEventDefinition(item.eventId, item);
    }
    if (!def) continue;

    const trig = def.trigger ?? 'periodic';
    const state: ActiveScriptEventState = {
      def,
      timer: def.initialDelaySec ?? def.intervalSec ?? 8,
      cooldown: 0,
      triggersCount: 0,
      wasConditionTrue: false,
      lastNumericValue: 0,
    };

    if (trig === 'on_start') {
      const fired = executeLevelEvent(
        s,
        def,
        nextId,
        spawnEnemyFn,
        hasEnemyImmunityFn,
        undefined,
        callbacks
      );
      if (fired) {
        state.triggersCount += 1;
        state.cooldown = def.cooldownSec ?? 0;
      }
    }
    s.activeScriptEvents.push(state);
  }
}

export function stepLevelEvents(
  s: SimState,
  dt: number,
  hadFlagHorde: boolean,
  levelConfig: LevelConfig,
  nextId: (prefix: string) => string,
  spawnEnemyFn: SpawnEnemyFn,
  hasEnemyImmunityFn: HasEnemyImmunityFn,
  callbacks?: EventEngineCallbacks
) {
  // 1. Staggered wave spawns
  if (s.pendingStaggeredSpawns.length > 0) {
    const remaining: PendingStaggeredSpawn[] = [];
    for (const sp of s.pendingStaggeredSpawns) {
      sp.delay -= dt;
      if (sp.delay <= 0) {
        spawnEnemyFn(s, sp.type, sp.target, sp.col, sp.packId, sp.waveOpts);
      } else {
        remaining.push(sp);
      }
    }
    s.pendingStaggeredSpawns = remaining;
  }

  // 2. Chained events
  if (s.pendingChainedEvents.length > 0) {
    const remaining: PendingChainedEvent[] = [];
    for (const ch of s.pendingChainedEvents) {
      ch.delay -= dt;
      if (ch.delay <= 0) {
        const resolved = resolveEventDefinition(ch.eventId, ch.overrides);
        if (resolved) {
          executeLevelEvent(s, resolved, nextId, spawnEnemyFn, hasEnemyImmunityFn, undefined, callbacks);
        }
      } else {
        remaining.push(ch);
      }
    }
    s.pendingChainedEvents = remaining;
  }

  // 3. Decay timed tile modifiers & event visuals
  if (s.tileModifiers.length > 0) {
    s.tileModifiers = s.tileModifiers.filter((tm) => {
      if (tm.remaining === undefined || !Number.isFinite(tm.remaining)) return true;
      tm.remaining -= dt;
      return tm.remaining > 0;
    });
  }

  s.activeGlobalModifiers = s.activeGlobalModifiers.filter((m) => {
    if (!Number.isFinite(m.remaining)) return true;
    m.remaining -= dt;
    return m.remaining > 0;
  });

  s.activeBoardOverrides = s.activeBoardOverrides.filter((b) => {
    if (!Number.isFinite(b.remaining)) return true;
    b.remaining -= dt;
    return b.remaining > 0;
  });

  if (s.activeBoardOverrides.length > 0) {
    let merged: Partial<BoardDesignConfig> = { ...(levelConfig.boardOverride ?? {}) };
    for (const b of s.activeBoardOverrides) {
      merged = { ...merged, ...b.override };
    }
    s.boardOverride = merged;
  } else {
    s.boardOverride = levelConfig.boardOverride;
  }

  s.activeScreenTints = s.activeScreenTints.filter((t) => {
    if (!Number.isFinite(t.remaining)) return true;
    t.remaining -= dt;
    return t.remaining > 0;
  });

  if (s.activeWeather && Number.isFinite(s.activeWeather.remaining)) {
    s.activeWeather.remaining -= dt;
    if (s.activeWeather.remaining <= 0) {
      s.activeWeather = null;
    }
  }

  s.activeLaneHighlights = s.activeLaneHighlights.filter((h) => {
    h.remaining -= dt;
    return h.remaining > 0;
  });

  if (s.customBanner) {
    s.customBanner.remaining -= dt;
    if (s.customBanner.remaining <= 0) {
      s.customBanner = null;
    }
  }

  if (s.shakeTimer > 0) {
    s.shakeTimer = Math.max(0, s.shakeTimer - dt);
    if (s.shakeTimer === 0) s.shakeIntensity = 0;
  }

  if (s.flashAlpha > 0) {
    s.flashAlpha = Math.max(0, s.flashAlpha - dt * (s.flashDecaySpeed || 2.4));
  }

  // 4. Evaluate scripted level events
  for (const st of s.activeScriptEvents) {
    const def = st.def;
    if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dt);
    if (def.maxTriggers !== undefined && st.triggersCount >= def.maxTriggers) continue;

    const trig = def.trigger ?? 'periodic';
    let shouldFire = false;

    if (trig === 'periodic') {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = def.intervalSec ?? 10;
        if (st.cooldown <= 0) shouldFire = true;
      }
    } else if (trig === 'at_time') {
      if (st.triggersCount === 0 && s.levelTimer >= (def.time ?? 0)) {
        shouldFire = true;
      }
    } else if (trig === 'on_flag_horde') {
      if (hadFlagHorde && st.cooldown <= 0) {
        shouldFire = true;
      }
    } else if (trig === 'on_progress') {
      const ratio = s.levelTimer / Math.max(1, levelConfig.durationSeconds);
      if (st.triggersCount === 0 && ratio >= (def.progressRatio ?? 0.5)) {
        shouldFire = true;
      }
    } else if (trig === 'on_obstacle_destroyed') {
      if (def.threshold !== undefined) {
        const cond = s.obstacleDestroyedCount >= def.threshold;
        if (cond && !st.wasConditionTrue && st.cooldown <= 0) shouldFire = true;
        st.wasConditionTrue = cond;
      } else if (s.obstacleDestroyedCount > (st.lastNumericValue ?? 0)) {
        st.lastNumericValue = s.obstacleDestroyedCount;
        if (st.cooldown <= 0) shouldFire = true;
      }
    } else if (trig === 'on_dialogue_end') {
      if (s.recentlyCompletedDialogues.length > 0 && st.cooldown <= 0) {
        if (!def.targetDialogueId || s.recentlyCompletedDialogues.includes(def.targetDialogueId)) {
          shouldFire = true;
        }
      }
    } else if (trig === 'on_enemy_type_spawn') {
      if (s.recentlySpawnedEnemyTypes.length > 0 && st.cooldown <= 0) {
        if (!def.targetEnemyType || s.recentlySpawnedEnemyTypes.includes(def.targetEnemyType as EnemyType)) {
          shouldFire = true;
        }
      }
    } else if (trig === 'on_wave_index') {
      const targetWave = def.waveIndex ?? def.threshold ?? 1;
      if (s.recentlyTriggeredWaveIndices.includes(targetWave) && st.cooldown <= 0) {
        shouldFire = true;
      }
    } else if (trig === 'on_enemy_low_hp') {
      const ratio = def.hpThresholdRatio ?? 0.4;
      const cond = s.enemies.some((e) => {
        if (e.hp <= 0) return false;
        if (def.targetEnemyType && e.type !== def.targetEnemyType) return false;
        return e.hp / Math.max(1, e.maxHp) <= ratio;
      });
      if (cond && !st.wasConditionTrue && st.cooldown <= 0) {
        shouldFire = true;
      }
      st.wasConditionTrue = cond;
    } else if (
      trig === 'on_enemy_count_above' ||
      trig === 'on_enemy_count_below' ||
      trig === 'on_tower_count_above' ||
      trig === 'on_tower_count_below' ||
      trig === 'on_energy_above' ||
      trig === 'on_energy_below' ||
      trig === 'on_kill_count'
    ) {
      const th = def.threshold ?? 1;
      let cond = false;
      if (trig === 'on_enemy_count_above') cond = s.enemies.length >= th;
      else if (trig === 'on_enemy_count_below') cond = s.enemies.length <= th && s.levelTimer > 2;
      else if (trig === 'on_tower_count_above') cond = s.towers.length >= th;
      else if (trig === 'on_tower_count_below') cond = s.towers.length <= th && s.levelTimer > 2;
      else if (trig === 'on_energy_above') cond = s.energy >= th;
      else if (trig === 'on_energy_below') cond = s.energy <= th;
      else if (trig === 'on_kill_count') cond = s.kills >= th;

      if (cond && !st.wasConditionTrue && st.cooldown <= 0) {
        shouldFire = true;
      }
      st.wasConditionTrue = cond;
    }

    if (shouldFire) {
      const fired = executeLevelEvent(
        s,
        def,
        nextId,
        spawnEnemyFn,
        hasEnemyImmunityFn,
        undefined,
        callbacks
      );
      if (fired) {
        st.triggersCount += 1;
        st.cooldown = def.cooldownSec ?? 0;
      }
    }
  }

  // Clear single-tick event queues
  s.recentlyCompletedDialogues = [];
  s.recentlySpawnedEnemyTypes = [];
  s.recentlyTriggeredWaveIndices = [];
}
