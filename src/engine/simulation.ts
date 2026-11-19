import {
  DESIGN_CATALOG,
  EFFECTS_CATALOG,
  ENEMY_CATALOG,
  GAME_CONFIG,
  PARTICLES_CATALOG,
  TOWER_CATALOG,
} from '../data/scpCatalog';
import {
  BlockedCellConfig,
  BoardDesignConfig,
  BoardObstacle,
  BoardObstacleConfig,
  DamageTypeKind,
  DialogueDefinition,
  Door079,
  EffectSoundKey,
  EmergencyGate,
  Enemy,
  EnemyDefinition,
  EnemyImmunity,
  EnemyType,
  EnergyDrop,
  LevelConfig,
  LevelEnvironmentConfig,
  LevelEvent,
  LevelRulesConfig,
  LevelSkyEnergyConfig,
  LevelVictoryCondition,
  ObjectiveProgressState,
  PocketRescue,
  Projectile,
  ResolvedSpawnTarget,
  TileModifierConfig,
  TileOverrideConfig,
  Tower,
  TowerDefinition,
  TowerType,
  VisualEffect,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import {
  applyDeclarativeEffectToEnemy,
  applyDeclarativeEffectToTower,
  DeclarativeSpawnRequest,
  enemyHasDeclarativeImmunity,
  initEntityEffectTimers,
  playEffectSound,
  stepDeclarativeEffects,
  triggerDeclarativeHooks,
  triggerProjectileDeclarativeHits,
} from './effectRunner';
import {
  ActiveBoardOverride,
  ActiveGlobalModifier,
  ActiveLaneHighlight,
  ActiveScreenTint,
  ActiveScriptEventState,
  ActiveWeatherState,
  CustomBannerState,
  EventEngineCallbacks,
  executeLevelEvent,
  initLevelScriptEvents,
  PendingChainedEvent,
  PendingStaggeredSpawn,
  resolveEventDefinition,
  stepLevelEvents,
} from './eventRunner';
import { resolveMatchTimeline, resolveSpawnTargetsForSpec } from './levelParser';
import {
  arePrimaryObjectivesCompleted,
  finalizeObjectivesOnOutcome,
  initLevelObjectives,
  stepObjectives,
} from './objectiveRunner';
import { ParticleEmitOptions, ParticleSystem } from './particleSystem';

export interface QueuedDialogueEntry {
  dialogueId?: string;
  inlineDialogue?: DialogueDefinition;
}

export interface SimState {
  levelConfig: LevelConfig;
  gridRows: number;
  gridCols: number;
  boardOverride?: Partial<BoardDesignConfig>;
  environment?: LevelEnvironmentConfig;
  rules?: LevelRulesConfig;
  blockedCells: BlockedCellConfig[];
  tileModifiers: TileModifierConfig[];
  tileOverrides: TileOverrideConfig[];
  obstacles: BoardObstacle[];
  victoryCondition?: LevelVictoryCondition;
  globalEffects: string[];
  disableTeslaGates?: boolean;
  autoCollectEnergy?: boolean;
  skyEnergy?: LevelSkyEnergyConfig;
  energy: number;
  levelTimer: number;
  timeline: LevelEvent[];
  spawnedIndices: Set<number>;
  spawned079: boolean;
  doorsSpawned079: boolean;
  skyEnergyTimer: number;
  blinkTimer: number;
  blinkAlpha: number;
  shakeIntensity: number;
  shakeTimer: number;
  flashRgb: string;
  flashAlpha: number;
  flashDecaySpeed: number;
  towers: Tower[];
  enemies: Enemy[];
  doors079: Door079[];
  pocketRescues: PocketRescue[];
  projectiles: Projectile[];
  energyDrops: EnergyDrop[];
  effects: VisualEffect[];
  particleSystem: ParticleSystem;
  gates: EmergencyGate[];
  cooldowns: Record<string, number>;
  kills: number;
  towersDeployed: number;
  obstacleDestroyedCount: number;
  elapsedTime: number;
  announcement: string;
  announcementTimer: number;
  flagBanner: string;
  flagBannerTimer: number;
  activeScriptEvents: ActiveScriptEventState[];
  pendingStaggeredSpawns: PendingStaggeredSpawn[];
  pendingChainedEvents: PendingChainedEvent[];
  activeGlobalModifiers: ActiveGlobalModifier[];
  activeBoardOverrides: ActiveBoardOverride[];
  activeScreenTints: ActiveScreenTint[];
  activeWeather: ActiveWeatherState | null;
  activeLaneHighlights: ActiveLaneHighlight[];
  customBanner: CustomBannerState | null;
  pendingDialogues: QueuedDialogueEntry[];
  completedDialogueIds: string[];
  recentlyCompletedDialogues: string[];
  recentlySpawnedEnemyTypes: EnemyType[];
  recentlyTriggeredWaveIndices: number[];
  objectives: ObjectiveProgressState[];
  killsByEnemyType: Record<string, number>;
  teslaGatesUsedCount: number;
  towersLostCount: number;
  obstaclesLostCount: number;
  obstaclesLostByKind: Record<string, number>;
  obstaclesDestroyedByKind: Record<string, number>;
  deployedTowerTypesUsed: Set<string>;
  energySpentTotal: number;
  triggeredEventIds: Set<string>;
  endlessCycle?: number;
  defeatReason?: string;
}

export type SimOutcome = 'PLAYING' | 'VICTORY' | 'GAME_OVER';

let uidCounter = 1;
export const nextSimId = (prefix: string) => `${prefix}_${uidCounter++}`;

const enemyDefCache = new Map<EnemyType, EnemyDefinition>();
function getEnemyDef(type: EnemyType): EnemyDefinition | undefined {
  let cached = enemyDefCache.get(type);
  if (!cached) {
    cached = ENEMY_CATALOG.find((e) => e.type === type);
    if (cached) enemyDefCache.set(type, cached);
  }
  return cached;
}

const towerDefCache = new Map<TowerType, TowerDefinition>();
function getTowerDef(type: TowerType): TowerDefinition | undefined {
  let cached = towerDefCache.get(type);
  if (!cached) {
    cached = TOWER_CATALOG.find((t) => t.type === type);
    if (cached) towerDefCache.set(type, cached);
  }
  return cached;
}

export function emitSimParticles(
  s: SimState,
  presetId: string | undefined,
  row: number,
  col: number,
  opts?: ParticleEmitOptions
) {
  if (!presetId || !s.particleSystem) return;
  const meta = s.particleSystem.emitPreset(presetId, row, col, {
    cellSize: GAME_CONFIG.boardLayout.cellSize,
    ...opts,
  });
  if (!meta) return;
  if (meta.screenShake && meta.screenShake > 0) {
    s.shakeIntensity = Math.max(s.shakeIntensity, meta.screenShake);
    s.shakeTimer = Math.max(s.shakeTimer, 0.35);
  }
  if (meta.screenFlashRgb) {
    s.flashRgb = meta.screenFlashRgb;
    s.flashAlpha = Math.max(s.flashAlpha, meta.screenFlashAlpha ?? 0.25);
    s.flashDecaySpeed = 2.6;
  }
  if (meta.sound) {
    playEffectSound(meta.sound as EffectSoundKey);
  }
}

export function getEffectiveTowerCost(
  type: TowerType,
  rules?: LevelRulesConfig,
  sim?: SimState
): number {
  const def = getTowerDef(type);
  if (!def) return 0;
  const deployedCount =
    sim && def.costScalePerDeployed
      ? sim.towers.filter((t) => t.type === type).length
      : 0;
  const raw = def.cost * (rules?.towerCostMultiplier ?? 1) + deployedCount * (def.costScalePerDeployed ?? 0);
  return Math.max(0, Math.round(raw));
}

export function getEffectiveTowerCooldown(type: TowerType, rules?: LevelRulesConfig): number {
  const def = getTowerDef(type);
  if (!def) return 0;
  return Math.max(0.1, def.cooldown * (rules?.towerCooldownMultiplier ?? 1));
}

export function hasEnemyImmunity(
  type: EnemyType,
  immunity: EnemyImmunity,
  enemy?: Enemy
): boolean {
  const immunities = getEnemyDef(type)?.behavior?.immunities;
  if (immunities && (immunities.includes('all_effects') || immunities.includes(immunity))) {
    return true;
  }
  return enemyHasDeclarativeImmunity(enemy, type, immunity);
}

export function enemyOccupiesRow(enemy: Enemy, row: number): boolean {
  return enemy.occupiedRows.includes(row);
}

function getTileModifiersAt(s: SimState, row: number, col: number): TileModifierConfig[] {
  if (s.tileModifiers.length === 0) return [];
  const roundedCol = Math.round(col);
  return s.tileModifiers.filter((m) => {
    const rowOk =
      (m.row === undefined || m.row === row) &&
      (!m.rows || m.rows.includes(row));
    const colOk =
      (m.col === undefined || m.col === roundedCol) &&
      (!m.cols || m.cols.includes(roundedCol));
    return rowOk && colOk;
  });
}

function isCellBlocked(s: SimState, row: number, col: number): boolean {
  return s.blockedCells.some((b) => b.row === row && b.col === col);
}

export function createBoardObstacleFromConfig(
  cfg: BoardObstacleConfig,
  gridRows: number,
  gridCols: number
): BoardObstacle {
  const row = Math.max(0, Math.min(gridRows - 1, Math.round(cfg.row)));
  const col = Math.max(0, Math.min(gridCols - 1, Math.round(cfg.col)));
  const kind = cfg.kind ?? 'tombstone';
  const destructible = cfg.destructible ?? (cfg.hp === undefined ? true : cfg.hp > 0);
  const maxHp = Math.max(1, cfg.hp ?? (kind === 'tombstone' ? 320 : 450));
  return {
    id: cfg.id ?? nextSimId('obs'),
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
    counterTowerTypes:
      cfg.counterTowerTypes ?? (kind === 'tombstone' ? ['engineer', 'grenadier'] : undefined),
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

export function spawnBoardObstacleInSim(
  s: SimState,
  cfg: BoardObstacleConfig
): BoardObstacle | null {
  const ob = createBoardObstacleFromConfig(cfg, s.gridRows, s.gridCols);
  if (s.obstacles.some((o) => o.row === ob.row && o.col === ob.col)) {
    return null;
  }
  s.obstacles.push(ob);
  return ob;
}

export function destroyBoardObstacleInSim(
  s: SimState,
  ob: BoardObstacle,
  triggerDestroyEffects = true,
  destroyedByEnemy = false
) {
  const idx = s.obstacles.findIndex((o) => o.id === ob.id);
  if (idx === -1) return;
  s.obstacles.splice(idx, 1);
  s.obstacleDestroyedCount += 1;
  s.obstaclesDestroyedByKind[ob.kind] = (s.obstaclesDestroyedByKind[ob.kind] ?? 0) + 1;
  if (destroyedByEnemy) {
    s.obstaclesLostCount += 1;
    s.obstaclesLostByKind[ob.kind] = (s.obstaclesLostByKind[ob.kind] ?? 0) + 1;
  }

  emitSimParticles(s, 'obstacle_break', ob.row, ob.col);

  if (!triggerDestroyEffects) return;

  if (ob.rewardEnergy > 0) {
    s.energy += ob.rewardEnergy;
    if (s.rules?.energyCap !== undefined) {
      s.energy = Math.min(s.rules.energyCap, s.energy);
    }
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'text',
      row: ob.row,
      col: ob.col,
      timer: 0,
      duration: 0.9,
      text: `+${ob.rewardEnergy} EN`,
      color: '#FBBF24',
    });
    soundEngine.playCollect();
  }

  if (ob.spawnOnDestroy?.type) {
    const sp = ob.spawnOnDestroy;
    const count = Math.max(1, sp.count ?? 1);
    for (let i = 0; i < count; i++) {
      spawnEnemyAt(
        s,
        sp.type as EnemyType,
        { row: ob.row, occupiedRows: [ob.row] },
        Math.max(0.2, ob.col - i * 0.15),
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

  if (ob.triggerEventOnDestroy) {
    const resolved = resolveEventDefinition(ob.triggerEventOnDestroy);
    if (resolved) {
      executeLevelEvent(
        s,
        resolved,
        nextSimId,
        spawnEnemyAt,
        hasEnemyImmunity,
        { row: ob.row, col: ob.col },
        EVENT_ENGINE_CALLBACKS
      );
    }
  }
}

const EVENT_ENGINE_CALLBACKS: EventEngineCallbacks = {
  spawnObstacle: spawnBoardObstacleInSim,
  destroyObstacle: destroyBoardObstacleInSim,
};

export function notifyDialogueCompletedInSim(
  s: SimState,
  dialogueId?: string,
  triggerEventId?: string,
  energyDelta?: number
) {
  if (dialogueId) {
    if (!s.completedDialogueIds.includes(dialogueId)) {
      s.completedDialogueIds.push(dialogueId);
    }
    s.recentlyCompletedDialogues.push(dialogueId);
  }
  if (energyDelta !== undefined && energyDelta !== 0) {
    s.energy = Math.max(0, s.energy + energyDelta);
    if (s.rules?.energyCap !== undefined) {
      s.energy = Math.min(s.rules.energyCap, s.energy);
    }
  }
  if (triggerEventId) {
    const resolved = resolveEventDefinition(triggerEventId);
    if (resolved) {
      executeLevelEvent(
        s,
        resolved,
        nextSimId,
        spawnEnemyAt,
        hasEnemyImmunity,
        undefined,
        EVENT_ENGINE_CALLBACKS
      );
    }
  }
}

export function createInitialSim(levelConfig: LevelConfig): SimState {
  const cooldowns: Record<string, number> = {};
  for (const t of TOWER_CATALOG) {
    cooldowns[t.type] = 0;
  }

  const gridRows = levelConfig.gridRows ?? GAME_CONFIG.grid.rows;
  const gridCols = levelConfig.gridCols ?? GAME_CONFIG.grid.cols;
  const initialWeather =
    levelConfig.environment?.weather && levelConfig.environment.weather !== 'none'
      ? {
          kind: levelConfig.environment.weather,
          color: levelConfig.environment.weatherColor,
          density: levelConfig.environment.weatherDensity,
          speed: levelConfig.environment.weatherSpeed,
          remaining: Infinity,
        }
      : null;

  const initialModifiers = (levelConfig.tileModifiers ?? []).map((tm) => ({
    ...tm,
    id: tm.id ?? nextSimId('tmod'),
    remaining: tm.durationSec ?? Infinity,
  }));

  const initialObstacles = (levelConfig.obstacles ?? []).map((ob) =>
    createBoardObstacleFromConfig(ob, gridRows, gridCols)
  );

  const s: SimState = {
    levelConfig,
    gridRows,
    gridCols,
    boardOverride: levelConfig.boardOverride,
    environment: levelConfig.environment,
    rules: levelConfig.rules,
    blockedCells: [...(levelConfig.blockedCells ?? [])],
    tileModifiers: initialModifiers,
    tileOverrides: [...(levelConfig.tileOverrides ?? [])],
    obstacles: initialObstacles,
    victoryCondition: levelConfig.victoryCondition,
    globalEffects: levelConfig.globalEffects ?? [],
    disableTeslaGates: levelConfig.disableTeslaGates,
    autoCollectEnergy: levelConfig.autoCollectEnergy,
    skyEnergy: levelConfig.skyEnergy,
    energy: levelConfig.startingEnergy,
    levelTimer: 0,
    timeline: resolveMatchTimeline(levelConfig, gridRows),
    spawnedIndices: new Set<number>(),
    spawned079: false,
    doorsSpawned079: false,
    skyEnergyTimer:
      levelConfig.skyEnergy?.initialDelaySec ?? GAME_CONFIG.gameplay.initialSkyEnergyDelaySec,
    blinkTimer: 0,
    blinkAlpha: 0,
    shakeIntensity: 0,
    shakeTimer: 0,
    flashRgb: '255, 255, 255',
    flashAlpha: 0,
    flashDecaySpeed: 2.4,
    towers: [],
    enemies: [],
    doors079: [],
    pocketRescues: [],
    projectiles: [],
    energyDrops: [],
    effects: [],
    particleSystem: new ParticleSystem(450),
    gates: Array.from({ length: gridRows }, (_, row) => ({
      row,
      available: !levelConfig.disableTeslaGates,
      firingTimer: 0,
      sweepCol: 0,
    })),
    cooldowns,
    kills: 0,
    towersDeployed: 0,
    obstacleDestroyedCount: 0,
    elapsedTime: 0,
    announcement: `Nivel ${levelConfig.level}: ${levelConfig.title}.`,
    announcementTimer: GAME_CONFIG.gameplay.announcementDurationSec,
    flagBanner: '',
    flagBannerTimer: 0,
    activeScriptEvents: [],
    pendingStaggeredSpawns: [],
    pendingChainedEvents: [],
    activeGlobalModifiers: [],
    activeBoardOverrides: [],
    activeScreenTints: [],
    activeWeather: initialWeather,
    activeLaneHighlights: [],
    customBanner: null,
    pendingDialogues: [],
    completedDialogueIds: [],
    recentlyCompletedDialogues: [],
    recentlySpawnedEnemyTypes: [],
    recentlyTriggeredWaveIndices: [],
    objectives: initLevelObjectives(levelConfig),
    killsByEnemyType: {},
    teslaGatesUsedCount: 0,
    towersLostCount: 0,
    obstaclesLostCount: 0,
    obstaclesLostByKind: {},
    obstaclesDestroyedByKind: {},
    deployedTowerTypesUsed: new Set<string>(),
    energySpentTotal: 0,
    triggeredEventIds: new Set<string>(),
    endlessCycle: 0,
    defeatReason: undefined,
  };

  // Starting Doors 079
  const { toggleMinSec, toggleVarianceSec } = GAME_CONFIG.gameplay.doors079;
  for (const sd of levelConfig.startingDoors079 ?? []) {
    if (sd.row >= 0 && sd.row < gridRows && sd.col >= 0 && sd.col < gridCols) {
      s.doors079.push({
        id: nextSimId('door'),
        row: sd.row,
        col: sd.col,
        isOpen: sd.isOpen ?? false,
        toggleTimer: sd.toggleIntervalSec ?? toggleMinSec + Math.random() * toggleVarianceSec,
        toggleIntervalSec: sd.toggleIntervalSec,
      });
    }
  }

  // Starting Towers
  const towerHpMult = levelConfig.rules?.towerHpMultiplier ?? 1;
  for (const st of levelConfig.startingTowers ?? []) {
    const def = getTowerDef(st.type as TowerType);
    if (!def) continue;
    const row = Math.max(0, Math.min(gridRows - 1, st.row));
    const col = Math.max(0, Math.min(gridCols - 1, st.col));
    if (s.towers.some((t) => t.row === row && t.col === col) || isCellBlocked(s, row, col)) continue;
    const maxHp = Math.max(1, Math.round((st.hp ?? def.maxHp) * towerHpMult));
    const towerEffects = [
      ...(def.effects ?? []),
      ...(def.onDeployEffects ?? []),
      ...s.globalEffects.filter((id) => {
        const fx = EFFECTS_CATALOG[id];
        return fx && (fx.targetSide === 'towers' || fx.targetSide === 'allies');
      }),
    ];
    const startShield = st.shieldHp ?? def.shieldOnDeploy;
    const tower: Tower = {
      id: nextSimId('twr'),
      type: def.type,
      category: def.category,
      row,
      col,
      hp: maxHp,
      maxHp,
      shieldHp: startShield && startShield > 0 ? startShield : undefined,
      shieldColor: def.shieldColor,
      actionTimer: def.energyAmount ? 3.5 : 0.7,
      armProgress: def.armTime ? 1 : 0,
      isArmed: Boolean(def.armTime),
      suppressed: false,
      hypnotized: false,
      radioProtected: false,
      stunTimer: 0,
      deafTimer: 0,
      immuneToPsych: Boolean(st.immuneToPsych || def.immuneToPsych),
      recoil: 0,
      hitFlash: 0,
    };
    initEntityEffectTimers(tower, towerEffects);
    s.towers.push(tower);
  }

  // Starting Enemies
  for (const se of levelConfig.startingEnemies ?? []) {
    const targets = resolveSpawnTargetsForSpec(se.type as EnemyType, se.row, undefined, 1, gridRows);
    const col = se.col ?? gridCols - 1;
    if (targets[0]) {
      spawnEnemyAt(s, se.type as EnemyType, targets[0], col, undefined, {
        hpMultiplier: se.hpMultiplier,
        speedMultiplier: se.speedMultiplier,
        dpsMultiplier: se.dpsMultiplier,
        extraEffects: se.extraEffects,
        immunities: se.immunities,
      });
    }
  }

  // Scripted Level Events & events.json
  initLevelScriptEvents(
    s,
    levelConfig,
    nextSimId,
    spawnEnemyAt,
    hasEnemyImmunity,
    EVENT_ENGINE_CALLBACKS
  );

  return s;
}

function findNearestEmptyCell(
  towers: Tower[],
  blockedCells: BlockedCellConfig[],
  prefRow: number,
  prefCol: number,
  gridRows: number,
  gridCols: number
): { row: number; col: number } | null {
  const occupied = new Set([
    ...towers.map((t) => `${t.row},${t.col}`),
    ...blockedCells.map((b) => `${b.row},${b.col}`),
  ]);
  const candidates: Array<{ row: number; col: number; dist: number }> = [];
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (!occupied.has(`${r},${c}`)) {
        candidates.push({
          row: r,
          col: c,
          dist: Math.abs(r - prefRow) + Math.abs(c - prefCol),
        });
      }
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0] ? { row: candidates[0].row, col: candidates[0].col } : null;
}

function spawnDoors079(
  existingDoors: Door079[],
  count: number,
  gridRows: number,
  gridCols: number
): Door079[] {
  const { minCol, toggleMinSec, toggleVarianceSec } = GAME_CONFIG.gameplay.doors079;
  const defaultCols = GAME_CONFIG.grid.cols;
  const effectiveMinCol =
    gridCols === defaultCols
      ? minCol
      : Math.min(
          Math.max(1, gridCols - 2),
          Math.max(1, Math.round((minCol / defaultCols) * gridCols))
        );

  const occupied = new Set(existingDoors.map((d) => `${d.row},${d.col}`));
  const pool: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < gridRows; r++) {
    for (let c = effectiveMinCol; c < gridCols; c++) {
      if (!occupied.has(`${r},${c}`)) {
        pool.push({ row: r, col: c });
      }
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const created: Door079[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    created.push({
      id: nextSimId('door'),
      row: pool[i].row,
      col: pool[i].col,
      isOpen: Math.random() > 0.5,
      toggleTimer: toggleMinSec + Math.random() * toggleVarianceSec,
    });
  }
  return created;
}

export interface WaveSpawnOverrides {
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  immunities?: EnemyImmunity[];
  eliteBadge?: string;
  eliteColor?: string;
  announcement?: string;
}

export function spawnEnemyAt(
  s: SimState,
  type: EnemyType,
  target: ResolvedSpawnTarget,
  col: number,
  packId?: string,
  waveOpts?: WaveSpawnOverrides
) {
  const def = getEnemyDef(type);
  if (!def) return;

  const spawnRule = def.behavior?.spawnRule;
  if (spawnRule?.maxPerLevel === 1 && type === 'scp_079') {
    if (s.spawned079) return;
    s.spawned079 = true;
  }

  const blinkCfg = EFFECTS_CATALOG.blink_173;
  const lureCfg = EFFECTS_CATALOG.lure_012;
  const vaseCfg = EFFECTS_CATALOG.vase_019;
  const defaultCols = GAME_CONFIG.grid.cols;

  let spawnCol = col;
  let skyOffsetRows = 0;
  if (spawnRule?.colRange && col >= s.gridCols - 0.85) {
    const [rawMinC, rawMaxC] = spawnRule.colRange;
    const minC =
      s.gridCols === defaultCols
        ? rawMinC
        : Math.max(0.5, (rawMinC / defaultCols) * s.gridCols);
    const maxC =
      s.gridCols === defaultCols
        ? rawMaxC
        : Math.min(s.gridCols - 0.35, Math.max(minC + 0.15, (rawMaxC / defaultCols) * s.gridCols));
    spawnCol = minC + Math.random() * Math.max(0.1, maxC - minC);
  }
  if (spawnRule?.mode === 'sky') {
    skyOffsetRows = 3.8;
  }

  const clampedRows = target.occupiedRows
    .map((r) => Math.max(0, Math.min(s.gridRows - 1, r)))
    .sort((a, b) => a - b);

  const ruleHpMult = s.rules?.enemyHpMultiplier ?? 1;
  const ruleSpeedMult = s.rules?.enemySpeedMultiplier ?? 1;
  const ruleDpsMult = s.rules?.enemyDpsMultiplier ?? 1;

  const scaledHp = Math.max(1, Math.round(def.hp * ruleHpMult * (waveOpts?.hpMultiplier ?? 1)));
  const scaledSpeed = def.speed * ruleSpeedMult * (waveOpts?.speedMultiplier ?? 1);
  const scaledDps = def.dps * ruleDpsMult * (waveOpts?.dpsMultiplier ?? 1);
  const globalEnemyEffects = s.globalEffects.filter((id) => {
    const fx = EFFECTS_CATALOG[id];
    return fx && (fx.targetSide === 'enemies' || fx.targetSide === 'allies');
  });
  const mergedExtra = [
    ...(waveOpts?.extraEffects ?? []),
    ...globalEnemyEffects,
  ];
  const combinedEffects = [...(def.effects ?? []), ...mergedExtra];

  const behavior = def.behavior;
  const resolvedBadge = waveOpts?.eliteBadge ?? behavior?.eliteBadge;
  const resolvedColor = waveOpts?.eliteColor ?? behavior?.eliteColor;

  const newEnemy: Enemy = {
    id: nextSimId('scp'),
    type,
    row: clampedRows[0] ?? 0,
    occupiedRows: clampedRows.length > 0 ? clampedRows : [0],
    col: spawnCol,
    hp: scaledHp,
    maxHp: scaledHp,
    shieldHp: behavior?.initialShieldHp,
    shieldColor: behavior?.shieldColor,
    baseSpeed: scaledSpeed,
    currentSpeed: scaledSpeed,
    dps: scaledDps,
    slowTimer: 0,
    slowFactor: 0,
    burnTimer: 0,
    burnDps: 0,
    stunTimer: 0,
    silenceTimer: 0,
    hitFlash: 0,
    animPhase: Math.random() * 6,
    blinkMoveTimer: behavior?.blinkJump?.intervalSec ?? blinkCfg?.moveIntervalSec ?? 4.0,
    laneHopTimer: behavior?.laneHopIntervalSec,
    rangedAttackTimer: behavior?.rangedAttack
      ? behavior.rangedAttack.intervalSec * 0.65
      : undefined,
    summonPeriodicTimer: behavior?.summonPeriodic
      ? behavior.summonPeriodic.initialDelaySec ?? behavior.summonPeriodic.intervalSec
      : undefined,
    trailParticleTimer: def.particles?.trailIntervalSec ?? 0.25,
    hasRevived: false,
    isAttacking: false,
    packId,
    skyOffsetRows,
    pullTimer: lureCfg?.pullIntervalSec ?? 5.0,
    phase096: 'calm',
    convulseTimer: 0,
    vaseSpawnTimer: vaseCfg?.spawnIntervalSec ?? 3.0,
    screamTimer066: 5.5,
    phase079Triggered: false,
    extraEffects: mergedExtra.length > 0 ? mergedExtra : undefined,
    extraImmunities: waveOpts?.immunities,
    customDamageReduction: behavior?.damageReduction,
    customLifesteal: behavior?.lifestealRatio,
    customThornsDps: behavior?.thornsDps,
    extraLivesLeft: behavior?.reviveCount,
    extraReviveHpPercent: behavior?.reviveHpPercent ?? 1.0,
    customBadge: resolvedBadge
      ? {
          label: resolvedBadge,
          color: resolvedColor ?? '#F59E0B',
          textColor: resolvedColor ?? '#FDE68A',
        }
      : undefined,
    customTintColor: resolvedColor,
  };
  initEntityEffectTimers(newEnemy, combinedEffects);
  s.enemies.push(newEnemy);
  s.recentlySpawnedEnemyTypes.push(type);

  emitSimParticles(
    s,
    def.particles?.onSpawn ?? (spawnRule?.mode === 'sky' ? 'deploy_sky_drop' : 'deploy_scp'),
    newEnemy.row,
    spawnCol
  );
  if (def.soundOnSpawn) {
    playEffectSound(def.soundOnSpawn as EffectSoundKey);
  }

  const spawnExtras: DeclarativeSpawnRequest[] = [];
  triggerDeclarativeHooks(
    s,
    'on_spawn',
    'enemy',
    newEnemy,
    combinedEffects,
    new Set(),
    spawnExtras,
    nextSimId,
    undefined,
    undefined,
    hasEnemyImmunity
  );
  for (const ex of spawnExtras) {
    spawnEnemyAt(s, ex.type, { row: ex.row, occupiedRows: [ex.row] }, ex.col);
  }

  if (behavior?.onSpawnTriggerEventId) {
    const resolvedEv = resolveEventDefinition(behavior.onSpawnTriggerEventId);
    if (resolvedEv) {
      executeLevelEvent(
        s,
        resolvedEv,
        nextSimId,
        spawnEnemyAt,
        hasEnemyImmunity,
        { row: newEnemy.row, col: newEnemy.col },
        EVENT_ENGINE_CALLBACKS
      );
    }
  }
}

export function spawnEnemyGroup(
  s: SimState,
  type: EnemyType,
  targets: ResolvedSpawnTarget[],
  isFlagHorde?: boolean,
  hordeLabel?: string,
  waveOpts?: WaveSpawnOverrides,
  customCol?: number
) {
  const def = getEnemyDef(type);
  const packId = def?.behavior?.defaultPackCount ? nextSimId('pack') : undefined;
  const edgeSpawnCol = customCol ?? s.gridCols - 0.15;
  targets.forEach((target, idx) => {
    const offset = packId ? idx * 0.2 : 0;
    spawnEnemyAt(s, type, target, edgeSpawnCol + offset, packId, waveOpts);
  });

  if (type === 'scp_682') {
    soundEngine.playReptile682();
  }

  if (isFlagHorde) {
    s.flagBanner = hordeLabel || GAME_CONFIG.gameplay.defaultFlagBanner;
    s.flagBannerTimer = GAME_CONFIG.gameplay.flagBannerDurationSec;
    soundEngine.playFlagHorde();
  } else if (waveOpts?.announcement) {
    s.announcement = waveOpts.announcement;
    s.announcementTimer = GAME_CONFIG.gameplay.announcementDurationSec;
  } else if (def?.announcement) {
    s.announcement = def.announcement;
    s.announcementTimer = GAME_CONFIG.gameplay.announcementDurationSec;
  }
}

export function collectEnergyDropInSim(s: SimState, px: number, py: number): boolean {
  const { gateWidth, padTop, cellSize } = GAME_CONFIG.boardLayout;
  const collectRadius = GAME_CONFIG.gameplay.energyDropCollectRadiusPx;
  const idx = s.energyDrops.findIndex((drop) => {
    const dropPxX = gateWidth + drop.xCol * cellSize + cellSize / 2;
    const dropPxY = padTop + drop.yRow * cellSize + cellSize / 2;
    return Math.hypot(px - dropPxX, py - dropPxY) <= collectRadius;
  });
  if (idx === -1) return false;

  const drop = s.energyDrops[idx];
  s.energy += drop.amount;
  if (s.rules?.energyCap !== undefined) {
    s.energy = Math.min(s.rules.energyCap, s.energy);
  }
  s.energyDrops.splice(idx, 1);
  s.effects.push({
    id: nextSimId('fx'),
    kind: 'text',
    row: drop.yRow,
    col: drop.xCol,
    timer: 0,
    duration: 0.75,
    text: `+${drop.amount}`,
    color: '#FBBF24',
  });
  emitSimParticles(s, 'energy_collect', drop.yRow, drop.xCol);
  soundEngine.playCollect();
  return true;
}

export function removeTowerInSim(s: SimState, row: number, col: number): boolean {
  const existingIdx = s.towers.findIndex((t) => t.row === row && t.col === col);
  if (existingIdx === -1) return false;

  const removed = s.towers[existingIdx];
  const cost = getEffectiveTowerCost(removed.type, s.rules);
  const refund = Math.round(cost * GAME_CONFIG.gameplay.removeRefundRatio);
  s.energy += refund;
  if (s.rules?.energyCap !== undefined) {
    s.energy = Math.min(s.rules.energyCap, s.energy);
  }
  s.towers.splice(existingIdx, 1);
  if (refund > 0) {
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'text',
      row,
      col,
      timer: 0,
      duration: 0.7,
      text: `+${refund}`,
      color: '#94A3B8',
    });
  }
  soundEngine.playRemove();
  return true;
}

export function canPlaceTowerAt(
  s: SimState,
  towerType: TowerType,
  row: number,
  col: number
): boolean {
  if (row < 0 || row >= s.gridRows || col < 0 || col >= s.gridCols) return false;
  if (isCellBlocked(s, row, col)) return false;
  const def = getTowerDef(towerType);
  if (!def) return false;

  const obstacle = s.obstacles.find((o) => o.row === row && o.col === col && o.blocksPlacement);
  if (obstacle) {
    const canCounterClear =
      (obstacle.allowCounterPlacement &&
        obstacle.destructible &&
        obstacle.counterTowerTypes?.includes(towerType)) ||
      Boolean(def.canPlaceOnObstacles);
    if (!canCounterClear) return false;
  }
  if (s.towers.some((t) => t.row === row && t.col === col)) return false;
  if (s.rules?.bannedTowers?.includes(towerType)) return false;
  if (s.rules?.maxTowersOnBoard !== undefined && s.towers.length >= s.rules.maxTowersOnBoard) {
    return false;
  }
  if (def.placementRule === 'backHalf' && col >= Math.ceil(s.gridCols / 2)) return false;
  if (def.placementRule === 'frontHalf' && col < Math.floor(s.gridCols / 2)) return false;
  if (def.allowedRows && def.allowedRows.length > 0 && !def.allowedRows.includes(row)) {
    return false;
  }
  if (def.allowedCols && def.allowedCols.length > 0 && !def.allowedCols.includes(col)) {
    return false;
  }
  if (def.maxPerBoard !== undefined) {
    const boardCount = s.towers.filter((t) => t.type === towerType).length;
    if (boardCount >= def.maxPerBoard) return false;
  }
  if (def.maxPerRow !== undefined) {
    const rowCount = s.towers.filter((t) => t.type === towerType && t.row === row).length;
    if (rowCount >= def.maxPerRow) return false;
  }
  return true;
}

export function placeTowerInSim(
  s: SimState,
  towerType: TowerType,
  row: number,
  col: number
): boolean {
  if (!canPlaceTowerAt(s, towerType, row, col)) return false;
  const def = getTowerDef(towerType);
  if (!def) return false;
  const effectiveCost = getEffectiveTowerCost(towerType, s.rules, s);
  if (s.energy < effectiveCost || (s.cooldowns[def.type] ?? 0) > 0) return false;

  // Counter-unit clears destructible tombstone / obstacle directly on placement (PvZ Grave Buster style)
  const blockingOb = s.obstacles.find((o) => o.row === row && o.col === col && o.blocksPlacement);
  if (
    blockingOb &&
    ((blockingOb.allowCounterPlacement &&
      blockingOb.destructible &&
      blockingOb.counterTowerTypes?.includes(towerType)) ||
      (def.canPlaceOnObstacles && blockingOb.destructible))
  ) {
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'text',
      row,
      col,
      timer: 0,
      duration: 0.9,
      text: '¡DESPEJADO!',
      color: '#34D399',
    });
    destroyBoardObstacleInSim(s, blockingOb, true);
  }

  s.energy -= effectiveCost;
  s.energySpentTotal += effectiveCost;
  s.deployedTowerTypesUsed.add(def.type);
  s.cooldowns[def.type] = getEffectiveTowerCooldown(towerType, s.rules);
  s.towersDeployed += 1;

  if (def.deployEnergyBonus) {
    s.energy += def.deployEnergyBonus;
    if (s.rules?.energyCap !== undefined) {
      s.energy = Math.min(s.rules.energyCap, s.energy);
    }
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'text',
      row,
      col,
      timer: 0,
      duration: 0.85,
      text: `+${def.deployEnergyBonus} EN`,
      color: '#FBBF24',
    });
  }

  const hpMult = s.rules?.towerHpMultiplier ?? 1;
  const scaledMaxHp = Math.max(1, Math.round(def.maxHp * hpMult));
  const mods = getTileModifiersAt(s, row, col);
  const initialShield =
    mods.filter((m) => m.kind === 'shield').reduce((acc, m) => acc + (m.value ?? 150), 0) +
    (def.shieldOnDeploy ?? 0);

  const towerEffects = [
    ...(def.effects ?? []),
    ...(def.onDeployEffects ?? []),
    ...s.globalEffects.filter((id) => {
      const fx = EFFECTS_CATALOG[id];
      return fx && (fx.targetSide === 'towers' || fx.targetSide === 'allies');
    }),
  ];

  const newTower: Tower = {
    id: nextSimId('twr'),
    type: def.type,
    category: def.category,
    row,
    col,
    hp: scaledMaxHp,
    maxHp: scaledMaxHp,
    shieldHp: initialShield > 0 ? initialShield : undefined,
    shieldColor: def.shieldColor,
    actionTimer: def.energyAmount ? 3.5 : 0.7,
    armProgress: 0,
    isArmed: false,
    suppressed: false,
    hypnotized: false,
    radioProtected: false,
    stunTimer: 0,
    deafTimer: 0,
    immuneToPsych: Boolean(def.immuneToPsych),
    recoil: 0,
    hitFlash: 0,
  };
  initEntityEffectTimers(newTower, towerEffects);
  s.towers.push(newTower);

  emitSimParticles(
    s,
    def.particles?.onDeploy ?? (def.category === 'personal' ? 'deploy_personal' : 'deploy_structure'),
    row,
    col
  );

  const spawnExtras: DeclarativeSpawnRequest[] = [];
  triggerDeclarativeHooks(
    s,
    'on_spawn',
    'tower',
    newTower,
    towerEffects,
    new Set(),
    spawnExtras,
    nextSimId,
    undefined,
    undefined,
    hasEnemyImmunity
  );
  for (const ex of spawnExtras) {
    spawnEnemyAt(s, ex.type, { row: ex.row, occupiedRows: [ex.row] }, ex.col);
  }

  if (def.onDeployTriggerEventId) {
    const resolvedEv = resolveEventDefinition(def.onDeployTriggerEventId);
    if (resolvedEv) {
      executeLevelEvent(
        s,
        resolvedEv,
        nextSimId,
        spawnEnemyAt,
        hasEnemyImmunity,
        { row, col },
        EVENT_ENGINE_CALLBACKS
      );
    }
  }

  if (def.soundOnDeploy) {
    playEffectSound(def.soundOnDeploy as EffectSoundKey);
  } else {
    soundEngine.playPlace();
  }
  return true;
}

