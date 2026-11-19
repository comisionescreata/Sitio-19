import {
  EFFECTS_CATALOG,
  ENEMY_CATALOG,
  GAME_CONFIG,
  TOWER_CATALOG,
} from '../data/scpCatalog';
import {
  BoardDesignConfig,
  Door079,
  EmergencyGate,
  EnergyDrop,
  Enemy,
  EnemyDefinition,
  EnemyImmunity,
  EnemyType,
  LevelConfig,
  LevelEvent,
  LevelSkyEnergyConfig,
  PocketRescue,
  Projectile,
  ResolvedSpawnTarget,
  Tower,
  TowerDefinition,
  TowerType,
  VisualEffect,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import {
  DeclarativeSpawnRequest,
  enemyHasDeclarativeImmunity,
  initEntityEffectTimers,
  stepDeclarativeEffects,
  triggerDeclarativeHooks,
  triggerProjectileDeclarativeHits,
} from './effectRunner';
import { resolveMatchTimeline } from './levelParser';

export interface SimState {
  gridRows: number;
  gridCols: number;
  boardOverride?: Partial<BoardDesignConfig>;
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
  towers: Tower[];
  enemies: Enemy[];
  doors079: Door079[];
  pocketRescues: PocketRescue[];
  projectiles: Projectile[];
  energyDrops: EnergyDrop[];
  effects: VisualEffect[];
  gates: EmergencyGate[];
  cooldowns: Record<TowerType, number>;
  kills: number;
  towersDeployed: number;
  elapsedTime: number;
  announcement: string;
  announcementTimer: number;
  flagBanner: string;
  flagBannerTimer: number;
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

export function createInitialSim(levelConfig: LevelConfig): SimState {
  const cooldowns = {} as Record<TowerType, number>;
  for (const t of TOWER_CATALOG) {
    cooldowns[t.type] = 0;
  }

  const gridRows = levelConfig.gridRows ?? GAME_CONFIG.grid.rows;
  const gridCols = levelConfig.gridCols ?? GAME_CONFIG.grid.cols;

  return {
    gridRows,
    gridCols,
    boardOverride: levelConfig.boardOverride,
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
    towers: [],
    enemies: [],
    doors079: [],
    pocketRescues: [],
    projectiles: [],
    energyDrops: [],
    effects: [],
    gates: Array.from({ length: gridRows }, (_, row) => ({
      row,
      available: !levelConfig.disableTeslaGates,
      firingTimer: 0,
      sweepCol: 0,
    })),
    cooldowns,
    kills: 0,
    towersDeployed: 0,
    elapsedTime: 0,
    announcement: `Nivel ${levelConfig.level}: ${levelConfig.title}.`,
    announcementTimer: GAME_CONFIG.gameplay.announcementDurationSec,
    flagBanner: '',
    flagBannerTimer: 0,
  };
}

function findNearestEmptyCell(
  towers: Tower[],
  prefRow: number,
  prefCol: number,
  gridRows: number,
  gridCols: number
): { row: number; col: number } | null {
  const occupied = new Set(towers.map((t) => `${t.row},${t.col}`));
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

  const scaledHp = Math.max(1, Math.round(def.hp * (waveOpts?.hpMultiplier ?? 1)));
  const scaledSpeed = def.speed * (waveOpts?.speedMultiplier ?? 1);
  const scaledDps = def.dps * (waveOpts?.dpsMultiplier ?? 1);
  const combinedEffects = [
    ...(def.effects ?? []),
    ...(waveOpts?.extraEffects ?? []),
  ];

  const newEnemy: Enemy = {
    id: nextSimId('scp'),
    type,
    row: clampedRows[0] ?? 0,
    occupiedRows: clampedRows.length > 0 ? clampedRows : [0],
    col: spawnCol,
    hp: scaledHp,
    maxHp: scaledHp,
    baseSpeed: scaledSpeed,
    currentSpeed: scaledSpeed,
    dps: scaledDps,
    slowTimer: 0,
    slowFactor: 0,
    burnTimer: 0,
    burnDps: 0,
    stunTimer: 0,
    hitFlash: 0,
    animPhase: Math.random() * 6,
    blinkMoveTimer: blinkCfg?.moveIntervalSec ?? 4.0,
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
    extraEffects: waveOpts?.extraEffects,
  };
  initEntityEffectTimers(newEnemy, combinedEffects);
  s.enemies.push(newEnemy);
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
}

export function spawnEnemyGroup(
  s: SimState,
  type: EnemyType,
  targets: ResolvedSpawnTarget[],
  isFlagHorde?: boolean,
  hordeLabel?: string,
  waveOpts?: WaveSpawnOverrides
) {
  const def = getEnemyDef(type);
  const packId = def?.behavior?.defaultPackCount ? nextSimId('pack') : undefined;
  const edgeSpawnCol = s.gridCols - 0.15;
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
  soundEngine.playCollect();
  return true;
}

export function removeTowerInSim(s: SimState, row: number, col: number): boolean {
  const existingIdx = s.towers.findIndex((t) => t.row === row && t.col === col);
  if (existingIdx === -1) return false;

  const removed = s.towers[existingIdx];
  const def = getTowerDef(removed.type);
  const refund = def ? Math.round(def.cost * GAME_CONFIG.gameplay.removeRefundRatio) : 0;
  s.energy += refund;
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
  if (s.towers.some((t) => t.row === row && t.col === col)) return false;
  const def = getTowerDef(towerType);
  if (!def) return false;
  if (def.placementRule === 'backHalf' && col >= Math.ceil(s.gridCols / 2)) return false;
  if (def.placementRule === 'frontHalf' && col < Math.floor(s.gridCols / 2)) return false;
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
  if (s.energy < def.cost || s.cooldowns[def.type] > 0) return false;

  s.energy -= def.cost;
  s.cooldowns[def.type] = def.cooldown;
  s.towersDeployed += 1;
  const newTower: Tower = {
    id: nextSimId('twr'),
    type: def.type,
    category: def.category,
    row,
    col,
    hp: def.maxHp,
    maxHp: def.maxHp,
    actionTimer: def.energyAmount ? 3.5 : 0.7,
    armProgress: 0,
    isArmed: false,
    suppressed: false,
    hypnotized: false,
    radioProtected: false,
    stunTimer: 0,
    deafTimer: 0,
    immuneToPsych: false,
    recoil: 0,
    hitFlash: 0,
  };
  initEntityEffectTimers(newTower, def.effects);
  s.towers.push(newTower);
  const spawnExtras: DeclarativeSpawnRequest[] = [];
  triggerDeclarativeHooks(
    s,
    'on_spawn',
    'tower',
    newTower,
    def.effects,
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
  soundEngine.playPlace();
  return true;
}

export function stepSimulation(s: SimState, dt: number): SimOutcome {
  const gp = GAME_CONFIG.gameplay;
  s.elapsedTime += dt;
  s.levelTimer += dt;

  if (s.announcementTimer > 0) s.announcementTimer = Math.max(0, s.announcementTimer - dt);
  if (s.flagBannerTimer > 0) s.flagBannerTimer = Math.max(0, s.flagBannerTimer - dt);
  if (s.blinkAlpha > 0) s.blinkAlpha = Math.max(0, s.blinkAlpha - dt * 5.8);

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
        amount: s.skyEnergy?.amount ?? gp.energyDropAmount,
        lifetime: 0,
        maxLifetime: gp.energyDropLifetimeSec,
        collecting: false,
        fromSky: true,
      });
    }
  }

  // 3. Level timeline spawner
  s.timeline.forEach((ev, idx) => {
    if (!s.spawnedIndices.has(idx) && s.levelTimer >= ev.time) {
      s.spawnedIndices.add(idx);
      spawnEnemyGroup(s, ev.type, ev.targets, ev.isFlagHorde, ev.hordeLabel, {
        hpMultiplier: ev.hpMultiplier,
        speedMultiplier: ev.speedMultiplier,
        dpsMultiplier: ev.dpsMultiplier,
        extraEffects: ev.extraEffects,
        announcement: ev.announcement,
      });
    }
  });

  const allSpawned = s.spawnedIndices.size >= s.timeline.length;
  if (allSpawned && s.enemies.length === 0) {
    soundEngine.playVictory();
    return 'VICTORY';
  }

  // 3.5 Pocket Dimension rescues (SCP-106)
  const remainingRescues: PocketRescue[] = [];
  for (const rescue of s.pocketRescues) {
    rescue.timer -= dt;
    if (rescue.timer <= 0) {
      const spot = findNearestEmptyCell(s.towers, rescue.row, rescue.col, s.gridRows, s.gridCols);
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

  // 3.6 Update SCP-079 Doors
  for (const door of s.doors079) {
    door.toggleTimer -= dt;
    if (door.toggleTimer <= 0) {
      door.isOpen = !door.isOpen;
      door.toggleTimer =
        gp.doors079.toggleMinSec + Math.random() * gp.doors079.toggleVarianceSec;
      soundEngine.playDoor079();
    }
  }

  // 4. SCP-173 Global Blink
  const hasActive173 = s.enemies.some((e) => e.type === 'scp_173' && e.hp > 0);
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
  const active966 = s.enemies.filter((e) => e.type === 'scp_966' && e.hp > 0);
  const hasActive035 = s.enemies.some((e) => e.type === 'scp_035' && e.hp > 0);
  const hasActive049 = s.enemies.some((e) => e.type === 'scp_049' && e.hp > 0);
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

  // 5.5 Execute declarative JSON effects (auras, periodic, passive, on_hp_below, active DoT/HoT/buffs)
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

  // 6. Update towers (driven declaratively by TowerDefinition JSON fields)
  const radioBoost = EFFECTS_CATALOG.radio_3x3?.fireRateBoost ?? 1.15;

  for (const tower of s.towers) {
    if (tower.suppressed || tower.stunTimer > 0 || tower.deafTimer > 0 || tower.customDisabled) continue;

    const def = getTowerDef(tower.type);
    if (!def) continue;

    if (def.energyAmount && def.energyInterval) {
      tower.actionTimer += dt;
      if (tower.actionTimer >= def.energyInterval) {
        tower.actionTimer = 0;
        const unitAmount = gp.energyDropAmount;
        const dropCount = Math.max(1, Math.round(def.energyAmount / unitAmount));
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
      }
    } else if (def.healAmount && def.healInterval) {
      tower.actionTimer += dt * (tower.customFireRateMult ?? 1);
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
          soundEngine.playHeal();
        }
      }
    } else if (def.floorTrapDps) {
      const dps = def.floorTrapDps;
      for (const enemy of s.enemies) {
        if (
          enemy.skyOffsetRows <= 0.3 &&
          enemyOccupiesRow(enemy, tower.row) &&
          Math.abs(enemy.col - tower.col) <= 0.48
        ) {
          enemy.hp -= dps * dt;
          enemy.hitFlash = Math.max(enemy.hitFlash, 0.25);
        }
      }
    } else if (def.armTime !== undefined && def.explosionDamage) {
      if (!tower.isArmed) {
        tower.armProgress = Math.min(1, tower.armProgress + dt / def.armTime);
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
          const blastDmg = def.explosionDamage ?? 420;
          for (const enemy of s.enemies) {
            if (
              enemy.skyOffsetRows <= 0.3 &&
              enemyOccupiesRow(enemy, tower.row) &&
              Math.abs(enemy.col - tower.col) <= 1.2
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
                enemy.hp -= blastDmg;
                enemy.hitFlash = 1;
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
          soundEngine.playExplosion();
          towersToRemove.add(tower.id);
        }
      }
    } else if (def.aoeTargets && def.fireRate && def.damage) {
      if (tower.hypnotized) continue;
      const nearbyEnemies = s.enemies.filter(
        (e) =>
          e.hp > 0 &&
          e.skyOffsetRows <= 0.3 &&
          e.occupiedRows.some((r) => Math.abs(r - tower.row) <= 1) &&
          Math.abs(e.col - tower.col) <= 1.45
      );
      if (nearbyEnemies.length > 0) {
        const speedFactor = (tower.radioProtected ? radioBoost : 1) * (tower.customFireRateMult ?? 1);
        tower.actionTimer += dt * speedFactor;
        if (tower.actionTimer >= def.fireRate) {
          tower.actionTimer = 0;
          const maxTargets = def.aoeTargets;
          const dmg = def.damage * (tower.customDamageMult ?? 1);
          const targets = nearbyEnemies.slice(0, maxTargets);
          for (const tgt of targets) {
            tgt.hp -= dmg;
            tgt.hitFlash = 1;
            triggerProjectileDeclarativeHits(s, def.effects, tgt, nextSimId, hasEnemyImmunity);
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
          }
          soundEngine.playTeslaArc();
        }
      }
    } else if (def.projectileKind && def.fireRate && def.damage) {
      if (tower.hypnotized) continue;

      const maxRange = def.maxRangeCols ?? s.gridCols + 0.5;
      const hasTarget = s.enemies.some(
        (e) =>
          e.skyOffsetRows <= 0.3 &&
          enemyOccupiesRow(e, tower.row) &&
          e.col >= tower.col - 0.2 &&
          e.col <= tower.col + maxRange
      );
      if (hasTarget) {
        const speedFactor = (tower.radioProtected ? radioBoost : 1) * (tower.customFireRateMult ?? 1);
        tower.actionTimer += dt * speedFactor;
        if (tower.actionTimer >= def.fireRate) {
          tower.actionTimer = 0;
          tower.recoil = 1;
          const kind = def.projectileKind;
          const bursts = def.burstCount ?? 1;
          const projSpeed = def.projectileSpeed ?? gp.projectileSpeeds[kind] ?? 6.4;
          const dmg = def.damage * (tower.customDamageMult ?? 1);

          for (let b = 0; b < bursts; b++) {
            s.projectiles.push({
              id: nextSimId('proj'),
              row: tower.row,
              col: tower.col + 0.35 + b * 0.24,
              originCol: tower.col,
              maxRangeCols: def.maxRangeCols,
              splashRadius: def.splashRadius,
              speed: projSpeed,
              damage: dmg,
              kind,
              slowFactor: def.slowFactor ?? (kind === 'cryo' ? EFFECTS_CATALOG.cryo_slow?.slowFactor : undefined),
              slowDuration: def.slowDuration ?? (kind === 'cryo' ? EFFECTS_CATALOG.cryo_slow?.durationSec : undefined),
              burnDps: def.burnDps ?? (kind === 'pyro' ? EFFECTS_CATALOG.thermal_burn?.burnDps : undefined),
              burnDuration: def.burnDuration ?? (kind === 'pyro' ? EFFECTS_CATALOG.thermal_burn?.durationSec : undefined),
              effectIds: def.effects,
              sourceTowerType: def.type,
            });
          }

          s.effects.push({
            id: nextSimId('fx'),
            kind: 'muzzle',
            row: tower.row,
            col: tower.col,
            timer: 0,
            duration: 0.12,
          });
          soundEngine.playShot(kind);
        }
      } else {
        tower.actionTimer = Math.min(
          tower.actionTimer + dt * 0.5,
          def.fireRate * 0.8
        );
      }
    }
  }

  // 7. Move projectiles & resolve SCP-079 closed door blocks + enemy hits (including multi-lane & immunities)
  const projectilesToRemove = new Set<string>();
  for (const proj of s.projectiles) {
    proj.col += proj.speed * dt;
    if (
      proj.col > s.gridCols + 0.4 ||
      (proj.maxRangeCols !== undefined && proj.col - proj.originCol > proj.maxRangeCols)
    ) {
      projectilesToRemove.add(proj.id);
      continue;
    }

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

    let hitEnemy: Enemy | undefined;
    for (const enemy of s.enemies) {
      if (
        enemy.skyOffsetRows <= 0.3 &&
        enemyOccupiesRow(enemy, proj.row) &&
        enemy.hp > 0 &&
        Math.abs(enemy.col - proj.col) <= 0.36
      ) {
        if (!hitEnemy || enemy.col < hitEnemy.col) {
          hitEnemy = enemy;
        }
      }
    }

    if (hitEnemy) {
      if (proj.splashRadius) {
        for (const target of s.enemies) {
          if (
            target.skyOffsetRows <= 0.3 &&
            target.hp > 0 &&
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
              target.hp -= proj.damage;
              target.hitFlash = 1;
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
        soundEngine.playExplosion();
      } else {
        hitEnemy.hp -= proj.damage;
        hitEnemy.hitFlash = 1;
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
      if (proj.kind === 'pyro' && proj.burnDps && proj.burnDuration) {
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
      if (proj.effectIds && proj.effectIds.length > 0) {
        triggerProjectileDeclarativeHits(s, proj.effectIds, hitEnemy, nextSimId, hasEnemyImmunity);
      }
      projectilesToRemove.add(proj.id);
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

  const convertedSpawns: Array<{ row: number; col: number }> = [];
  const vaseSpawns: Array<{ row: number; col: number }> = [];

  for (const enemy of s.enemies) {
    if (enemy.hp <= 0) continue;
    const def = getEnemyDef(enemy.type);
    const behavior = def?.behavior;

    enemy.animPhase += dt;
    if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4);
    if (enemy.slowTimer > 0) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
      if (enemy.slowTimer === 0) enemy.slowFactor = 0;
    }
    if (enemy.burnTimer > 0) {
      enemy.hp -= enemy.burnDps * dt;
      enemy.burnTimer = Math.max(0, enemy.burnTimer - dt);
    }
    if (enemy.hp <= 0) continue;

    // Sky fall animation
    if (behavior?.spawnRule?.mode === 'sky' && enemy.skyOffsetRows > 0) {
      enemy.skyOffsetRows = Math.max(0, enemy.skyOffsetRows - dt * 4.5);
      continue;
    }

    // Stunned by declarative effect
    if ((enemy.stunTimer ?? 0) > 0) {
      enemy.isAttacking = false;
      continue;
    }

    // Door Controller (SCP-079)
    if (behavior?.doorController) {
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
    if (behavior?.skyPull) {
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
    if (behavior?.vaseSpawner) {
      enemy.vaseSpawnTimer -= dt;
      if (enemy.vaseSpawnTimer <= 0) {
        enemy.vaseSpawnTimer = spawnInterval019;
        vaseSpawns.push({ row: enemy.row, col: Math.max(0.5, enemy.col - 0.25) });
      }
      continue;
    }

    // Scream 5x5 Area (SCP-066)
    if (behavior?.screamArea) {
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
      if (enemy.phase096 === 'calm' && enemy.col <= effectiveTriggerCol) {
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
    if (behavior?.bounceAccel) {
      const accel = EFFECTS_CATALOG.bounce_018?.accelPerSec ?? behavior.bounceAccel.accelPerSec;
      const maxSpd = EFFECTS_CATALOG.bounce_018?.maxSpeed ?? behavior.bounceAccel.maxSpeed;
      enemy.currentSpeed = Math.min(maxSpd, enemy.currentSpeed + accel * dt);
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

    const speedMult = (enemy.slowTimer > 0 ? 1 - enemy.slowFactor : 1) * (enemy.customSpeedMult ?? 1);

    if (blockers.length > 0) {
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
        towersToRemove.add(primaryBlocker.id);
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

        if (behavior.disappearOnHit) {
          // SCP-018: instakill tower and disappear
          soundEngine.playBounceImpact018();
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'bounce_impact',
            row: primaryBlocker.row,
            col: primaryBlocker.col,
            timer: 0,
            duration: 0.45,
          });
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
          // SCP-106: instakill + 10% chance Personal escapes pocket dimension
          soundEngine.playPocket106();
          s.effects.push({
            id: nextSimId('fx'),
            kind: 'pocket_portal',
            row: primaryBlocker.row,
            col: primaryBlocker.col,
            timer: 0,
            duration: 0.65,
          });
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
        const dmgMult = enemy.customDamageMult ?? 1;
        for (const blocker of blockers) {
          blocker.hp -= enemy.dps * speedMult * dmgMult * dt;
          blocker.hitFlash = Math.max(blocker.hitFlash, 0.35);

          const blockerDef = TOWER_CATALOG.find((d) => d.type === blocker.type);
          if (blockerDef?.thornsDps && blocker.stunTimer <= 0 && blocker.deafTimer <= 0) {
            enemy.hp -= blockerDef.thornsDps * dt;
          }

          if (blocker.hp <= 0) {
            towersToRemove.add(blocker.id);
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
            if (enemy.type === 'scp_049') {
              convertedSpawns.push({ row: blocker.row, col: blocker.col });
            }
          }
        }
      }
    } else {
      enemy.isAttacking = false;
      if (behavior?.blinkJump) {
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
            : moveInterval173;
          const jumpDist =
            hasPartnerOnRow || enemy.slowTimer > 0
              ? behavior.blinkJump.paranoiaCells ?? 1
              : moveCells173;
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

    // Emergency Tesla Gates check (handles both 1-lane and 2-lane enemies)
    if (enemy.col <= -0.15) {
      const enemyGates = enemy.occupiedRows
        .map((r) => s.gates[r])
        .filter((g): g is EmergencyGate => Boolean(g));
      const availableGate = enemyGates.find((g) => g.available && g.firingTimer === 0);
      const activeGate = enemyGates.find((g) => g.firingTimer > 0);

      if (availableGate) {
        availableGate.available = false;
        availableGate.firingTimer = gp.teslaGate.firingDurationSec;
        availableGate.sweepCol = 0;
        soundEngine.playTesla();
        s.announcement = `Puerta Tesla de la fila ${availableGate.row + 1} activada.`;
        s.announcementTimer = 3.5;
      } else if (!activeGate && enemy.col <= -0.3) {
        soundEngine.playGameOver();
        return 'GAME_OVER';
      }
    }
  }

  // Spawn SCP-049-2 from any tower killed by SCP-049
  for (const conv of convertedSpawns) {
    spawnEnemyAt(s, 'scp_049_2', { row: conv.row, occupiedRows: [conv.row] }, conv.col);
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'revive_ring',
      row: conv.row,
      col: conv.col,
      timer: 0,
      duration: 0.6,
    });
    s.effects.push({
      id: nextSimId('fx'),
      kind: 'text',
      row: conv.row,
      col: conv.col,
      timer: 0,
      duration: 0.95,
      text: 'SCP-049-2',
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
          enemy.hasRevived = true;
        }
      }
      if (gate.sweepCol >= s.gridCols + 0.5) {
        gate.firingTimer = 0;
      }
    }
  }

  // 10. Remove dead towers & handle SCP-008/declarative extra life & on_death hooks & clear SCP-079 doors on death
  const postDeathSpawns: DeclarativeSpawnRequest[] = [];
  if (towersToRemove.size > 0) {
    for (const t of s.towers) {
      if (towersToRemove.has(t.id)) {
        const tDef = getTowerDef(t.type);
        triggerDeclarativeHooks(
          s,
          'on_death',
          'tower',
          t,
          tDef?.effects,
          towersToRemove,
          postDeathSpawns,
          nextSimId,
          undefined,
          undefined,
          hasEnemyImmunity
        );
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
        if (enemy.type === 'scp_079') {
          s.doors079 = [];
          s.announcement = '¡SCP-079 neutralizado! Todas sus puertas se han desactivado.';
          s.announcementTimer = 4.0;
        }
        s.kills += 1;
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
  const activeDrops: EnergyDrop[] = [];
  for (const drop of s.energyDrops) {
    drop.lifetime += dt;
    if (drop.yRow < drop.targetRow) {
      drop.yRow = Math.min(drop.targetRow, drop.yRow + (drop.fromSky ? 1.5 : 1.1) * dt);
    } else if (s.autoCollectEnergy && drop.lifetime >= 0.55) {
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
      soundEngine.playCollect();
      continue;
    }
    if (drop.lifetime < drop.maxLifetime && !drop.collecting) {
      activeDrops.push(drop);
    }
  }
  s.energyDrops = activeDrops;

  // 12. Visual Effects
  s.effects = s.effects.filter((fx) => {
    fx.timer += dt;
    return fx.timer < fx.duration;
  });

  return 'PLAYING';
}
