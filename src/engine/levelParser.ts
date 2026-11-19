import configJson from '../data/json/config.json';
import scpsJson from '../data/json/scps.json';
import towersJson from '../data/json/towers.json';
import {
  EnemyDefinition,
  EnemyType,
  GameConfig,
  LevelConfig,
  LevelEvent,
  RawLevelConfig,
  ResolvedSpawnTarget,
  TowerDefinition,
} from '../types/game';

const GAME_CONFIG = configJson as GameConfig;
const ENEMIES = scpsJson as EnemyDefinition[];
const TOWERS = towersJson as TowerDefinition[];

function clampRow(r: number, gridRows: number): number {
  return Math.max(0, Math.min(gridRows - 1, Math.round(r)));
}

function getEnemyDef(type: EnemyType): EnemyDefinition | undefined {
  return ENEMIES.find((e) => e.type === type);
}

function toTarget(
  entry: number | [number, number],
  laneSpan: number,
  gridRows: number
): ResolvedSpawnTarget {
  if (Array.isArray(entry)) {
    const r1 = clampRow(entry[0], gridRows);
    const r2 = clampRow(entry[1], gridRows);
    const pair = r1 === r2 ? [r1, r1 + 1 < gridRows ? r1 + 1 : Math.max(0, r1 - 1)] : [r1, r2];
    const sorted = [...new Set(pair)].sort((a, b) => a - b);
    return { row: sorted[0], occupiedRows: sorted };
  }

  const r = clampRow(entry, gridRows);
  if (laneSpan === 2) {
    const second = r + 1 < gridRows ? r + 1 : Math.max(0, r - 1);
    const sorted = [...new Set([r, second])].sort((a, b) => a - b);
    return { row: sorted[0], occupiedRows: sorted };
  }
  return { row: r, occupiedRows: [r] };
}

function pickRandomTargets(
  type: EnemyType,
  count: number,
  gridRows: number
): ResolvedSpawnTarget[] {
  const def = getEnemyDef(type);
  const laneSpan = def?.behavior?.laneSpan ?? 1;
  const targets: ResolvedSpawnTarget[] = [];

  if (laneSpan === 2) {
    const pairPool = Array.from({ length: Math.max(1, gridRows - 1) }, (_, r) => r);
    for (let i = pairPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairPool[i], pairPool[j]] = [pairPool[j], pairPool[i]];
    }
    for (let i = 0; i < count; i++) {
      const base = pairPool[i % pairPool.length];
      targets.push({ row: base, occupiedRows: [base, Math.min(gridRows - 1, base + 1)] });
    }
    return targets;
  }

  const pool = Array.from({ length: gridRows }, (_, r) => r);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < count; i++) {
    const r = i < pool.length ? pool[i] : Math.floor(Math.random() * gridRows);
    targets.push({ row: r, occupiedRows: [r] });
  }
  return targets;
}

/**
 * Compiles raw customizable level JSON into normalized LevelConfig metadata:
 * - Accumulates relative `time` delays into absolute timestamps
 * - Auto-calculates `durationSeconds` if omitted
 * - Auto-calculates `flagMarkers` from `isFlagHorde` events if omitted
 * - Auto-derives `enemiesPresent` from wave events if omitted
 * - Enforces tower-only rewards (no passive bonuses)
 */
export function compileLevelMetadata(raw: RawLevelConfig): LevelConfig {
  let absTime = 0;
  const flagTimes: number[] = [];
  const enemySet = new Set<EnemyType>(raw.enemiesPresent ?? []);

  const rawRows = raw.grid?.rows ?? raw.rows ?? GAME_CONFIG.grid.rows;
  const rawCols = raw.grid?.cols ?? raw.cols ?? GAME_CONFIG.grid.cols;
  const gridRows = Math.max(1, Math.min(20, Math.round(rawRows)));
  const gridCols = Math.max(3, Math.min(24, Math.round(rawCols)));

  for (const ev of raw.events) {
    absTime += Math.max(0, ev.time);
    if (!raw.enemiesPresent) {
      enemySet.add(ev.type);
    }
    if (ev.isFlagHorde) {
      flagTimes.push(absTime);
    }
  }

  const durationSeconds = raw.durationSeconds ?? Math.max(45, Math.ceil(absTime + 12));

  const flagMarkers =
    raw.flagMarkers && raw.flagMarkers.length > 0
      ? raw.flagMarkers
      : flagTimes.map((t) =>
          Number(Math.min(0.96, Math.max(0.08, t / Math.max(1, durationSeconds))).toFixed(3))
        );

  const matchedTower = raw.unlockTower
    ? TOWERS.find((t) => t.type === raw.unlockTower)
    : TOWERS.find((t) => t.unlockLevel === raw.level);

  const unlockTower = matchedTower?.type;
  const rewardLabel = matchedTower ? `Desbloquea: ${matchedTower.name}` : null;

  return {
    level: raw.level,
    title: raw.title,
    description: raw.description,
    startingEnergy: raw.startingEnergy,
    maxDeckSlots: raw.maxDeckSlots,
    gridRows,
    gridCols,
    boardOverride: raw.boardOverride,
    disableTeslaGates: raw.disableTeslaGates,
    autoCollectEnergy: raw.autoCollectEnergy,
    skyEnergy: raw.skyEnergy,
    enemiesPresent: Array.from(enemySet),
    durationSeconds,
    flagMarkers,
    rewardLabel,
    unlockTower,
    rawEvents: raw.events,
  };
}

/**
 * Resolves a LevelConfig at match start:
 * - Accumulates relative `time` delays (seconds since previous wave) into absolute spawn times
 * - Resolves omitted `row`/`rows` randomly on each playthrough within level's gridRows
 * - Supports 2-lane tuples `[x1, x2]` (e.g. SCP-682)
 */
export function resolveMatchTimeline(
  levelConfig: LevelConfig,
  gridRows = levelConfig.gridRows ?? GAME_CONFIG.grid.rows
): LevelEvent[] {
  let absTime = 0;
  return levelConfig.rawEvents.map((ev) => {
    absTime += Math.max(0, ev.time);
    const def = getEnemyDef(ev.type);
    const laneSpan = def?.behavior?.laneSpan ?? 1;

    let targets: ResolvedSpawnTarget[];
    if (ev.rows && ev.rows.length > 0) {
      targets = ev.rows.map((entry) => toTarget(entry, laneSpan, gridRows));
    } else if (ev.row !== undefined) {
      const base = toTarget(ev.row, laneSpan, gridRows);
      const count = ev.count ?? 1;
      targets = Array.from({ length: count }, () => ({
        row: base.row,
        occupiedRows: [...base.occupiedRows],
      }));
    } else {
      const defaultCount = def?.behavior?.defaultPackCount ?? 1;
      const count = ev.count ?? defaultCount;
      targets = pickRandomTargets(ev.type, count, gridRows);
    }

    return {
      time: absTime,
      type: ev.type,
      targets,
      isFlagHorde: ev.isFlagHorde,
      hordeLabel: ev.hordeLabel,
      hpMultiplier: ev.hpMultiplier,
      speedMultiplier: ev.speedMultiplier,
      dpsMultiplier: ev.dpsMultiplier,
      extraEffects: ev.extraEffects,
      announcement: ev.announcement,
    };
  });
}