function applyMitigatedEnemyDamage(
  s: SimState,
  enemy: Enemy,
  rawDmg: number,
  sourceTowerId?: string,
  triggerDamagedHook = true,
  dmgOpts?: { damageType?: DamageTypeKind; armorPenetration?: number }
): number {
  if (rawDmg <= 0 || enemy.hp <= 0) return 0;
  const def = getEnemyDef(enemy.type);

  if (sourceTowerId && def?.behavior?.dodgeChance && Math.random() < def.behavior.dodgeChance) {
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'text',
      row: enemy.row,
      col: enemy.col,
      timer: 0,
      duration: 0.55,
      text: 'ESQUIVADO',
      color: '#38BDF8',
    });
    return 0;
  }

  if (dmgOpts?.damageType === 'explosion' && hasEnemyImmunity(enemy.type, 'explosion', enemy)) {
    return 0;
  }
  if (dmgOpts?.damageType === 'cryo' && hasEnemyImmunity(enemy.type, 'slow', enemy)) {
    return 0;
  }
  if (dmgOpts?.damageType === 'fire' && hasEnemyImmunity(enemy.type, 'burn', enemy)) {
    return 0;
  }

  if (sourceTowerId) enemy.lastHitByTowerId = sourceTowerId;
  const vuln = enemy.customVulnerableMult ?? 1;
  const baseRed = Math.min(0.85, Math.max(0, enemy.customDamageReduction ?? 0));
  const pen = Math.min(1, Math.max(0, dmgOpts?.armorPenetration ?? 0));
  const red = dmgOpts?.damageType === 'true' ? 0 : baseRed * (1 - pen);
  let dmg = rawDmg * vuln * (1 - red);
  if (enemy.shieldHp && enemy.shieldHp > 0) {
    const absorbed = Math.min(enemy.shieldHp, dmg);
    enemy.shieldHp -= absorbed;
    dmg -= absorbed;
  }
  if (def?.behavior?.maxDamagePerHit && dmg > def.behavior.maxDamagePerHit) {
    dmg = def.behavior.maxDamagePerHit;
  }
  if (dmg > 0) {
    enemy.hp -= dmg;
    enemy.hitFlash = Math.max(enemy.hitFlash, 0.35);
    if (sourceTowerId) {
      let totalReflect = def?.behavior?.reflectDamagePercent ?? 0;
      if (enemy.activeEffects) {
        for (const st of Object.values(enemy.activeEffects)) {
          if (st.reflectDamagePercent) totalReflect += st.reflectDamagePercent;
        }
      }
      if (totalReflect > 0) {
        const srcTower = s.towers.find((t) => t.id === sourceTowerId);
        if (srcTower && srcTower.hp > 0) {
          srcTower.hp -= dmg * totalReflect;
          srcTower.hitFlash = Math.max(srcTower.hitFlash, 0.25);
        }
      }
    }
    if (triggerDamagedHook) {
      if (def?.particles?.onDamaged) {
        emitSimParticles(s, def.particles.onDamaged, enemy.row, enemy.col);
      }
      const effects = [...(def?.effects ?? []), ...(enemy.extraEffects ?? [])];
      const extras: DeclarativeSpawnRequest[] = [];
      triggerDeclarativeHooks(
        s,
        'on_damaged',
        'enemy',
        enemy,
        effects,
        new Set(),
        extras,
        nextSimId,
        undefined,
        sourceTowerId ? s.towers.find((t) => t.id === sourceTowerId) : undefined,
        hasEnemyImmunity
      );
      for (const ex of extras) {
        spawnEnemyAt(s, ex.type, { row: ex.row, occupiedRows: [ex.row] }, ex.col);
      }
    }
  }
  return dmg;
}

function applyMitigatedTowerDamage(
  s: SimState,
  tower: Tower,
  rawDmg: number,
  towersToRemove: Set<string>,
  attackerEnemy?: Enemy,
  triggerDamagedHook = true
) {
  if (rawDmg <= 0 || tower.hp <= 0 || towersToRemove.has(tower.id)) return;
  const vuln = tower.customVulnerableMult ?? 1;
  const red = Math.min(0.85, Math.max(0, tower.customDamageReduction ?? 0));
  let dmg = rawDmg * vuln * (1 - red);
  if (tower.shieldHp && tower.shieldHp > 0) {
    const absorbed = Math.min(tower.shieldHp, dmg);
    tower.shieldHp -= absorbed;
    dmg -= absorbed;
  }
  if (dmg > 0) {
    tower.hp -= dmg;
    tower.hitFlash = Math.max(tower.hitFlash, 0.35);
    const tDef = getTowerDef(tower.type);
    if (attackerEnemy && attackerEnemy.hp > 0) {
      let totalReflect = tDef?.reflectDamagePercent ?? 0;
      if (tower.activeEffects) {
        for (const st of Object.values(tower.activeEffects)) {
          if (st.reflectDamagePercent) totalReflect += st.reflectDamagePercent;
        }
      }
      if (totalReflect > 0) {
        applyMitigatedEnemyDamage(s, attackerEnemy, dmg * totalReflect, tower.id, false);
      }
    }
    if (triggerDamagedHook) {
      const extras: DeclarativeSpawnRequest[] = [];
      triggerDeclarativeHooks(
        s,
        'on_damaged',
        'tower',
        tower,
        tDef?.effects,
        towersToRemove,
        extras,
        nextSimId,
        attackerEnemy,
        undefined,
        hasEnemyImmunity
      );
      for (const ex of extras) {
        spawnEnemyAt(s, ex.type, { row: ex.row, occupiedRows: [ex.row] }, ex.col);
      }
    }
  }
}

export function stepSimulation(s: SimState, dt: number): SimOutcome {
  const gp = GAME_CONFIG.gameplay;
  s.elapsedTime += dt;
  s.levelTimer += dt;

  if (s.announcementTimer > 0) s.announcementTimer = Math.max(0, s.announcementTimer - dt);
  if (s.flagBannerTimer > 0) s.flagBannerTimer = Math.max(0, s.flagBannerTimer - dt);
  if (s.blinkAlpha > 0) s.blinkAlpha = Math.max(0, s.blinkAlpha - dt * 5.8);

  // Aggregate active global modifiers from events
  let gmEnemySpeed = 1;
  let gmEnemyDamage = 1;
  let gmTowerFireRate = 1;
  let gmTowerDamage = 1;
  let gmEnergyGen = 1;
  let gmAutoCollect = false;
  for (const gm of s.activeGlobalModifiers) {
    if (gm.enemySpeedMultiplier) gmEnemySpeed *= gm.enemySpeedMultiplier;
    if (gm.enemyDamageMultiplier) gmEnemyDamage *= gm.enemyDamageMultiplier;
    if (gm.towerFireRateMultiplier) gmTowerFireRate *= gm.towerFireRateMultiplier;
    if (gm.towerDamageMultiplier) gmTowerDamage *= gm.towerDamageMultiplier;
    if (gm.energyGenerationMultiplier) gmEnergyGen *= gm.energyGenerationMultiplier;
    if (gm.autoCollectEnergy) gmAutoCollect = true;
  }

  if (s.rules?.passiveEnergyPerSec) {
    s.energy += s.rules.passiveEnergyPerSec * gmEnergyGen * dt;
  }

  // 1. Card cooldowns
  for (const key of Object.keys(s.cooldowns) as TowerType[]) {
    if (s.cooldowns[key] > 0) {
      s.cooldowns[key] = Math.max(0, s.cooldowns[key] - dt);
    }
  }

  // 2. Sky Energy drops
  if (!s.skyEnergy?.disabled) {
    s.skyEnergyTimer -= dt;
    if (s.skyEnergyTimer <= 0) {
      const minInt = s.skyEnergy?.intervalMinSec ?? gp.skyEnergyIntervalMinSec;
      const varInt = s.skyEnergy?.intervalVarianceSec ?? gp.skyEnergyIntervalVarianceSec;
      s.skyEnergyTimer = minInt + Math.random() * varInt;
      const defaultCols = GAME_CONFIG.grid.cols;
      const targetRow = Math.floor(Math.random() * s.gridRows);
      const skyMinCol =
        s.gridCols === defaultCols ? gp.skyEnergyColMin : Math.min(s.gridCols - 1, gp.skyEnergyColMin);
      const skyColSpan =
        s.gridCols === defaultCols
          ? gp.skyEnergyColSpan
          : Math.max(1, s.gridCols - skyMinCol - 1);
      const targetCol = skyMinCol + Math.floor(Math.random() * skyColSpan);
      s.energyDrops.push({
        id: nextSimId('energy'),
        xCol: targetCol + (Math.random() * 0.3 - 0.15),
        yRow: -0.4,
        targetRow,
        amount: Math.round((s.skyEnergy?.amount ?? gp.energyDropAmount) * gmEnergyGen),
        lifetime: 0,
        maxLifetime: gp.energyDropLifetimeSec,
        collecting: false,
        fromSky: true,
      });
    }
  }

  // 3. Level timeline spawner + event triggers
  let hadFlagHorde = false;
  s.timeline.forEach((ev, idx) => {
    if (!s.spawnedIndices.has(idx) && s.levelTimer >= ev.time) {
      s.spawnedIndices.add(idx);
      s.recentlyTriggeredWaveIndices.push(idx + 1);
      if (ev.isFlagHorde) hadFlagHorde = true;

      if (ev.dialogueId || ev.inlineDialogue) {
        s.pendingDialogues.push({
          dialogueId: ev.dialogueId,
          inlineDialogue: ev.inlineDialogue,
        });
      }

      if (ev.type && ev.targets.length > 0) {
        const waveOpts: WaveSpawnOverrides = {
          hpMultiplier: ev.hpMultiplier,
          speedMultiplier: ev.speedMultiplier,
          dpsMultiplier: ev.dpsMultiplier,
          extraEffects: ev.extraEffects,
          immunities: ev.immunities,
          eliteBadge: ev.eliteBadge,
          eliteColor: ev.eliteColor,
          announcement: ev.announcement,
        };
        if (ev.staggerSec && ev.staggerSec > 0 && ev.targets.length > 1) {
          spawnEnemyGroup(s, ev.type, [ev.targets[0]], ev.isFlagHorde, ev.hordeLabel, waveOpts, ev.col);
          for (let i = 1; i < ev.targets.length; i++) {
            s.pendingStaggeredSpawns.push({
              delay: i * ev.staggerSec,
              type: ev.type,
              target: ev.targets[i],
              col: ev.col ?? s.gridCols - 0.15,
              waveOpts: { ...waveOpts, announcement: undefined },
            });
          }
        } else {
          spawnEnemyGroup(s, ev.type, ev.targets, ev.isFlagHorde, ev.hordeLabel, waveOpts, ev.col);
        }
      }

      if (ev.eventId || ev.event) {
        const resolved = resolveEventDefinition(ev.eventId, ev.eventOverrides, ev.event);
        if (resolved) {
          const ctxPos =
            ev.targets.length > 0
              ? { row: ev.targets[0].row, col: ev.col ?? s.gridCols - 1 }
              : undefined;
          executeLevelEvent(
            s,
            resolved,
            nextSimId,
            spawnEnemyAt,
            hasEnemyImmunity,
            ctxPos,
            EVENT_ENGINE_CALLBACKS
          );
        }
      }
    }
  });

  // 3.1 Step scripted level events, staggered spawns, weather, tints, and chained events
  stepLevelEvents(
    s,
    dt,
    hadFlagHorde,
    s.levelConfig,
    nextSimId,
    spawnEnemyAt,
    hasEnemyImmunity,
    EVENT_ENGINE_CALLBACKS
  );

  // Check objectives & victory conditions
  const earlyObjRes = stepObjectives(s);
  if (earlyObjRes.failedReason) {
    s.defeatReason = earlyObjRes.failedReason;
    finalizeObjectivesOnOutcome(s, false);
    soundEngine.playGameOver();
    return 'GAME_OVER';
  }

  const zeroTowersAfter = s.victoryCondition?.defeatOnZeroTowersAfterSec;
  if (zeroTowersAfter !== undefined && s.levelTimer >= zeroTowersAfter && s.towers.length === 0) {
    s.defeatReason = 'Toda la fuerza defensiva fue eliminada tras el despliegue inicial.';
    finalizeObjectivesOnOutcome(s, false);
    soundEngine.playGameOver();
    return 'GAME_OVER';
  }

  if (evaluateVictoryCondition(s)) {
    finalizeObjectivesOnOutcome(s, true);
    soundEngine.playVictory();
    return 'VICTORY';
  }

  // Handle endless timeline cycling when all waves have spawned
  if (
    s.victoryCondition?.mode === 'endless' &&
    s.timeline.length > 0 &&
    s.spawnedIndices.size >= s.timeline.length &&
    s.pendingStaggeredSpawns.length === 0 &&
    s.enemies.length === 0
  ) {
    const cycle = (s.endlessCycle ?? 0) + 1;
    s.endlessCycle = cycle;
    const minT = s.timeline.reduce((m, e) => Math.min(m, e.time), s.timeline[0].time);
    const baseOffset = s.levelTimer + 4;
    s.timeline = s.timeline.map((ev) => ({
      ...ev,
      time: baseOffset + (ev.time - minT),
      hpMultiplier: (ev.hpMultiplier ?? 1) * 1.18,
      speedMultiplier: (ev.speedMultiplier ?? 1) * 1.03,
    }));
    s.spawnedIndices.clear();
    s.announcement = `¡Oleada Infinita #${cycle + 1} iniciada! Amenaza escalada.`;
    s.announcementTimer = 4.0;
  }

  // 3.5 Pocket Dimension rescues (SCP-106)
  const remainingRescues: PocketRescue[] = [];
  for (const rescue of s.pocketRescues) {
    rescue.timer -= dt;
    if (rescue.timer <= 0) {
      const spot = findNearestEmptyCell(
        s.towers,
        s.blockedCells,
        rescue.row,
        rescue.col,
        s.gridRows,
        s.gridCols
      );
      if (spot) {
        s.towers.push({
          id: nextSimId('twr'),
          type: rescue.towerType,
          category: rescue.category,
          row: spot.row,
          col: spot.col,
          hp: rescue.hp,
          maxHp: rescue.maxHp,
          actionTimer: 0.7,
          armProgress: 0,
          isArmed: false,
          suppressed: false,
          hypnotized: false,
          radioProtected: false,
          stunTimer: 0,
          deafTimer: 0,
          immuneToPsych: true,
          recoil: 0,
          hitFlash: 0,
        });
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'pocket_portal',
          row: spot.row,
          col: spot.col,
          timer: 0,
          duration: 0.65,
        });
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'text',
          row: spot.row,
          col: spot.col,
          timer: 0,
          duration: 1.1,
          text: '¡VOLVIÓ INMUNE!',
          color: '#34D399',
        });
        soundEngine.playRevive();
      }
    } else {
      remainingRescues.push(rescue);
    }
  }
  s.pocketRescues = remainingRescues;

  // 3.6 Update SCP-079 Doors (including timed event doors)
  const survivingDoors: Door079[] = [];
  for (const door of s.doors079) {
    if (door.remainingLifetime !== undefined) {
      door.remainingLifetime -= dt;
      if (door.remainingLifetime <= 0) continue;
    }
    door.toggleTimer -= dt;
    if (door.toggleTimer <= 0) {
      door.isOpen = !door.isOpen;
      door.toggleTimer =
        door.toggleIntervalSec ??
        gp.doors079.toggleMinSec + Math.random() * gp.doors079.toggleVarianceSec;
      soundEngine.playDoor079();
    }
    survivingDoors.push(door);
  }
  s.doors079 = survivingDoors;

  // 4. SCP-173 Global Blink
  const hasActive173 = s.enemies.some(
    (e) => e.type === 'scp_173' && e.hp > 0 && (e.silenceTimer ?? 0) <= 0
  );
  if (hasActive173) {
    const blinkInterval = EFFECTS_CATALOG.blink_173?.blinkIntervalSec ?? 2.0;
    s.blinkTimer += dt;
    if (s.blinkTimer >= blinkInterval) {
      s.blinkTimer = 0;
      s.blinkAlpha = 0.88;
      soundEngine.playBlink();
    }
  } else {
    s.blinkTimer = 0;
  }

  // 5. Evaluate global/aura tower status (SCP-966, Radio, SCP-035) + Declarative Effects
  const active966 = s.enemies.filter(
    (e) => e.type === 'scp_966' && e.hp > 0 && (e.silenceTimer ?? 0) <= 0
  );
  const hasActive035 = s.enemies.some(
    (e) => e.type === 'scp_035' && e.hp > 0 && (e.silenceTimer ?? 0) <= 0
  );
  const hasActive049 = s.enemies.some(
    (e) => e.type === 'scp_049' && e.hp > 0 && (e.silenceTimer ?? 0) <= 0
  );
  const sleepRadius = EFFECTS_CATALOG.sleep_3x3?.radiusCells ?? 1;
  const radioRadius = EFFECTS_CATALOG.radio_3x3?.radiusCells ?? 1;

  for (const tower of s.towers) {
    if (tower.immuneToPsych) {
      tower.suppressed = false;
    } else {
      tower.suppressed = active966.some((scp966) => {
        const centerCol = Math.min(s.gridCols - 1, Math.max(0, Math.round(scp966.col)));
        return (
          scp966.occupiedRows.some((r) => Math.abs(tower.row - r) <= sleepRadius) &&
          Math.abs(tower.col - centerCol) <= sleepRadius
        );
      });
    }

    if (tower.stunTimer > 0) tower.stunTimer = Math.max(0, tower.stunTimer - dt);
    if (tower.deafTimer > 0) tower.deafTimer = Math.max(0, tower.deafTimer - dt);
    if (tower.recoil > 0) tower.recoil = Math.max(0, tower.recoil - dt * 5);
    if (tower.hitFlash > 0) tower.hitFlash = Math.max(0, tower.hitFlash - dt * 4);
  }

  const activeRadios = s.towers.filter(
    (t) => t.type === 'radio' && !t.suppressed && t.stunTimer <= 0 && t.deafTimer <= 0
  );
  for (const tower of s.towers) {
    const def = getTowerDef(tower.type);
    tower.radioProtected = activeRadios.some(
      (r) => Math.abs(tower.row - r.row) <= radioRadius && Math.abs(tower.col - r.col) <= radioRadius
    );
    const isHypnotizable = Boolean(def?.canBeHypnotized);
    tower.hypnotized =
      !tower.immuneToPsych && hasActive035 && isHypnotizable && !tower.radioProtected;
  }

  // 5.5 Execute declarative JSON effects (auras, periodic, passive, on_hp_below, on_enemy_enter, active DoT/HoT/buffs)
  const towersToRemove = new Set<string>();
  const declarativeSpawns: DeclarativeSpawnRequest[] = [];
  stepDeclarativeEffects(
    s,
    dt,
    towersToRemove,
    declarativeSpawns,
    nextSimId,
    hasEnemyImmunity
  );

  // 5.7 Update obstacles (hitFlash decay + regen_barrier tiles)
  for (const ob of s.obstacles) {
    if (ob.hitFlash > 0) ob.hitFlash = Math.max(0, ob.hitFlash - dt * 4);
    if (ob.destructible && ob.hp < ob.maxHp && s.tileModifiers.length > 0) {
      const obMods = getTileModifiersAt(s, ob.row, ob.col);
      for (const m of obMods) {
        if (m.kind === 'regen_barrier') {
          ob.hp = Math.min(ob.maxHp, ob.hp + (m.value ?? 20) * dt);
        }
      }
    }
  }

  // 5.8 Apply Tile Modifiers to towers
  if (s.tileModifiers.length > 0) {
    for (const tower of s.towers) {
      if (tower.hp <= 0 || towersToRemove.has(tower.id)) continue;
      const mods = getTileModifiersAt(s, tower.row, tower.col);
      for (const m of mods) {
        if ((m.kind === 'heal' || m.kind === 'regen_barrier') && tower.hp < tower.maxHp) {
          tower.hp = Math.min(tower.maxHp, tower.hp + (m.value ?? 18) * dt);
        } else if (m.kind === 'damage_tower') {
          applyMitigatedTowerDamage(s, tower, (m.value ?? 12) * dt, towersToRemove, undefined, false);
          if (tower.hp <= 0) towersToRemove.add(tower.id);
        } else if (m.kind === 'energy') {
          s.energy += (m.value ?? 6) * gmEnergyGen * dt;
        } else if (m.kind === 'apply_effect' && m.appliesEffectId && (m.targetSide ?? 'towers') !== 'enemies') {
          const fx = EFFECTS_CATALOG[m.appliesEffectId];
          if (fx && !tower.activeEffects?.[fx.id]) {
            applyDeclarativeEffectToTower(s, fx, tower, fx.durationSec ?? 0.5, towersToRemove, nextSimId, false);
          }
        }
      }
    }
  }

  // 6. Update towers (driven declaratively by TowerDefinition JSON fields)
  const radioBoost = EFFECTS_CATALOG.radio_3x3?.fireRateBoost ?? 1.15;
  const ruleTowerDmgMult = s.rules?.towerDamageMultiplier ?? 1;
  const ruleTowerFireMult = s.rules?.towerFireRateMultiplier ?? 1;

  const isEnemyTargetable = (e: Enemy): boolean => {
    if (e.hp <= 0 || e.skyOffsetRows > 0.3) return false;
    const untargetCol = getEnemyDef(e.type)?.behavior?.untargetableUntilCol;
    if (untargetCol !== undefined && e.col > untargetCol) return false;
    return true;
  };

  const isBossEnemy = (e: Enemy): boolean =>
    e.occupiedRows.length > 1 || Boolean(e.customBadge);

  const sortTargetEnemies = (
    list: Enemy[],
    refCol: number,
    priority?: TowerDefinition['targetPriority']
  ): Enemy[] => {
    const copy = [...list];
    switch (priority) {
      case 'furthest':
        return copy.sort((a, b) => b.col - a.col);
      case 'lowest_hp':
        return copy.sort((a, b) => a.hp - b.hp);
      case 'highest_hp':
        return copy.sort((a, b) => b.hp - a.hp);
      case 'fastest':
        return copy.sort(
          (a, b) =>
            b.currentSpeed * (1 - b.slowFactor) - a.currentSpeed * (1 - a.slowFactor)
        );
      default:
        return copy.sort((a, b) => Math.abs(a.col - refCol) - Math.abs(b.col - refCol));
    }
  };

  const EFFECT_SOUND_SET = new Set<string>([
    'explosion',
    'heal',
    'revive',
    'stun',
    'scream066',
    'pull',
    'portal',
    'tesla',
    'blink',
    'place',
    'collect',
    'door',
    'horde',
    'alert',
  ]);

  for (const tower of s.towers) {
    if (tower.hp <= 0 || towersToRemove.has(tower.id)) continue;
    const def = getTowerDef(tower.type);
    if (!def) continue;

    if (def.regenHpPerSec && tower.hp < tower.maxHp) {
      tower.hp = Math.min(tower.maxHp, tower.hp + def.regenHpPerSec * dt);
    }
    if (def.shieldRegenPerSec) {
      const maxSh =
        def.maxShieldHp ?? def.shieldOnDeploy ?? Math.round(tower.maxHp * 0.5);
      if (maxSh > 0) {
        tower.shieldHp = Math.min(maxSh, (tower.shieldHp ?? 0) + def.shieldRegenPerSec * dt);
        if (!tower.shieldColor && def.shieldColor) tower.shieldColor = def.shieldColor;
      }
    }

    if (
      tower.suppressed ||
      tower.stunTimer > 0 ||
      tower.deafTimer > 0 ||
      tower.customDisabled
    ) {
      continue;
    }

    const tileMods = getTileModifiersAt(s, tower.row, tower.col);
    let tileFireMult = 1;
    let tileDmgMult = 1;
    for (const tm of tileMods) {
      if (tm.kind === 'boost_fire') tileFireMult *= tm.value ?? 1.35;
      if (tm.kind === 'boost_damage') tileDmgMult *= tm.value ?? 1.35;
    }

    if (def.energyAmount && def.energyInterval) {
      tower.actionTimer += dt * (tower.customFireRateMult ?? 1) * gmTowerFireRate * tileFireMult * ruleTowerFireMult;
      if (tower.actionTimer >= def.energyInterval) {
        tower.actionTimer = 0;
        const unitAmount = Math.max(5, Math.round(gp.energyDropAmount * gmEnergyGen));
        const totalAmt = def.energyAmount * gmEnergyGen;
        const dropCount = Math.max(1, Math.round(totalAmt / unitAmount));
        for (let d = 0; d < dropCount; d++) {
          s.energyDrops.push({
            id: nextSimId('energy'),
            xCol: tower.col + (Math.random() * 0.3 - 0.15),
            yRow: tower.row - 0.2,
            targetRow: tower.row + 0.15,
            amount: unitAmount,
            lifetime: 0,
            maxLifetime: gp.energyDropLifetimeSec,
            collecting: false,
            fromSky: false,
          });
        }
        if (def.particles?.onAttack) {
          emitSimParticles(s, def.particles.onAttack, tower.row, tower.col);
        }
      }
    } else if (def.healAmount && def.healInterval) {
      tower.actionTimer += dt * (tower.customFireRateMult ?? 1) * gmTowerFireRate * tileFireMult * ruleTowerFireMult;
      if (tower.actionTimer >= def.healInterval) {
        tower.actionTimer = 0;
        const healAmt = def.healAmount;
        const healRad = EFFECTS_CATALOG.heal_pulse?.radiusCells ?? 1;
        let healedAny = false;
        for (const ally of s.towers) {
          if (
            Math.abs(ally.row - tower.row) <= healRad &&
            Math.abs(ally.col - tower.col) <= healRad &&
            ally.hp < ally.maxHp
          ) {
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
            healedAny = true;
          }
        }
        if (healedAny) {
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'heal_ring',
            row: tower.row,
            col: tower.col,
            timer: 0,
            duration: 0.5,
          });
          emitSimParticles(s, def.particles?.onAttack ?? 'heal_pulse', tower.row, tower.col);
          soundEngine.playHeal();
        }
      }
    } else if (def.floorTrapDps) {
      const dps = def.floorTrapDps * (tower.customDamageMult ?? 1) * gmTowerDamage * tileDmgMult * ruleTowerDmgMult;
      for (const enemy of s.enemies) {
        if (
          enemy.skyOffsetRows <= 0.3 &&
          enemyOccupiesRow(enemy, tower.row) &&
          Math.abs(enemy.col - tower.col) <= 0.48
        ) {
          applyMitigatedEnemyDamage(s, enemy, dps * dt, tower.id, false, {
            damageType: def.damageType,
            armorPenetration: def.armorPenetration,
          });
        }
      }
    } else if (def.armTime !== undefined && def.explosionDamage) {
      if (!tower.isArmed) {
        tower.armProgress = Math.min(1, tower.armProgress + dt / Math.max(0.05, def.armTime));
        if (tower.armProgress >= 1) {
          tower.isArmed = true;
        }
      } else {
        const trigger = s.enemies.find(
          (e) =>
            e.skyOffsetRows <= 0.3 &&
            enemyOccupiesRow(e, tower.row) &&
            Math.abs(e.col - tower.col) <= 0.48
        );
        if (trigger) {
          const expCols = def.explosionRadiusCols ?? 1.2;
          const expRows = def.explosionRadiusRows ?? 0;
          const blastDmg = Math.round(
            (def.explosionDamage ?? 420) * (tower.customDamageMult ?? 1) * gmTowerDamage * tileDmgMult * ruleTowerDmgMult
          );
          for (const enemy of s.enemies) {
            if (
              enemy.skyOffsetRows <= 0.3 &&
              enemy.occupiedRows.some((r) => Math.abs(r - tower.row) <= expRows) &&
              Math.abs(enemy.col - tower.col) <= expCols
            ) {
              if (hasEnemyImmunity(enemy.type, 'explosion', enemy)) {
                s.effects.push({
                  id: nextSimId('fx'),
                  kind: 'text',
                  row: enemy.row,
                  col: enemy.col,
                  timer: 0,
                  duration: 0.8,
                  text: 'INMUNE EXPL.',
                  color: '#84CC16',
                });
              } else {
                applyMitigatedEnemyDamage(s, enemy, blastDmg, tower.id, true, {
                  damageType: def.damageType ?? 'explosion',
                  armorPenetration: def.armorPenetration,
                });
                if (def.stunDuration && !hasEnemyImmunity(enemy.type, 'stun', enemy)) {
                  enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, def.stunDuration);
                }
              }
            }
          }
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'explosion',
            row: tower.row,
            col: tower.col,
            timer: 0,
            duration: EFFECTS_CATALOG.explosion?.durationSec ?? 0.45,
          });
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: tower.row,
            col: tower.col,
            timer: 0,
            duration: 0.8,
            text: `-${blastDmg}`,
            color: '#F59E0B',
          });
          emitSimParticles(s, def.particles?.onDeath ?? 'explosion_mine', tower.row, tower.col);
          if (def.soundOnDeath && EFFECT_SOUND_SET.has(def.soundOnDeath)) {
            playEffectSound(def.soundOnDeath as EffectSoundKey);
          } else {
            soundEngine.playExplosion();
          }
          towersToRemove.add(tower.id);
        }
      }
    } else if (def.aoeTargets && def.fireRate && def.damage) {
      if (tower.hypnotized) continue;
      const aoeRows = def.aoeRadiusRows ?? 1;
      const aoeCols = def.aoeRadiusCols ?? 1.45;
      const nearbyEnemies = s.enemies.filter(
        (e) =>
          isEnemyTargetable(e) &&
          e.occupiedRows.some((r) => Math.abs(r - tower.row) <= aoeRows) &&
          Math.abs(e.col - tower.col) <= aoeCols
      );
      if (nearbyEnemies.length > 0) {
        const speedFactor =
          (tower.radioProtected ? radioBoost : 1) *
          (tower.customFireRateMult ?? 1) *
          gmTowerFireRate *
          tileFireMult *
          ruleTowerFireMult;
        tower.actionTimer += dt * speedFactor;
        if (tower.actionTimer >= def.fireRate) {
          tower.actionTimer = 0;
          const maxTargets = def.aoeTargets;
          const baseDmg = def.damage * (tower.customDamageMult ?? 1) * gmTowerDamage * tileDmgMult * ruleTowerDmgMult;
          const targets = sortTargetEnemies(nearbyEnemies, tower.col, def.targetPriority).slice(
            0,
            maxTargets
          );
          const towerAttackEffects = [...(def.effects ?? []), ...(def.onAttackEffects ?? [])];
          triggerDeclarativeHooks(
            s,
            'on_attack',
            'tower',
            tower,
            towerAttackEffects,
            towersToRemove,
            declarativeSpawns,
            nextSimId,
            targets[0],
            undefined,
            hasEnemyImmunity
          );
          const towerHitEffects = [...(def.effects ?? []), ...(def.onHitEffects ?? [])];
          const totalLifesteal = (def.lifestealRatio ?? 0) + (tower.customLifesteal ?? 0);

          for (const tgt of targets) {
            let finalDmg = baseDmg;
            if (def.bonusDamageToBoss && isBossEnemy(tgt)) {
              finalDmg *= 1 + def.bonusDamageToBoss;
            }
            if (def.critChance && Math.random() < def.critChance) {
              finalDmg *= def.critMultiplier ?? 1.75;
              s.effects.push({
                id: nextSimId('fx'),
                kind: 'text',
                row: tgt.row,
                col: tgt.col,
                timer: 0,
                duration: 0.45,
                text: '¡CRÍTICO!',
                color: '#FBBF24',
              });
            }
            const dealt = applyMitigatedEnemyDamage(s, tgt, finalDmg, tower.id, true, {
              damageType: def.damageType ?? 'electric',
              armorPenetration: def.armorPenetration,
            });
            if (totalLifesteal > 0 && dealt > 0) {
              tower.hp = Math.min(tower.maxHp, tower.hp + dealt * totalLifesteal);
            }
            if (def.knockbackCols && tgt.hp > 0) {
              const resist = getEnemyDef(tgt.type)?.behavior?.knockbackResist ?? 0;
              const push = Math.max(0, def.knockbackCols * (1 - Math.min(1, resist)));
              if (push > 0) tgt.col = Math.min(s.gridCols - 0.15, tgt.col + push);
            }
            if (def.stunDuration && !hasEnemyImmunity(tgt.type, 'stun', tgt)) {
              tgt.stunTimer = Math.max(tgt.stunTimer ?? 0, def.stunDuration);
            }
            if (def.silenceDuration && !hasEnemyImmunity(tgt.type, 'silence', tgt)) {
              tgt.silenceTimer = Math.max(tgt.silenceTimer ?? 0, def.silenceDuration);
            }
            triggerProjectileDeclarativeHits(
              s,
              towerHitEffects,
              tgt,
              nextSimId,
              hasEnemyImmunity,
              tower
            );
            s.effects.push({
              id: nextSimId('fx'),
              kind: 'tesla_arc',
              row: tower.row,
              col: tower.col,
              targetRow: tgt.row,
              targetCol: tgt.col,
              timer: 0,
              duration: 0.22,
            });
            if (def.particles?.onHit) {
              emitSimParticles(s, def.particles.onHit, tgt.row, tgt.col);
            }
          }
          emitSimParticles(s, def.particles?.onAttack ?? 'attack_tesla', tower.row, tower.col);
          if (def.soundOnAttack && EFFECT_SOUND_SET.has(def.soundOnAttack)) {
            playEffectSound(def.soundOnAttack as EffectSoundKey);
          } else {
            soundEngine.playTeslaArc();
          }
        }
      }
    } else if (def.projectileKind && def.fireRate && def.damage) {
      if (tower.hypnotized) continue;

      const maxRange = def.maxRangeCols ?? s.gridCols + 0.5;
      const rowReach = def.canTargetRows ?? 0;
      const minCol = def.attackBehind ? tower.col - maxRange : tower.col - 0.2;
      const maxCol = tower.col + maxRange;

      const frontEnemy = s.enemies.some(
        (e) =>
          isEnemyTargetable(e) &&
          e.occupiedRows.some((r) => Math.abs(r - tower.row) <= rowReach) &&
          e.col >= tower.col - 0.2 &&
          e.col <= maxCol
      );
      const backEnemy =
        def.attackBehind &&
        s.enemies.some(
          (e) =>
            isEnemyTargetable(e) &&
            e.occupiedRows.some((r) => Math.abs(r - tower.row) <= rowReach) &&
            e.col < tower.col - 0.2 &&
            e.col >= minCol
        );
      const hasObstacle = s.obstacles.some(
        (ob) =>
          ob.destructible &&
          ob.blocksProjectiles &&
          Math.abs(ob.row - tower.row) <= rowReach &&
          ob.col >= tower.col + 0.2 &&
          ob.col <= maxCol
      );

      if (frontEnemy || backEnemy || hasObstacle) {
        const speedFactor =
          (tower.radioProtected ? radioBoost : 1) *
          (tower.customFireRateMult ?? 1) *
          gmTowerFireRate *
          tileFireMult *
          ruleTowerFireMult;
        tower.actionTimer += dt * speedFactor;
        if (tower.actionTimer >= def.fireRate) {
          tower.actionTimer = 0;
          tower.recoil = 1;
          const kind = def.projectileKind;
          const bursts = def.burstCount ?? 1;
          const projCount = Math.max(1, def.projectileCountPerShot ?? 1);
          const rowSpread = def.projectileRowSpread ?? 0;
          const fireDir: 1 | -1 = !frontEnemy && !hasObstacle && backEnemy ? -1 : 1;
          const baseProjSpeed = def.projectileSpeed ?? gp.projectileSpeeds[kind] ?? 6.4;
          const projSpeed = baseProjSpeed * (tower.customProjSpeedMult ?? 1);
          const dmg =
            def.damage *
            (tower.customDamageMult ?? 1) *
            gmTowerDamage *
            tileDmgMult *
            ruleTowerDmgMult;
          const projDesign = DESIGN_CATALOG.projectiles[kind];
          const trailPreset =
            def.particles?.projectileTrail ??
            projDesign?.trailParticleId ??
            (PARTICLES_CATALOG[`trail_${kind}`] ? `trail_${kind}` : undefined);
          const impactPreset =
            def.particles?.onHit ?? projDesign?.impactParticleId;
          const hasPierce = Boolean(def.passThrough || (def.pierceCount && def.pierceCount > 0));
          const combinedProjEffects = [...(def.effects ?? []), ...(def.onHitEffects ?? [])];

          for (let b = 0; b < bursts; b++) {
            for (let pIdx = 0; pIdx < projCount; pIdx++) {
              const offsetRatio = projCount === 1 ? 0 : pIdx / (projCount - 1) - 0.5;
              const projRow = Math.max(
                0,
                Math.min(s.gridRows - 1, Math.round(tower.row + offsetRatio * rowSpread * 2))
              );
              s.projectiles.push({
                id: nextSimId('proj'),
                row: projRow,
                col: tower.col + fireDir * (0.35 + b * 0.24),
                originCol: tower.col,
                direction: fireDir,
                maxRangeCols: def.maxRangeCols,
                splashRadius: def.splashRadius,
                speed: projSpeed,
                damage: dmg,
                damageType: def.damageType,
                armorPenetration: def.armorPenetration,
                critChance: def.critChance,
                critMultiplier: def.critMultiplier,
                bonusDamageToBoss: def.bonusDamageToBoss,
                kind,
                slowFactor:
                  def.slowFactor ??
                  (kind === 'cryo' ? EFFECTS_CATALOG.cryo_slow?.slowFactor : undefined),
                slowDuration:
                  def.slowDuration ??
                  (kind === 'cryo' ? EFFECTS_CATALOG.cryo_slow?.durationSec : undefined),
                burnDps:
                  def.burnDps ??
                  (kind === 'pyro' ? EFFECTS_CATALOG.thermal_burn?.burnDps : undefined),
                burnDuration:
                  def.burnDuration ??
                  (kind === 'pyro' ? EFFECTS_CATALOG.thermal_burn?.durationSec : undefined),
                knockbackCols: def.knockbackCols,
                stunDuration: def.stunDuration,
                silenceDuration: def.silenceDuration,
                effectIds: combinedProjEffects.length > 0 ? combinedProjEffects : undefined,
                sourceTowerType: def.type,
                sourceTowerId: tower.id,
                passThrough: def.passThrough,
                remainingPierce: def.pierceCount,
                hitEnemyIds: hasPierce ? [] : undefined,
                chainBounceCount: def.chainBounceCount,
                chainBounceRangeCols: def.chainBounceRangeCols,
                chainDamageDecay: def.chainDamageDecay,
                trailParticleId: trailPreset,
                impactParticleId: impactPreset,
                trailTimer: 0,
              });
            }
          }

          triggerDeclarativeHooks(
            s,
            'on_attack',
            'tower',
            tower,
            [...(def.effects ?? []), ...(def.onAttackEffects ?? [])],
            towersToRemove,
            declarativeSpawns,
            nextSimId,
            undefined,
            undefined,
            hasEnemyImmunity
          );

          s.effects.push({
            id: nextSimId('fx'),
            kind: 'muzzle',
            row: tower.row,
            col: tower.col,
            timer: 0,
            duration: 0.12,
          });

          const attackPreset =
            def.particles?.onAttack ??
            (PARTICLES_CATALOG[`attack_${kind}`] ? `attack_${kind}` : 'attack_standard');
          emitSimParticles(s, attackPreset, tower.row, tower.col, {
            angleOffsetDeg: fireDir === -1 ? 180 : 0,
          });

          if (def.soundOnAttack) {
            if (EFFECT_SOUND_SET.has(def.soundOnAttack)) {
              playEffectSound(def.soundOnAttack as EffectSoundKey);
            } else {
              soundEngine.playShot(def.soundOnAttack);
            }
          } else {
            soundEngine.playShot(kind);
          }
        }
      } else {
        tower.actionTimer = Math.min(
          tower.actionTimer + dt * 0.5,
          def.fireRate * 0.8
        );
      }
    }
  }

  // 7. Move projectiles, apply tile projectile modifiers, resolve doors/obstacles & enemy hits
  const projectilesToRemove = new Set<string>();
  for (const proj of s.projectiles) {
    proj.col += (proj.direction ?? 1) * proj.speed * dt;
    if (
      proj.col < -0.4 ||
      proj.col > s.gridCols + 0.4 ||
      (proj.maxRangeCols !== undefined && Math.abs(proj.col - proj.originCol) > proj.maxRangeCols)
    ) {
      projectilesToRemove.add(proj.id);
      continue;
    }

    if (proj.trailParticleId) {
      proj.trailTimer = (proj.trailTimer ?? 0) + dt;
      if (proj.trailTimer >= 0.055) {
        proj.trailTimer = 0;
        emitSimParticles(s, proj.trailParticleId, proj.row, proj.col);
      }
    }

    // Apply Tile Modifiers to flying projectiles (ignite, chill, pierce, damage boost)
    if (s.tileModifiers.length > 0) {
      const projColCell = Math.round(proj.col);
      if (projColCell >= 0 && projColCell < s.gridCols) {
        const pMods = getTileModifiersAt(s, proj.row, projColCell);
        for (const tm of pMods) {
          const modKey = `${tm.id ?? tm.kind}_${projColCell}`;
          if (proj.appliedTileMods?.includes(modKey)) continue;
          if (
            tm.kind === 'ignite_projectiles' ||
            tm.kind === 'chill_projectiles' ||
            tm.kind === 'pierce_projectiles' ||
            tm.kind === 'boost_projectile_damage'
          ) {
            proj.appliedTileMods = proj.appliedTileMods ?? [];
            proj.appliedTileMods.push(modKey);
            if (tm.kind === 'ignite_projectiles') {
              proj.burnDps = Math.max(proj.burnDps ?? 0, tm.value ?? 22);
              proj.burnDuration = Math.max(proj.burnDuration ?? 0, 3.5);
            } else if (tm.kind === 'chill_projectiles') {
              proj.slowFactor = Math.max(proj.slowFactor ?? 0, tm.value ?? 0.35);
              proj.slowDuration = Math.max(proj.slowDuration ?? 0, 2.5);
            } else if (tm.kind === 'pierce_projectiles') {
              proj.passThrough = true;
              proj.hitEnemyIds = proj.hitEnemyIds ?? [];
            } else if (tm.kind === 'boost_projectile_damage') {
              proj.damage *= tm.value ?? 1.45;
            }
          }
        }
      }
    }

    if (!proj.passThrough) {
      const closedDoor = s.doors079.find(
        (d) => !d.isOpen && d.row === proj.row && Math.abs(d.col - proj.col) <= 0.32
      );
      if (closedDoor) {
        projectilesToRemove.add(proj.id);
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'text',
          row: closedDoor.row,
          col: closedDoor.col,
          timer: 0,
          duration: 0.35,
          text: 'BLOQ.',
          color: '#4ADE80',
        });
        continue;
      }
    }

    // Check destructible/blocking obstacle (PvZ Tombstone / Barricade) collision
    const hitObstacle = s.obstacles.find(
      (ob) =>
        ob.blocksProjectiles &&
        ob.row === proj.row &&
        Math.abs(ob.col - proj.col) <= 0.36 &&
        !(proj.hitObstacleIds && proj.hitObstacleIds.includes(ob.id))
    );
    if (hitObstacle) {
      if (hitObstacle.destructible) {
        const mult =
          proj.sourceTowerType && hitObstacle.counterTowerTypes?.includes(proj.sourceTowerType)
            ? hitObstacle.counterDamageMultiplier
            : 1;
        hitObstacle.hp -= proj.damage * mult;
        hitObstacle.hitFlash = 0.45;
        if (hitObstacle.hp <= 0) {
          destroyBoardObstacleInSim(s, hitObstacle, true);
        }
      }
      if (proj.passThrough) {
        proj.hitObstacleIds = proj.hitObstacleIds ?? [];
        proj.hitObstacleIds.push(hitObstacle.id);
      } else {
        projectilesToRemove.add(proj.id);
        continue;
      }
    }

    let hitEnemy: Enemy | undefined;
    for (const enemy of s.enemies) {
      if (proj.hitEnemyIds && proj.hitEnemyIds.includes(enemy.id)) continue;
      if (
        isEnemyTargetable(enemy) &&
        enemyOccupiesRow(enemy, proj.row) &&
        Math.abs(enemy.col - proj.col) <= 0.36
      ) {
        if (
          !hitEnemy ||
          ((proj.direction ?? 1) === 1 ? enemy.col < hitEnemy.col : enemy.col > hitEnemy.col)
        ) {
          hitEnemy = enemy;
        }
      }
    }

    if (hitEnemy) {
      const sourceTower = proj.sourceTowerId
        ? s.towers.find((t) => t.id === proj.sourceTowerId)
        : undefined;
      const sourceDef = sourceTower ? getTowerDef(sourceTower.type) : undefined;
      const totalLifesteal =
        (sourceDef?.lifestealRatio ?? 0) + (sourceTower?.customLifesteal ?? 0);

      let rollDmg = proj.damage;
      let didCrit = false;
      if (proj.critChance && Math.random() < proj.critChance) {
        rollDmg *= proj.critMultiplier ?? 1.75;
        didCrit = true;
      }

      if (proj.splashRadius) {
        for (const target of s.enemies) {
          if (
            isEnemyTargetable(target) &&
            target.occupiedRows.some((r) => Math.abs(r - hitEnemy!.row) <= 1) &&
            Math.abs(target.col - hitEnemy.col) <= proj.splashRadius
          ) {
            if (hasEnemyImmunity(target.type, 'explosion', target)) {
              s.effects.push({
                id: nextSimId('fx'),
                kind: 'text',
                row: target.row,
                col: target.col,
                timer: 0,
                duration: 0.5,
                text: 'INMUNE EXPL.',
                color: '#84CC16',
              });
            } else {
              const tgtDmg =
                proj.bonusDamageToBoss && isBossEnemy(target)
                  ? rollDmg * (1 + proj.bonusDamageToBoss)
                  : rollDmg;
              const dealt = applyMitigatedEnemyDamage(
                s,
                target,
                tgtDmg,
                proj.sourceTowerId,
                true,
                {
                  damageType: proj.damageType ?? 'explosion',
                  armorPenetration: proj.armorPenetration,
                }
              );
              if (sourceTower && totalLifesteal > 0 && dealt > 0) {
                sourceTower.hp = Math.min(sourceTower.maxHp, sourceTower.hp + dealt * totalLifesteal);
              }
            }
          }
        }
        // Splash also damages nearby destructible obstacles / tombstones
        for (const ob of [...s.obstacles]) {
          if (
            ob.destructible &&
            ob.absorbsSplash &&
            Math.abs(ob.row - hitEnemy.row) <= 1 &&
            Math.abs(ob.col - hitEnemy.col) <= proj.splashRadius
          ) {
            const mult =
              proj.sourceTowerType && ob.counterTowerTypes?.includes(proj.sourceTowerType)
                ? ob.counterDamageMultiplier
                : 1;
            ob.hp -= rollDmg * mult;
            ob.hitFlash = 0.45;
            if (ob.hp <= 0) {
              destroyBoardObstacleInSim(s, ob, true);
            }
          }
        }
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'explosion',
          row: hitEnemy.row,
          col: hitEnemy.col,
          timer: 0,
          duration: 0.38,
        });
        emitSimParticles(s, proj.impactParticleId ?? 'explosion_grenade', hitEnemy.row, hitEnemy.col);
        soundEngine.playExplosion();
      } else {
        const singleDmg =
          proj.bonusDamageToBoss && isBossEnemy(hitEnemy)
            ? rollDmg * (1 + proj.bonusDamageToBoss)
            : rollDmg;
        const dealt = applyMitigatedEnemyDamage(
          s,
          hitEnemy,
          singleDmg,
          proj.sourceTowerId,
          true,
          {
            damageType: proj.damageType,
            armorPenetration: proj.armorPenetration,
          }
        );
        if (sourceTower && totalLifesteal > 0 && dealt > 0) {
          sourceTower.hp = Math.min(sourceTower.maxHp, sourceTower.hp + dealt * totalLifesteal);
        }
        const singleImpact =
          proj.impactParticleId ??
          (PARTICLES_CATALOG[`impact_${proj.kind}`] ? `impact_${proj.kind}` : 'impact_standard');
        emitSimParticles(s, singleImpact, hitEnemy.row, hitEnemy.col);
      }

      if (didCrit) {
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'text',
          row: hitEnemy.row,
          col: hitEnemy.col,
          timer: 0,
          duration: 0.45,
          text: '¡CRÍTICO!',
          color: '#FBBF24',
        });
      }

      if (proj.knockbackCols && hitEnemy.hp > 0) {
        const resist = getEnemyDef(hitEnemy.type)?.behavior?.knockbackResist ?? 0;
        const push = Math.max(0, proj.knockbackCols * (1 - Math.min(1, resist)));
        if (push > 0) {
          hitEnemy.col = Math.min(s.gridCols - 0.15, hitEnemy.col + push);
        }
      }
      if (proj.stunDuration && hitEnemy.hp > 0) {
        if (!hasEnemyImmunity(hitEnemy.type, 'stun', hitEnemy)) {
          hitEnemy.stunTimer = Math.max(hitEnemy.stunTimer ?? 0, proj.stunDuration);
        }
      }
      if (proj.silenceDuration && hitEnemy.hp > 0) {
        if (!hasEnemyImmunity(hitEnemy.type, 'silence', hitEnemy)) {
          hitEnemy.silenceTimer = Math.max(hitEnemy.silenceTimer ?? 0, proj.silenceDuration);
        }
      }

      if (proj.slowFactor && proj.slowDuration) {
        if (hasEnemyImmunity(hitEnemy.type, 'slow', hitEnemy)) {
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: hitEnemy.row,
            col: hitEnemy.col,
            timer: 0,
            duration: 0.45,
            text: 'INMUNE',
            color: '#FB7185',
          });
        } else {
          hitEnemy.slowFactor = Math.max(hitEnemy.slowFactor, proj.slowFactor);
          hitEnemy.slowTimer = Math.max(hitEnemy.slowTimer, proj.slowDuration);
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'cryo_hit',
            row: hitEnemy.row,
            col: hitEnemy.col,
            timer: 0,
            duration: 0.25,
          });
        }
      }
      if (proj.burnDps && proj.burnDuration) {
        if (hasEnemyImmunity(hitEnemy.type, 'burn', hitEnemy)) {
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: hitEnemy.row,
            col: hitEnemy.col,
            timer: 0,
            duration: 0.45,
            text: 'INMUNE',
            color: '#FB7185',
          });
        } else {
          hitEnemy.burnDps = Math.max(hitEnemy.burnDps, proj.burnDps);
          hitEnemy.burnTimer = Math.max(hitEnemy.burnTimer, proj.burnDuration);
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'burn_hit',
            row: hitEnemy.row,
            col: hitEnemy.col,
            timer: 0,
            duration: 0.25,
          });
        }
      }

      if (proj.chainBounceCount && proj.chainBounceCount > 0) {
        const range = proj.chainBounceRangeCols ?? 2.2;
        const decay = proj.chainDamageDecay ?? 0.72;
        const visited = new Set<string>([hitEnemy.id]);
        let currentSource: Enemy = hitEnemy;
        let chainDmg = rollDmg * decay;
        for (let b = 0; b < proj.chainBounceCount; b++) {
          const nextTarget = s.enemies
            .filter(
              (cand) =>
                !visited.has(cand.id) &&
                isEnemyTargetable(cand) &&
                Math.hypot(cand.col - currentSource.col, cand.row - currentSource.row) <= range
            )
            .sort(
              (a, bCand) =>
                Math.hypot(a.col - currentSource.col, a.row - currentSource.row) -
                Math.hypot(bCand.col - currentSource.col, bCand.row - currentSource.row)
            )[0];
          if (!nextTarget) break;
          visited.add(nextTarget.id);
          applyMitigatedEnemyDamage(s, nextTarget, chainDmg, proj.sourceTowerId, true, {
            damageType: proj.damageType,
            armorPenetration: proj.armorPenetration,
          });
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'beam',
            row: currentSource.row,
            col: currentSource.col,
            targetRow: nextTarget.row,
            targetCol: nextTarget.col,
            timer: 0,
            duration: 0.22,
            color: '#38BDF8',
            lineWidth: 2.5,
          });
          if (proj.impactParticleId) {
            emitSimParticles(s, proj.impactParticleId, nextTarget.row, nextTarget.col);
          }
          currentSource = nextTarget;
          chainDmg *= decay;
        }
      }

      if (proj.effectIds && proj.effectIds.length > 0) {
        triggerProjectileDeclarativeHits(
          s,
          proj.effectIds,
          hitEnemy,
          nextSimId,
          hasEnemyImmunity,
          sourceTower
        );
      }

      if (proj.remainingPierce !== undefined && proj.remainingPierce > 0) {
        proj.remainingPierce -= 1;
        proj.hitEnemyIds = proj.hitEnemyIds ?? [];
        proj.hitEnemyIds.push(hitEnemy.id);
        if (proj.remainingPierce <= 0 && !proj.passThrough) {
          projectilesToRemove.add(proj.id);
        }
      } else if (proj.passThrough) {
        proj.hitEnemyIds = proj.hitEnemyIds ?? [];
        proj.hitEnemyIds.push(hitEnemy.id);
      } else {
        projectilesToRemove.add(proj.id);
      }
    }
  }
  s.projectiles = s.projectiles.filter((p) => !projectilesToRemove.has(p.id));

  // 8. Update enemies declaratively using EnemyDefinition.behavior & EFFECTS_CATALOG
  const speedBoost049 = EFFECTS_CATALOG.resurrection_049?.speedMultiplier ?? 1.2;
  const moveCells173 = EFFECTS_CATALOG.blink_173?.moveCells ?? 2;
  const moveInterval173 = EFFECTS_CATALOG.blink_173?.moveIntervalSec ?? 4.0;
  const pullInterval012 = EFFECTS_CATALOG.lure_012?.pullIntervalSec ?? 5.0;
  const healPct012 = EFFECTS_CATALOG.lure_012?.healPercent ?? 0.2;
  const stunDur096 = EFFECTS_CATALOG.scream_096?.stunDurationSec ?? 2.8;
  const spawnInterval019 = EFFECTS_CATALOG.vase_019?.spawnIntervalSec ?? 3.0;
  const screamInt066 = EFFECTS_CATALOG.scream_066?.screamIntervalSec ?? 10.0;
  const deafDur066 = EFFECTS_CATALOG.scream_066?.deafDurationSec ?? 6.0;
  const radioDeaf066 = EFFECTS_CATALOG.scream_066?.radioReducedSec ?? 3.0;
  const pocketCfg = EFFECTS_CATALOG.pocket_106;

  const convertedSpawns: Array<{
    row: number;
    col: number;
    type: EnemyType;
    hpMultiplier?: number;
    particlePresetId?: string;
  }> = [];
  const vaseSpawns: Array<{ row: number; col: number }> = [];

  for (const enemy of s.enemies) {
    if (enemy.hp <= 0) continue;
    const def = getEnemyDef(enemy.type);
    const behavior = def?.behavior;

    enemy.animPhase += dt;
    if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4);
    if (behavior?.regenHpPerSec && enemy.hp < enemy.maxHp) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + behavior.regenHpPerSec * dt);
    }
    if (behavior?.shieldRegenPerSec && behavior.initialShieldHp) {
      enemy.shieldHp = Math.min(
        behavior.initialShieldHp,
        (enemy.shieldHp ?? 0) + behavior.shieldRegenPerSec * dt
      );
      if (!enemy.shieldColor && behavior.shieldColor) enemy.shieldColor = behavior.shieldColor;
    }
    if (def?.particles?.trail && enemy.skyOffsetRows <= 0.3) {
      enemy.trailParticleTimer = (enemy.trailParticleTimer ?? 0) - dt;
      if (enemy.trailParticleTimer <= 0) {
        enemy.trailParticleTimer = def.particles.trailIntervalSec ?? 0.25;
        emitSimParticles(s, def.particles.trail, enemy.row, enemy.col);
      }
    }
    if (enemy.slowTimer > 0) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
      if (enemy.slowTimer === 0) enemy.slowFactor = 0;
    }
    if (enemy.burnTimer > 0) {
      applyMitigatedEnemyDamage(s, enemy, enemy.burnDps * dt, undefined, false);
      enemy.burnTimer = Math.max(0, enemy.burnTimer - dt);
    }
    if (enemy.hp <= 0) continue;

    // Sky fall animation
    if (behavior?.spawnRule?.mode === 'sky' && enemy.skyOffsetRows > 0) {
      enemy.skyOffsetRows = Math.max(0, enemy.skyOffsetRows - dt * 4.5);
      continue;
    }

    // Apply Tile Modifiers under enemy
    let tileSlowMult = 1;
    let tileSpeedBoostMult = 1;
    if (s.tileModifiers.length > 0) {
      const tileMods = getTileModifiersAt(s, enemy.row, enemy.col);
      for (const tm of tileMods) {
        if (tm.kind === 'damage_enemy') {
          applyMitigatedEnemyDamage(s, enemy, (tm.value ?? 18) * dt, undefined, false);
        } else if (tm.kind === 'slow_enemy') {
          tileSlowMult *= Math.max(0.2, 1 - (tm.value ?? 0.35));
        } else if (tm.kind === 'speed_enemy') {
          tileSpeedBoostMult *= tm.value ?? 1.4;
        } else if (tm.kind === 'heal_enemy' && enemy.hp < enemy.maxHp) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + (tm.value ?? 18) * dt);
        } else if (tm.kind === 'apply_effect' && tm.appliesEffectId && (tm.targetSide ?? 'enemies') !== 'towers') {
          const fx = EFFECTS_CATALOG[tm.appliesEffectId];
          if (fx && !enemy.activeEffects?.[fx.id]) {
            applyDeclarativeEffectToEnemy(s, fx, enemy, fx.durationSec ?? 0.5, nextSimId, false, hasEnemyImmunity);
          }
        }
      }
      if (enemy.hp <= 0) continue;
    }

    // Stunned by declarative effect
    if ((enemy.stunTimer ?? 0) > 0) {
      enemy.isAttacking = false;
      continue;
    }

    const isSilenced = (enemy.silenceTimer ?? 0) > 0;

    // Door Controller (SCP-079)
    if (behavior?.doorController && !isSilenced) {
      if (!s.doorsSpawned079) {
        s.doorsSpawned079 = true;
        const doorCount = EFFECTS_CATALOG[behavior.doorController.effectId]?.doorCount ?? 5;
        s.doors079.push(...spawnDoors079(s.doors079, doorCount, s.gridRows, s.gridCols));
        soundEngine.playDoor079();
      }
      if (
        !enemy.phase079Triggered &&
        enemy.hp < enemy.maxHp * behavior.doorController.triggerHpRatio
      ) {
        enemy.phase079Triggered = true;
        const extra = EFFECTS_CATALOG[behavior.doorController.effectId]?.extraDoorCount ?? 2;
        s.doors079.push(...spawnDoors079(s.doors079, extra, s.gridRows, s.gridCols));
        soundEngine.playDoor079();
        s.announcement = '¡SCP-079 al 25%: 2 puertas adicionales desplegadas (7 en total)!';
        s.announcementTimer = 4.2;
      }
      continue;
    }

    // Sky Pull (SCP-012)
    if (behavior?.skyPull && !isSilenced) {
      enemy.pullTimer -= dt;
      if (enemy.pullTimer <= 0) {
        enemy.pullTimer = pullInterval012;
        const scpCol = Math.min(s.gridCols - 1, Math.max(0, Math.round(enemy.col)));
        const personalOnRow = s.towers
          .filter(
            (t) =>
              enemyOccupiesRow(enemy, t.row) &&
              t.category === 'personal' &&
              t.hp > 0 &&
              !towersToRemove.has(t.id)
          )
          .sort((a, b) => Math.abs(a.col - scpCol) - Math.abs(b.col - scpCol));

        const targetPersonal = personalOnRow[0];
        if (targetPersonal) {
          soundEngine.playPull012();
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'pull_beam',
            row: enemy.row,
            col: enemy.col,
            targetRow: targetPersonal.row,
            targetCol: targetPersonal.col,
            timer: 0,
            duration: 0.45,
          });

          const nextCol =
            targetPersonal.col === scpCol
              ? scpCol
              : targetPersonal.col + Math.sign(scpCol - targetPersonal.col);

          if (nextCol === scpCol) {
            towersToRemove.add(targetPersonal.id);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * healPct012);
            s.effects.push({
              id: nextSimId('fx'),
              kind: 'heal_ring',
              row: enemy.row,
              col: enemy.col,
              timer: 0,
              duration: 0.55,
            });
            s.effects.push({
              id: nextSimId('fx'),
              kind: 'text',
              row: enemy.row,
              col: enemy.col,
              timer: 0,
              duration: 1.0,
              text: '+20% HP',
              color: '#4ADE80',
            });
          } else {
            const occupant = s.towers.find(
              (t) =>
                t.id !== targetPersonal.id &&
                t.row === targetPersonal.row &&
                t.col === nextCol &&
                !towersToRemove.has(t.id)
            );
            if (occupant) {
              occupant.col = targetPersonal.col;
            }
            targetPersonal.col = nextCol;
            s.effects.push({
              id: nextSimId('fx'),
              kind: 'text',
              row: targetPersonal.row,
              col: nextCol,
              timer: 0,
              duration: 0.75,
              text: '¡ATRAÍDO!',
              color: '#F87171',
            });
          }
        }
      }
      continue;
    }

    // Vase Spawner (SCP-019)
    if (behavior?.vaseSpawner && !isSilenced) {
      enemy.vaseSpawnTimer -= dt;
      if (enemy.vaseSpawnTimer <= 0) {
        enemy.vaseSpawnTimer = spawnInterval019;
        vaseSpawns.push({ row: enemy.row, col: Math.max(0.5, enemy.col - 0.25) });
      }
      continue;
    }

    // Scream 5x5 Area (SCP-066)
    if (behavior?.screamArea && !isSilenced) {
      enemy.screamTimer066 -= dt;
      if (enemy.screamTimer066 <= 0) {
        enemy.screamTimer066 = screamInt066;
        const screamRad066 = EFFECTS_CATALOG.scream_066?.radiusCells ?? 2;
        const centerCol = Math.min(s.gridCols - 1, Math.max(0, Math.round(enemy.col)));
        soundEngine.playScream066();
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'scream_wave_066',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 0.7,
        });
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'text',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 1.0,
          text: '¡GRITO 5x5!',
          color: '#FB7185',
        });
        for (const t of s.towers) {
          if (
            !t.immuneToPsych &&
            Math.abs(t.row - enemy.row) <= screamRad066 &&
            Math.abs(t.col - centerCol) <= screamRad066
          ) {
            const dur = t.radioProtected ? radioDeaf066 : deafDur066;
            t.deafTimer = Math.max(t.deafTimer, dur);
          }
        }
      }
    }

    // Enrage Convulse & Sprint (SCP-096)
    if (behavior?.enrage096) {
      const cfg096 = behavior.enrage096;
      const defaultCols = GAME_CONFIG.grid.cols;
      const distFromRight = Math.max(0.8, defaultCols - cfg096.triggerCol);
      const effectiveTriggerCol =
        s.gridCols === defaultCols
          ? cfg096.triggerCol
          : Math.max(0.5, s.gridCols - distFromRight);
      if (enemy.phase096 === 'calm' && enemy.col <= effectiveTriggerCol && !isSilenced) {
        enemy.phase096 = 'convulsing';
        enemy.convulseTimer = cfg096.convulseSec;
        enemy.isAttacking = false;
        soundEngine.playScream096();

        for (const t of s.towers) {
          if (
            Math.abs(t.row - enemy.row) <= cfg096.stunRadiusRow &&
            Math.abs(t.col - enemy.col) <= cfg096.stunRadiusCol
          ) {
            t.stunTimer = Math.max(t.stunTimer, stunDur096);
          }
        }
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'stun_wave',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 0.65,
        });
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'text',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 1.0,
          text: '¡GRITO!',
          color: '#EF4444',
        });
        s.announcement = '¡SCP-096 convulsiona y aturde torres antes de correr!';
        s.announcementTimer = 3.6;
        continue;
      }

      if (enemy.phase096 === 'convulsing') {
        enemy.convulseTimer -= dt;
        if (enemy.convulseTimer <= 0) {
          const enragedBaseHp = getEnemyDef(cfg096.enragedHpFrom)?.hp ?? 140;
          enemy.phase096 = 'enraged';
          enemy.maxHp = enragedBaseHp;
          enemy.hp = Math.min(enemy.hp, enragedBaseHp);
          enemy.baseSpeed = cfg096.enragedSpeed;
          enemy.currentSpeed = cfg096.enragedSpeed;
          enemy.dps = cfg096.enragedDps;
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: enemy.row,
            col: enemy.col,
            timer: 0,
            duration: 0.9,
            text: '¡FURIA!',
            color: '#EF4444',
          });
        }
        continue;
      }
    }

    // Accelerating speed (SCP-018 bounce)
    if (behavior?.bounceAccel && !isSilenced) {
      const accel = EFFECTS_CATALOG.bounce_018?.accelPerSec ?? behavior.bounceAccel.accelPerSec;
      const maxSpd = EFFECTS_CATALOG.bounce_018?.maxSpeed ?? behavior.bounceAccel.maxSpeed;
      enemy.currentSpeed = Math.min(maxSpd, enemy.currentSpeed + accel * dt);
    }

    // Generic programmable Enrage on low HP / column
    if (behavior?.enrageOnLowHp && !isSilenced) {
      const cfgE = behavior.enrageOnLowHp;
      if (enemy.genericEnrageConvulseTimer && enemy.genericEnrageConvulseTimer > 0) {
        enemy.genericEnrageConvulseTimer -= dt;
        if (enemy.genericEnrageConvulseTimer <= 0) {
          if (cfgE.newHp) {
            enemy.maxHp = cfgE.newHp;
            enemy.hp = Math.min(enemy.hp, cfgE.newHp);
          }
          if (cfgE.speedMultiplier) {
            enemy.baseSpeed *= cfgE.speedMultiplier;
            enemy.currentSpeed *= cfgE.speedMultiplier;
          }
          if (cfgE.dpsMultiplier) {
            enemy.dps *= cfgE.dpsMultiplier;
          }
          if (cfgE.badge) {
            enemy.customBadge = {
              label: cfgE.badge,
              color: cfgE.color ?? '#EF4444',
              textColor: cfgE.color ?? '#FCA5A5',
            };
          }
          if (cfgE.color) enemy.customTintColor = cfgE.color;
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: enemy.row,
            col: enemy.col,
            timer: 0,
            duration: 0.9,
            text: cfgE.badge ?? '¡FURIA!',
            color: cfgE.color ?? '#EF4444',
          });
        }
        continue;
      } else if (!enemy.genericEnrageTriggered) {
        const hpHit = enemy.hp / Math.max(1, enemy.maxHp) <= cfgE.hpRatio;
        const colHit = cfgE.triggerCol === undefined || enemy.col <= cfgE.triggerCol;
        if (hpHit && colHit) {
          enemy.genericEnrageTriggered = true;
          if (cfgE.stunRadiusRow !== undefined || cfgE.stunRadiusCol !== undefined || cfgE.stunSec) {
            const radR = cfgE.stunRadiusRow ?? 1;
            const radC = cfgE.stunRadiusCol ?? 1;
            const sDur = cfgE.stunSec ?? 2.2;
            for (const t of s.towers) {
              if (!t.immuneToPsych && Math.abs(t.row - enemy.row) <= radR && Math.abs(t.col - enemy.col) <= radC) {
                t.stunTimer = Math.max(t.stunTimer, sDur);
              }
            }
            s.effects.push({
              id: nextSimId('fx'),
              kind: 'stun_wave',
              row: enemy.row,
              col: enemy.col,
              timer: 0,
              duration: 0.65,
            });
          }
          if (cfgE.particlePresetId) {
            emitSimParticles(s, cfgE.particlePresetId, enemy.row, enemy.col);
          }
          if (cfgE.sound) {
            playEffectSound(cfgE.sound as EffectSoundKey);
          }
          if (cfgE.convulseSec && cfgE.convulseSec > 0) {
            enemy.genericEnrageConvulseTimer = cfgE.convulseSec;
            enemy.isAttacking = false;
            continue;
          } else {
            if (cfgE.newHp) {
              enemy.maxHp = cfgE.newHp;
              enemy.hp = Math.min(enemy.hp, cfgE.newHp);
            }
            if (cfgE.speedMultiplier) {
              enemy.baseSpeed *= cfgE.speedMultiplier;
              enemy.currentSpeed *= cfgE.speedMultiplier;
            }
            if (cfgE.dpsMultiplier) {
              enemy.dps *= cfgE.dpsMultiplier;
            }
            if (cfgE.badge) {
              enemy.customBadge = {
                label: cfgE.badge,
                color: cfgE.color ?? '#EF4444',
                textColor: cfgE.color ?? '#FCA5A5',
              };
            }
            if (cfgE.color) enemy.customTintColor = cfgE.color;
          }
        }
      }
    }

    // Generic periodic lane hop
    if (behavior?.laneHopIntervalSec && !isSilenced && !enemy.isAttacking) {
      enemy.laneHopTimer = (enemy.laneHopTimer ?? behavior.laneHopIntervalSec) - dt;
      if (enemy.laneHopTimer <= 0) {
        enemy.laneHopTimer = behavior.laneHopIntervalSec;
        const span = enemy.occupiedRows.length;
        const candidates = [-1, 1].filter((delta) => {
          const nextMin = Math.min(...enemy.occupiedRows) + delta;
          const nextMax = Math.max(...enemy.occupiedRows) + delta;
          return nextMin >= 0 && nextMax < s.gridRows;
        });
        if (candidates.length > 0) {
          let chosenDelta = candidates[Math.floor(Math.random() * candidates.length)];
          if (behavior.laneHopMode === 'toward_towers' || behavior.laneHopMode === 'avoid_towers') {
            const scoreRow = (delta: number) => {
              const targetR = enemy.row + delta;
              return s.towers.filter(
                (t) => !towersToRemove.has(t.id) && t.row === targetR && t.col <= enemy.col
              ).length;
            };
            candidates.sort((a, b) =>
              behavior.laneHopMode === 'toward_towers'
                ? scoreRow(b) - scoreRow(a)
                : scoreRow(a) - scoreRow(b)
            );
            chosenDelta = candidates[0];
          }
          enemy.row += chosenDelta;
          enemy.occupiedRows = Array.from({ length: span }, (_, idx) => enemy.row + idx);
        }
      }
    }

    // Generic periodic summon
    if (behavior?.summonPeriodic && !isSilenced) {
      const spCfg = behavior.summonPeriodic;
      enemy.summonPeriodicTimer = (enemy.summonPeriodicTimer ?? spCfg.intervalSec) - dt;
      if (enemy.summonPeriodicTimer <= 0) {
        enemy.summonPeriodicTimer = spCfg.intervalSec;
        const aliveCount = s.enemies.filter((e) => e.type === spCfg.type && e.hp > 0).length;
        const maxAlive = spCfg.maxAlive ?? 99;
        const cnt = Math.min(spCfg.count ?? 1, Math.max(0, maxAlive - aliveCount));
        if (cnt > 0) {
          if (spCfg.particlePresetId) {
            emitSimParticles(s, spCfg.particlePresetId, enemy.row, enemy.col);
          }
          if (spCfg.sound) {
            playEffectSound(spCfg.sound as EffectSoundKey);
          }
          for (let i = 0; i < cnt; i++) {
            const spread = spCfg.rowSpread ?? 0;
            const rOff = spread > 0 ? Math.floor(Math.random() * (spread * 2 + 1)) - spread : 0;
            const targetR = Math.max(0, Math.min(s.gridRows - 1, enemy.row + rOff));
            const spawnC = Math.max(
              0.3,
              Math.min(s.gridCols - 0.15, enemy.col + (spCfg.offsetCol ?? -0.25) - i * 0.15)
            );
            spawnEnemyAt(s, spCfg.type, { row: targetR, occupiedRows: [targetR] }, spawnC, undefined, {
              hpMultiplier: spCfg.hpMultiplier,
              speedMultiplier: spCfg.speedMultiplier,
              dpsMultiplier: spCfg.dpsMultiplier,
            });
          }
        }
      }
    }

    // Generic ranged attack against towers
    if (behavior?.rangedAttack && !isSilenced) {
      const ra = behavior.rangedAttack;
      enemy.rangedAttackTimer = (enemy.rangedAttackTimer ?? ra.intervalSec) - dt;
      if (enemy.rangedAttackTimer <= 0) {
        const span = ra.rowSpan ?? 0;
        const targets = s.towers
          .filter(
            (t) =>
              !towersToRemove.has(t.id) &&
              t.hp > 0 &&
              enemy.occupiedRows.some((r) => Math.abs(t.row - r) <= span) &&
              t.col <= enemy.col &&
              enemy.col - t.col <= ra.rangeCols
          )
          .sort((a, b) => b.col - a.col);
        const target = targets[0];
        if (target) {
          enemy.rangedAttackTimer = ra.intervalSec;
          const rDmg = ra.damage * (enemy.customDamageMult ?? 1) * gmEnemyDamage;
          if (ra.splashRadius) {
            for (const ally of s.towers) {
              if (
                !towersToRemove.has(ally.id) &&
                ally.hp > 0 &&
                Math.abs(ally.row - target.row) <= 1 &&
                Math.abs(ally.col - target.col) <= ra.splashRadius
              ) {
                applyMitigatedTowerDamage(s, ally, rDmg, towersToRemove, enemy, true);
                if (ra.stunSec && !ally.immuneToPsych) {
                  ally.stunTimer = Math.max(ally.stunTimer, ra.stunSec);
                }
                if (ally.hp <= 0) towersToRemove.add(ally.id);
              }
            }
          } else {
            applyMitigatedTowerDamage(s, target, rDmg, towersToRemove, enemy, true);
            if (ra.stunSec && !target.immuneToPsych) {
              target.stunTimer = Math.max(target.stunTimer, ra.stunSec);
            }
            if (target.hp <= 0) towersToRemove.add(target.id);
          }
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'beam',
            row: enemy.row,
            col: enemy.col,
            targetRow: target.row,
            targetCol: target.col,
            timer: 0,
            duration: 0.26,
            color: ra.beamColor ?? '#F43F5E',
            lineWidth: 3,
          });
          emitSimParticles(s, ra.particlePresetId ?? 'attack_scp_ranged', target.row, target.col);
          if (ra.sound) {
            playEffectSound(ra.sound as EffectSoundKey);
          }
        } else {
          enemy.rangedAttackTimer = Math.min(0.25, ra.intervalSec);
        }
      }
    }

    // Find all blocking towers across all occupiedRows (important for 2-lane SCP-682!)
    const blockers = s.towers.filter((t) => {
      if (
        towersToRemove.has(t.id) ||
        !enemyOccupiesRow(enemy, t.row) ||
        t.suppressed ||
        t.deafTimer > 0 ||
        t.hp <= 0
      ) {
        return false;
      }
      const tDef = TOWER_CATALOG.find((d) => d.type === t.type);
      if (tDef?.passThrough) return false;
      return enemy.col - t.col <= 0.44 && enemy.col - t.col >= -0.25;
    });

    const hpMissingRatio = Math.max(0, Math.min(1, 1 - enemy.hp / Math.max(1, enemy.maxHp)));
    const hpLowSpeedScale = behavior?.speedScaleAsHpDrops
      ? 1 + behavior.speedScaleAsHpDrops.maxBonusMultiplier * hpMissingRatio
      : 1;

    const speedMult =
      (enemy.slowTimer > 0 ? 1 - enemy.slowFactor : 1) *
      (enemy.customSpeedMult ?? 1) *
      hpLowSpeedScale *
      gmEnemySpeed *
      tileSlowMult *
      tileSpeedBoostMult;

    const blockingObstacle =
      blockers.length === 0
        ? s.obstacles.find(
            (ob) =>
              ob.blocksEnemies &&
              enemyOccupiesRow(enemy, ob.row) &&
              enemy.col - ob.col <= 0.44 &&
              enemy.col - ob.col >= -0.25
          )
        : undefined;

    if (blockingObstacle) {
      enemy.isAttacking = true;
      if (blockingObstacle.destructible) {
        const dmgMult = (enemy.customDamageMult ?? 1) * gmEnemyDamage;
        blockingObstacle.hp -= enemy.dps * speedMult * dmgMult * dt;
        blockingObstacle.hitFlash = Math.max(blockingObstacle.hitFlash, 0.25);
        if (blockingObstacle.hp <= 0) {
          destroyBoardObstacleInSim(s, blockingObstacle, true, true);
        }
      }
    } else if (blockers.length > 0) {
      const primaryBlocker = blockers[0];
      const enemyAllEffects = [...(def?.effects ?? []), ...(enemy.extraEffects ?? [])];
      triggerDeclarativeHooks(
        s,
        'on_attack',
        'enemy',
        enemy,
        enemyAllEffects,
        towersToRemove,
        declarativeSpawns,
        nextSimId,
        undefined,
        primaryBlocker,
        hasEnemyImmunity
      );

      if (behavior?.instakillTower) {
        primaryBlocker.hp = 0;
        primaryBlocker.shieldHp = 0;
        towersToRemove.add(primaryBlocker.id);
        if (def?.particles?.onAttack) {
          emitSimParticles(s, def.particles.onAttack, primaryBlocker.row, primaryBlocker.col);
        }
        if (def?.particles?.onKill) {
          emitSimParticles(s, def.particles.onKill, primaryBlocker.row, primaryBlocker.col);
        }
        triggerDeclarativeHooks(
          s,
          'on_kill',
          'enemy',
          enemy,
          enemyAllEffects,
          towersToRemove,
          declarativeSpawns,
          nextSimId,
          undefined,
          primaryBlocker,
          hasEnemyImmunity
        );

        if (behavior.onKillConvertTo) {
          convertedSpawns.push({
            row: primaryBlocker.row,
            col: primaryBlocker.col,
            type: behavior.onKillConvertTo.type,
            hpMultiplier: behavior.onKillConvertTo.hpMultiplier,
            particlePresetId: behavior.onKillConvertTo.particlePresetId,
          });
        }

        if (behavior.disappearOnHit) {
          soundEngine.playBounceImpact018();
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'bounce_impact',
            row: primaryBlocker.row,
            col: primaryBlocker.col,
            timer: 0,
            duration: 0.45,
          });
          emitSimParticles(s, 'bounce_impact_018', primaryBlocker.row, primaryBlocker.col);
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: primaryBlocker.row,
            col: primaryBlocker.col,
            timer: 0,
            duration: 0.85,
            text: '¡IMPACTO 018!',
            color: '#EF4444',
          });
          enemy.hp = 0;
          enemy.hasRevived = true;
        } else if (behavior.pocketDimension) {
          soundEngine.playPocket106();
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'pocket_portal',
            row: primaryBlocker.row,
            col: primaryBlocker.col,
            timer: 0,
            duration: 0.65,
          });
          emitSimParticles(s, 'pocket_portal', primaryBlocker.row, primaryBlocker.col);
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: primaryBlocker.row,
            col: primaryBlocker.col,
            timer: 0,
            duration: 0.9,
            text: 'INSTAKILL',
            color: '#F59E0B',
          });

          if (primaryBlocker.category === 'personal') {
            const chance = pocketCfg?.reviveChance ?? 0.1;
            if (Math.random() < chance) {
              const minD = pocketCfg?.minDelaySec ?? 5;
              const maxD = pocketCfg?.maxDelaySec ?? 10;
              const pct = pocketCfg?.reviveHpPercent ?? 0.2;
              s.pocketRescues.push({
                id: nextSimId('pocket'),
                towerType: primaryBlocker.type,
                category: primaryBlocker.category,
                maxHp: primaryBlocker.maxHp,
                hp: Math.max(1, Math.round(primaryBlocker.maxHp * pct)),
                row: primaryBlocker.row,
                col: primaryBlocker.col,
                timer: minD + Math.random() * (maxD - minD),
              });
            }
          }
        }
      } else {
        enemy.isAttacking = true;
        const dmgMult = (enemy.customDamageMult ?? 1) * gmEnemyDamage;
        const enemyLifesteal = enemy.customLifesteal ?? 0;
        const enemyThorns = enemy.customThornsDps ?? 0;

        for (const blocker of blockers) {
          const swingDmg = enemy.dps * speedMult * dmgMult * dt;
          applyMitigatedTowerDamage(s, blocker, swingDmg, towersToRemove, enemy, true);
          if (enemyLifesteal > 0 && swingDmg > 0) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + swingDmg * enemyLifesteal);
          }
          if (enemyThorns > 0) {
            applyMitigatedTowerDamage(s, blocker, enemyThorns * dt, towersToRemove, enemy, false);
          }

          const blockerDef = TOWER_CATALOG.find((d) => d.type === blocker.type);
          const totalBlockerThorns =
            (blockerDef?.thornsDps ?? 0) + (blocker.customThornsDps ?? 0);
          if (totalBlockerThorns > 0 && blocker.stunTimer <= 0 && blocker.deafTimer <= 0) {
            applyMitigatedEnemyDamage(s, enemy, totalBlockerThorns * dt, blocker.id, false);
          }

          if (blocker.hp <= 0) {
            towersToRemove.add(blocker.id);
            if (def?.particles?.onKill) {
              emitSimParticles(s, def.particles.onKill, blocker.row, blocker.col);
            }
            triggerDeclarativeHooks(
              s,
              'on_kill',
              'enemy',
              enemy,
              enemyAllEffects,
              towersToRemove,
              declarativeSpawns,
              nextSimId,
              undefined,
              blocker,
              hasEnemyImmunity
            );
            if (behavior?.onKillConvertTo) {
              convertedSpawns.push({
                row: blocker.row,
                col: blocker.col,
                type: behavior.onKillConvertTo.type,
                hpMultiplier: behavior.onKillConvertTo.hpMultiplier,
                particlePresetId: behavior.onKillConvertTo.particlePresetId,
              });
            } else if (enemy.type === 'scp_049') {
              convertedSpawns.push({
                row: blocker.row,
                col: blocker.col,
                type: 'scp_049_2',
              });
            }
          }
        }
      }
    } else {
      enemy.isAttacking = false;
      if (behavior?.blinkJump && !isSilenced) {
        const partner = behavior.blinkJump.paranoiaPartner;
        const hasPartnerOnRow = partner
          ? s.enemies.some(
              (other) =>
                other.type === partner &&
                other.hp > 0 &&
                other.occupiedRows.some((r) => enemyOccupiesRow(enemy, r))
            )
          : false;
        enemy.blinkMoveTimer -= dt;
        if (enemy.blinkMoveTimer <= 0) {
          enemy.blinkMoveTimer = hasPartnerOnRow
            ? behavior.blinkJump.paranoiaIntervalSec ?? 5.0
            : behavior.blinkJump.intervalSec ?? moveInterval173;
          const jumpDist =
            hasPartnerOnRow || enemy.slowTimer > 0
              ? behavior.blinkJump.paranoiaCells ?? 1
              : behavior.blinkJump.cells ?? moveCells173;
          const desiredCol = enemy.col - jumpDist;

          const pathBlocker = s.towers
            .filter((t) => {
              if (
                towersToRemove.has(t.id) ||
                !enemyOccupiesRow(enemy, t.row) ||
                t.suppressed ||
                t.deafTimer > 0 ||
                t.hp <= 0
              ) {
                return false;
              }
              const tDef = TOWER_CATALOG.find((d) => d.type === t.type);
              if (tDef?.passThrough) return false;
              return t.col < enemy.col && t.col >= desiredCol - 0.35;
            })
            .sort((a, b) => b.col - a.col)[0];

          if (pathBlocker) {
            enemy.col = pathBlocker.col + 0.36;
          } else {
            enemy.col = desiredCol;
          }
        }
      } else {
        const plagueMult = enemy.type === 'scp_008' && hasActive049 ? speedBoost049 : 1;
        const effectiveSpeed = behavior?.bounceAccel ? enemy.currentSpeed : enemy.baseSpeed;
        enemy.col -= effectiveSpeed * speedMult * plagueMult * dt;
      }
    }

    // Emergency Tesla Gates check (handles both 1-lane and 2-lane enemies & custom breachCol)
    const customBreachCol = s.victoryCondition?.breachCol;
    const gateTriggerCol = customBreachCol !== undefined ? customBreachCol + 0.15 : -0.15;
    const defeatCol = customBreachCol !== undefined ? customBreachCol : -0.3;
    if (enemy.col <= gateTriggerCol) {
      const enemyGates = enemy.occupiedRows
        .map((r) => s.gates[r])
        .filter((g): g is EmergencyGate => Boolean(g));
      const availableGate = enemyGates.find((g) => g.available && g.firingTimer === 0);
      const activeGate = enemyGates.find((g) => g.firingTimer > 0);

      if (availableGate) {
        availableGate.available = false;
        availableGate.firingTimer = gp.teslaGate.firingDurationSec;
        availableGate.sweepCol = 0;
        s.teslaGatesUsedCount += 1;
        soundEngine.playTesla();
        s.announcement = `Puerta Tesla de la fila ${availableGate.row + 1} activada.`;
        s.announcementTimer = 3.5;
      } else if (!activeGate && enemy.col <= defeatCol) {
        s.defeatReason = 'Un SCP cruzó la línea de contención sin puerta Tesla disponible.';
        finalizeObjectivesOnOutcome(s, false);
        soundEngine.playGameOver();
        return 'GAME_OVER';
      }
    }
  }

  // Spawn converted enemies from kills (SCP-049 or JSON behavior.onKillConvertTo)
  for (const conv of convertedSpawns) {
    spawnEnemyAt(
      s,
      conv.type,
      { row: conv.row, occupiedRows: [conv.row] },
      conv.col,
      undefined,
      conv.hpMultiplier ? { hpMultiplier: conv.hpMultiplier } : undefined
    );
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'revive_ring',
      row: conv.row,
      col: conv.col,
      timer: 0,
      duration: 0.6,
    });
    emitSimParticles(s, conv.particlePresetId ?? 'revive_plague', conv.row, conv.col);
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'text',
      row: conv.row,
      col: conv.col,
      timer: 0,
      duration: 0.95,
      text: getEnemyDef(conv.type)?.code ?? String(conv.type).toUpperCase(),
      color: '#4ADE80',
    });
    soundEngine.playRevive();
  }

  // Spawn declarative summons
  for (const ds of declarativeSpawns) {
    spawnEnemyAt(s, ds.type, { row: ds.row, occupiedRows: [ds.row] }, ds.col);
  }

  // Spawn SCP-019-2 from active SCP-019 vases
  if (vaseSpawns.length > 0) {
    soundEngine.playVaseSpawn();
    for (const vs of vaseSpawns) {
      spawnEnemyAt(s, 'scp_019_2', { row: vs.row, occupiedRows: [vs.row] }, vs.col);
    }
  }

  // 9. Emergency Tesla Gates sweep
  for (const gate of s.gates) {
    if (gate.firingTimer > 0) {
      gate.sweepCol += gp.teslaGate.sweepSpeedColsPerSec * dt;
      for (const enemy of s.enemies) {
        if (enemyOccupiesRow(enemy, gate.row) && enemy.col <= gate.sweepCol + 0.4) {
          enemy.hp = 0;
          enemy.shieldHp = 0;
          enemy.hasRevived = true;
        }
      }
      if (gate.sweepCol >= s.gridCols + 0.5) {
        gate.firingTimer = 0;
      }
    }
  }

  // 10. Remove dead towers & handle SCP-008/declarative extra life & on_death/on_kill hooks & clear SCP-079 doors on death
  const postDeathSpawns: DeclarativeSpawnRequest[] = [];
  if (towersToRemove.size > 0) {
    for (const t of s.towers) {
      if (towersToRemove.has(t.id)) {
        s.towersLostCount += 1;
        const tDef = getTowerDef(t.type);
        emitSimParticles(s, tDef?.particles?.onDeath ?? 'death_tower', t.row, t.col);
        if (tDef?.soundOnDeath) {
          playEffectSound(tDef.soundOnDeath as EffectSoundKey);
        }
        triggerDeclarativeHooks(
          s,
          'on_death',
          'tower',
          t,
          [...(tDef?.effects ?? []), ...(tDef?.onDeathEffects ?? [])],
          towersToRemove,
          postDeathSpawns,
          nextSimId,
          undefined,
          undefined,
          hasEnemyImmunity
        );
        if (tDef?.onDeathExplosionDamage) {
          const rad = tDef.onDeathExplosionRadius ?? 1.3;
          for (const enemy of s.enemies) {
            if (
              enemy.hp > 0 &&
              enemy.skyOffsetRows <= 0.3 &&
              enemy.occupiedRows.some((r) => Math.abs(r - t.row) <= 1) &&
              Math.abs(enemy.col - t.col) <= rad
            ) {
              applyMitigatedEnemyDamage(
                s,
                enemy,
                tDef.onDeathExplosionDamage,
                t.id,
                true,
                { damageType: 'explosion' }
              );
            }
          }
          emitSimParticles(s, 'explosion_mine', t.row, t.col);
          soundEngine.playExplosion();
        }
        if (tDef?.onDeathTriggerEventId) {
          const resolvedEv = resolveEventDefinition(tDef.onDeathTriggerEventId);
          if (resolvedEv) {
            executeLevelEvent(
              s,
              resolvedEv,
              nextSimId,
              spawnEnemyAt,
              hasEnemyImmunity,
              { row: t.row, col: t.col },
              EVENT_ENGINE_CALLBACKS
            );
          }
        }
      }
    }
    s.towers = s.towers.filter((t) => !towersToRemove.has(t.id));
  }

  const survivingEnemies: Enemy[] = [];
  for (const enemy of s.enemies) {
    if (enemy.hp <= 0) {
      if (enemy.type === 'scp_008' && hasActive049 && !enemy.hasRevived) {
        enemy.hasRevived = true;
        enemy.hp = enemy.maxHp;
        enemy.hitFlash = 1;
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'revive_ring',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 0.55,
        });
        emitSimParticles(s, 'revive_plague', enemy.row, enemy.col);
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'text',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 0.9,
          text: '2ª VIDA',
          color: '#4ADE80',
        });
        soundEngine.playRevive();
        survivingEnemies.push(enemy);
      } else if (enemy.extraLivesLeft && enemy.extraLivesLeft > 0) {
        enemy.extraLivesLeft -= 1;
        enemy.hasRevived = true;
        enemy.hp = Math.max(1, Math.round(enemy.maxHp * (enemy.extraReviveHpPercent ?? 1.0)));
        enemy.hitFlash = 1;
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'revive_ring',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 0.55,
        });
        emitSimParticles(s, 'revive_plague', enemy.row, enemy.col);
        s.effects.push({
          id: nextSimId('fx'),
          kind: 'text',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 0.9,
          text: '2ª VIDA',
          color: '#4ADE80',
        });
        soundEngine.playRevive();
        survivingEnemies.push(enemy);
      } else {
        const eDef = getEnemyDef(enemy.type);
        const eBehavior = eDef?.behavior;
        if (eBehavior?.rewardsEnergyOnKill) {
          s.energy += eBehavior.rewardsEnergyOnKill;
          if (s.rules?.energyCap !== undefined) {
            s.energy = Math.min(s.rules.energyCap, s.energy);
          }
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'text',
            row: enemy.row,
            col: enemy.col,
            timer: 0,
            duration: 0.85,
            text: `+${eBehavior.rewardsEnergyOnKill} EN`,
            color: '#FBBF24',
          });
        }
        emitSimParticles(s, eDef?.particles?.onDeath ?? 'death_scp', enemy.row, enemy.col);
        if (eDef?.soundOnDeath) {
          playEffectSound(eDef.soundOnDeath as EffectSoundKey);
        }
        const enemyAllEffects = [...(eDef?.effects ?? []), ...(enemy.extraEffects ?? [])];
        triggerDeclarativeHooks(
          s,
          'on_death',
          'enemy',
          enemy,
          enemyAllEffects,
          towersToRemove,
          postDeathSpawns,
          nextSimId,
          undefined,
          undefined,
          hasEnemyImmunity
        );

        if (eBehavior?.onDeathSplit) {
          const spl = eBehavior.onDeathSplit;
          const cnt = Math.max(1, spl.count);
          const spread = spl.spreadRows ?? 0;
          if (spl.particlePresetId) {
            emitSimParticles(s, spl.particlePresetId, enemy.row, enemy.col);
          }
          for (let i = 0; i < cnt; i++) {
            const offR = spread > 0 ? Math.floor(Math.random() * (spread * 2 + 1)) - spread : 0;
            const r = Math.max(0, Math.min(s.gridRows - 1, enemy.row + offR));
            const c = Math.max(0.2, Math.min(s.gridCols - 0.15, enemy.col + (i - (cnt - 1) / 2) * 0.18));
            spawnEnemyAt(
              s,
              spl.type,
              { row: r, occupiedRows: [r] },
              c,
              undefined,
              spl.hpMultiplier ? { hpMultiplier: spl.hpMultiplier } : undefined
            );
          }
        }

        if (eBehavior?.onDeathExplosion) {
          const exCfg = eBehavior.onDeathExplosion;
          const radR = exCfg.radiusRows ?? 1;
          for (const t of s.towers) {
            if (
              !towersToRemove.has(t.id) &&
              t.hp > 0 &&
              Math.abs(t.row - enemy.row) <= radR &&
              Math.abs(t.col - enemy.col) <= exCfg.radiusCols
            ) {
              applyMitigatedTowerDamage(s, t, exCfg.damage, towersToRemove, enemy, true);
              if (exCfg.stunSec && !t.immuneToPsych) {
                t.stunTimer = Math.max(t.stunTimer, exCfg.stunSec);
              }
              if (t.hp <= 0) towersToRemove.add(t.id);
            }
          }
          emitSimParticles(s, exCfg.particlePresetId ?? 'explosion_mine', enemy.row, enemy.col);
          playEffectSound((exCfg.sound ?? 'explosion') as EffectSoundKey);
        }

        if (eBehavior?.onDeathTriggerEventId) {
          const resolvedEv = resolveEventDefinition(eBehavior.onDeathTriggerEventId);
          if (resolvedEv) {
            executeLevelEvent(
              s,
              resolvedEv,
              nextSimId,
              spawnEnemyAt,
              hasEnemyImmunity,
              { row: enemy.row, col: enemy.col },
              EVENT_ENGINE_CALLBACKS
            );
          }
        }

        if (enemy.lastHitByTowerId) {
          const killerTower = s.towers.find((t) => t.id === enemy.lastHitByTowerId);
          if (killerTower) {
            const ktDef = getTowerDef(killerTower.type);
            triggerDeclarativeHooks(
              s,
              'on_kill',
              'tower',
              killerTower,
              ktDef?.effects,
              towersToRemove,
              postDeathSpawns,
              nextSimId,
              enemy,
              undefined,
              hasEnemyImmunity
            );
          }
        }
        if (enemy.type === 'scp_079') {
          s.doors079 = [];
          s.announcement = '¡SCP-079 neutralizado! Todas sus puertas se han desactivado.';
          s.announcementTimer = 4.0;
        }
        s.kills += 1;
        s.killsByEnemyType[enemy.type] = (s.killsByEnemyType[enemy.type] ?? 0) + 1;
      }
    } else {
      survivingEnemies.push(enemy);
    }
  }
  s.enemies = survivingEnemies;
  for (const ds of postDeathSpawns) {
    spawnEnemyAt(s, ds.type, { row: ds.row, occupiedRows: [ds.row] }, ds.col);
  }

  // 11. Energy Drops
  const autoCollectNow = Boolean(s.autoCollectEnergy || gmAutoCollect);
  const activeDrops: EnergyDrop[] = [];
  for (const drop of s.energyDrops) {
    drop.lifetime += dt;
    if (drop.yRow < drop.targetRow) {
      drop.yRow = Math.min(drop.targetRow, drop.yRow + (drop.fromSky ? 1.5 : 1.1) * dt);
    } else if (autoCollectNow && drop.lifetime >= 0.55) {
      s.energy += drop.amount;
      s.effects.push({
        id: nextSimId('fx'),
        kind: 'text',
        row: drop.yRow,
        col: drop.xCol,
        timer: 0,
        duration: 0.75,
        text: `+${drop.amount}`,
        color: '#FBBF24',
      });
      emitSimParticles(s, 'energy_collect', drop.yRow, drop.xCol);
      soundEngine.playCollect();
      continue;
    }
    if (drop.lifetime < drop.maxLifetime && !drop.collecting) {
      activeDrops.push(drop);
    }
  }
  s.energyDrops = activeDrops;

  if (s.rules?.energyCap !== undefined) {
    s.energy = Math.min(s.rules.energyCap, Math.max(0, s.energy));
  }

  // 12. Visual Effects & Reusable Particle System
  const cellSize = GAME_CONFIG.boardLayout.cellSize;
  s.effects = s.effects.filter((fx) => {
    fx.timer += dt;
    if (fx.kind === 'particle') {
      fx.col += ((fx.vx ?? 0) * dt) / cellSize;
      fx.row += ((fx.vy ?? 0) * dt) / cellSize;
    }
    return fx.timer < fx.duration;
  });
  s.particleSystem.step(dt, cellSize);

  // 13. Re-evaluate objectives & victory after tick movement/combat
  const lateObjRes = stepObjectives(s);
  if (lateObjRes.failedReason) {
    s.defeatReason = lateObjRes.failedReason;
    finalizeObjectivesOnOutcome(s, false);
    soundEngine.playGameOver();
    return 'GAME_OVER';
  }

  if (evaluateVictoryCondition(s)) {
    finalizeObjectivesOnOutcome(s, true);
    soundEngine.playVictory();
    return 'VICTORY';
  }

  return 'PLAYING';
}

function countFilteredVictoryKills(s: SimState, vc?: LevelVictoryCondition): number {
  const types = vc?.targetEnemyTypes;
  if (!types || types.length === 0) return s.kills;
  return types.reduce((acc, t) => acc + (s.killsByEnemyType[t] ?? 0), 0);
}

function evaluateVictoryCondition(s: SimState): boolean {
  const vc = s.victoryCondition;
  const mode = vc?.mode ?? 'standard';
  if (mode === 'endless') return false;

  if (!arePrimaryObjectivesCompleted(s)) return false;

  if (mode === 'survive_time') {
    const targetSec = vc?.targetSeconds ?? s.levelConfig.durationSeconds;
    if (s.levelTimer < targetSec) return false;
    return vc?.requireClearAfter ? s.enemies.length === 0 : true;
  }

  if (mode === 'kill_count') {
    const targetKills = vc?.targetKills ?? 25;
    if (countFilteredVictoryKills(s, vc) < targetKills) return false;
    return vc?.requireClearAfter ? s.enemies.length === 0 : true;
  }

  if (mode === 'survive_and_kill') {
    const targetSec = vc?.targetSeconds ?? s.levelConfig.durationSeconds;
    const targetKills = vc?.targetKills ?? 25;
    if (s.levelTimer < targetSec || countFilteredVictoryKills(s, vc) < targetKills) {
      return false;
    }
    return vc?.requireClearAfter ? s.enemies.length === 0 : true;
  }

  if (mode === 'destroy_obstacles') {
    const kind = vc?.obstacleKind;
    const remaining = s.obstacles.filter((o) => !kind || o.kind === kind).length;
    const destroyed = kind ? (s.obstaclesDestroyedByKind[kind] ?? 0) : s.obstacleDestroyedCount;
    const target = vc?.targetObstacles;
    const met =
      target !== undefined
        ? destroyed >= target
        : remaining === 0 && (destroyed > 0 || (s.levelConfig.obstacles ?? []).length === 0);
    if (!met) return false;
    return vc?.requireClearAfter ? s.enemies.length === 0 : true;
  }

  if (mode === 'objectives_only') {
    if (s.objectives.length > 0) {
      return arePrimaryObjectivesCompleted(s) && (!vc?.requireClearAfter || s.enemies.length === 0);
    }
    const allSpawned =
      s.spawnedIndices.size >= s.timeline.length && s.pendingStaggeredSpawns.length === 0;
    return allSpawned && s.enemies.length === 0;
  }

  if (mode === 'boss_hunt') {
    const bosses = vc?.targetEnemyTypes ?? [];
    const allSpawned =
      s.spawnedIndices.size >= s.timeline.length && s.pendingStaggeredSpawns.length === 0;
    if (bosses.length === 0) {
      return allSpawned && s.enemies.length === 0;
    }
    const bossAlive = s.enemies.some((e) => bosses.includes(e.type) && e.hp > 0);
    const bossKilled = bosses.some((b) => (s.killsByEnemyType[b] ?? 0) > 0);
    if (bossAlive || (!bossKilled && !allSpawned)) return false;
    return vc?.requireClearAfter ? s.enemies.length === 0 : true;
  }

  // 'standard'
  const allSpawned =
    s.spawnedIndices.size >= s.timeline.length && s.pendingStaggeredSpawns.length === 0;
  return allSpawned && s.enemies.length === 0;
}
