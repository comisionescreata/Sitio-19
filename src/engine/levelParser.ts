import {
  ENEMY_CATALOG,
  EVENTS_CATALOG,
  GAME_CONFIG,
  OBJECTIVES_CATALOG,
  TOWER_CATALOG,
} from '../data/catalogLoaders';
import {
  EnemyDefinition,
  EnemyType,
  LevelConfig,
  LevelEvent,
  LevelEventDefinition,
  LevelObjectiveSpec,
  ObjectiveDefinition,
  RawLevelConfig,
  RawLevelEvent,
  ResolvedSpawnTarget,
  TowerDefinition,
} from '../types/game';

const ENEMIES: EnemyDefinition[] = ENEMY_CATALOG;
const TOWERS: TowerDefinition[] = TOWER_CATALOG;

function clampRow(r: number, gridRows: number): number {
  return Math.max(0, Math.min(gridRows - 1, Math.round(r)));
}

function getEnemyDef(type: EnemyType): EnemyDefinition | undefined {
  return ENEMIES.find((e) => e.type === type);
}

export function resolveSpawnTargetsForSpec(
  type: EnemyType,
  row: number | [number, number] | undefined,
  rows: Array<number | [number, number]> | undefined,
  count: number | undefined,
  gridRows: number
): ResolvedSpawnTarget[] {
  const def = getEnemyDef(type);
  const laneSpan = def?.behavior?.laneSpan ?? 1;

  if (rows && rows.length > 0) {
    return rows.map((entry) => toTarget(entry, laneSpan, gridRows));
  }
  if (row !== undefined) {
    const base = toTarget(row, laneSpan, gridRows);
    const total = count ?? 1;
    return Array.from({ length: total }, () => ({
      row: base.row,
      occupiedRows: [...base.occupiedRows],
    }));
  }
  const defaultCount = def?.behavior?.defaultPackCount ?? 1;
  return pickRandomTargets(type, count ?? defaultCount, gridRows);
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

function collectSpawnsFromEventDef(
  evDef: Partial<LevelEventDefinition> | undefined,
  enemySet: Set<EnemyType>
) {
  if (!evDef?.logic) return;
  for (const sp of evDef.logic.spawns ?? []) {
    if (sp.type) enemySet.add(sp.type as EnemyType);
  }
  for (const sp of evDef.logic.spawnFromObstacles?.types ?? []) {
    if (sp.type) enemySet.add(sp.type as EnemyType);
  }
  for (const ob of evDef.logic.spawnObstacles ?? []) {
    if (ob.spawnOnDestroy?.type) enemySet.add(ob.spawnOnDestroy.type as EnemyType);
  }
  for (const mut of evDef.logic.mutateEnemies ?? []) {
    if (mut.transformToType) enemySet.add(mut.transformToType as EnemyType);
  }
}

function expandEventTimestamps(events: RawLevelEvent[]): Array<{ absTime: number; raw: RawLevelEvent }> {
  let absCursor = 0;
  const expanded: Array<{ absTime: number; raw: RawLevelEvent }> = [];

  for (const ev of events) {
    let baseTime: number;
    if (ev.absoluteTime !== undefined) {
      baseTime = Math.max(0, ev.absoluteTime);
      absCursor = Math.max(absCursor, baseTime);
    } else {
      absCursor += Math.max(0, ev.time ?? 0);
      baseTime = absCursor;
    }

    const repeatTimes = Math.max(1, ev.repeat?.times ?? 1);
    const repeatInterval = Math.max(0.1, ev.repeat?.intervalSec ?? 5);

    for (let r = 0; r < repeatTimes; r++) {
      const t = baseTime + r * repeatInterval;
      expanded.push({
        absTime: t,
        raw: r === 0 ? ev : { ...ev, isFlagHorde: false, hordeLabel: undefined },
      });
    }
  }

  expanded.sort((a, b) => a.absTime - b.absTime);
  return expanded;
}

/**
 * Compiles raw customizable level JSON into normalized LevelConfig metadata:
 * - Accumulates relative `time` delays (or `absoluteTime` + `repeat`) into absolute timestamps
 * - Auto-calculates `durationSeconds` if omitted
 * - Auto-calculates `flagMarkers` from `isFlagHorde` events if omitted
 * - Auto-derives `enemiesPresent` from wave events, startingEnemies, obstacles, and events.json spawns
 * - Merges `obstacles` and `tombstones` shorthand
 * - Preserves dialogues (`introDialogueId`, `victoryDialogueId`, `defeatDialogueId`, `inlineDialogues`)
 */
function resolveLevelObjectives(
  specs: LevelObjectiveSpec[] | undefined
): ObjectiveDefinition[] | undefined {
  if (!specs || specs.length === 0) return undefined;
  const resolved: ObjectiveDefinition[] = [];
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    if (typeof spec === 'string') {
      const preset = OBJECTIVES_CATALOG[spec];
      if (preset) resolved.push(preset);
      continue;
    }
    const base = spec.objectiveId ? OBJECTIVES_CATALOG[spec.objectiveId] : undefined;
    const kind = spec.kind ?? base?.kind;
    if (!kind) continue;
    const id = spec.id ?? spec.objectiveId ?? base?.id ?? `obj_${i + 1}`;
    resolved.push({
      ...(base ?? {}),
      ...spec,
      id,
      kind,
      description: spec.description ?? base?.description ?? spec.title ?? base?.title ?? id,
    });
  }
  return resolved.length > 0 ? resolved : undefined;
}

export function compileLevelMetadata(raw: RawLevelConfig): LevelConfig {
  const flagTimes: number[] = [];
  const enemySet = new Set<EnemyType>(raw.enemiesPresent ?? []);
  const levelNum = raw.level ?? 1;

  const rawRows = raw.grid?.rows ?? raw.rows ?? GAME_CONFIG.grid.rows;
  const rawCols = raw.grid?.cols ?? raw.cols ?? GAME_CONFIG.grid.cols;
  const gridRows = Math.max(1, Math.min(20, Math.round(rawRows)));
  const gridCols = Math.max(3, Math.min(24, Math.round(rawCols)));

  const mergedObstacles = [
    ...(raw.obstacles ?? []),
    ...(raw.tombstones ?? []).map((t) => ({ kind: 'tombstone' as const, ...t })),
  ];

  const expanded = expandEventTimestamps(raw.events ?? []);
  let maxTime = 0;

  if (!raw.enemiesPresent) {
    for (const se of raw.startingEnemies ?? []) {
      if (se.type) enemySet.add(se.type as EnemyType);
    }
    for (const ob of mergedObstacles) {
      if (ob.spawnOnDestroy?.type) enemySet.add(ob.spawnOnDestroy.type as EnemyType);
    }
    for (const le of raw.levelEvents ?? []) {
      if (typeof le === 'string') {
        collectSpawnsFromEventDef(EVENTS_CATALOG[le], enemySet);
      } else {
        if (le.eventId) collectSpawnsFromEventDef(EVENTS_CATALOG[le.eventId], enemySet);
        collectSpawnsFromEventDef(le, enemySet);
      }
    }
  }

  for (const { absTime, raw: ev } of expanded) {
    if (absTime > maxTime) maxTime = absTime;
    if (!raw.enemiesPresent) {
      if (ev.type) enemySet.add(ev.type);
      if (ev.eventId) collectSpawnsFromEventDef(EVENTS_CATALOG[ev.eventId], enemySet);
      collectSpawnsFromEventDef(ev.eventOverrides, enemySet);
      collectSpawnsFromEventDef(ev.event, enemySet);
    }
    if (ev.isFlagHorde) {
      flagTimes.push(absTime);
    }
  }

  const surviveTarget =
    (raw.victoryCondition?.mode === 'survive_time' ||
      raw.victoryCondition?.mode === 'survive_and_kill') &&
    raw.victoryCondition.targetSeconds
      ? raw.victoryCondition.targetSeconds
      : 0;
  const durationSeconds =
    raw.durationSeconds ?? Math.max(45, surviveTarget, Math.ceil(maxTime + 12));

  const flagMarkers =
    raw.flagMarkers && raw.flagMarkers.length > 0
      ? raw.flagMarkers
      : flagTimes.map((t) =>
          Number(Math.min(0.96, Math.max(0.08, t / Math.max(1, durationSeconds))).toFixed(3))
        );

  const matchedTower = raw.unlockTower
    ? TOWERS.find((t) => t.type === raw.unlockTower)
    : TOWERS.find((t) => t.unlockLevel === levelNum);

  const unlockTower = matchedTower?.type;
  const rewardLabel =
    raw.rewardLabel !== undefined
      ? raw.rewardLabel
      : matchedTower
      ? `Desbloquea: ${matchedTower.name}`
      : null;

  const coverImage = raw.coverImage ?? raw.portrait ?? raw.bannerImage;
  const objectives = resolveLevelObjectives(raw.objectives);

  return {
    level: levelNum,
    title: raw.title,
    description: raw.description,
    coverImage,
    startingEnergy: raw.startingEnergy,
    maxDeckSlots: raw.maxDeckSlots,
    gridRows,
    gridCols,
    boardOverride: raw.boardOverride,
    environment: raw.environment,
    rules: raw.rules,
    disableTeslaGates: raw.disableTeslaGates,
    autoCollectEnergy: raw.autoCollectEnergy,
    skyEnergy: raw.skyEnergy,
    blockedCells: raw.blockedCells,
    tileModifiers: raw.tileModifiers,
    tileOverrides: raw.tileOverrides,
    obstacles: mergedObstacles.length > 0 ? mergedObstacles : undefined,
    startingTowers: raw.startingTowers,
    startingEnemies: raw.startingEnemies,
    startingDoors079: raw.startingDoors079,
    globalEffects: raw.globalEffects,
    levelEvents: raw.levelEvents,
    objectives,
    introDialogueId: raw.introDialogueId,
    victoryDialogueId: raw.victoryDialogueId,
    defeatDialogueId: raw.defeatDialogueId,
    inlineDialogues: raw.inlineDialogues,
    victoryCondition: raw.victoryCondition,
    enemiesPresent: Array.from(enemySet),
    durationSeconds,
    flagMarkers,
    rewardLabel,
    unlockTower,
    rawEvents: raw.events ?? [],
  };
}

/**
 * Resolves a LevelConfig at match start:
 * - Accumulates relative `time` delays (or `absoluteTime` + `repeat`) into absolute spawn times
 * - Resolves omitted `row`/`rows` randomly on each playthrough within level's gridRows
 * - Supports 2-lane tuples `[x1, x2]` (e.g. SCP-682) and optional `type` for event-only entries
 */
export function resolveMatchTimeline(
  levelConfig: LevelConfig,
  gridRows = levelConfig.gridRows ?? GAME_CONFIG.grid.rows
): LevelEvent[] {
  const expanded = expandEventTimestamps(levelConfig.rawEvents);

  return expanded.map(({ absTime, raw: ev }) => {
    const targets = ev.type
      ? resolveSpawnTargetsForSpec(ev.type, ev.row, ev.rows, ev.count, gridRows)
      : [];

    return {
      time: absTime,
      type: ev.type,
      targets,
      col: ev.col,
      staggerSec: ev.staggerSec,
      isFlagHorde: ev.isFlagHorde,
      hordeLabel: ev.hordeLabel,
      hpMultiplier: ev.hpMultiplier,
      speedMultiplier: ev.speedMultiplier,
      dpsMultiplier: ev.dpsMultiplier,
      extraEffects: ev.extraEffects,
      immunities: ev.immunities,
      eliteBadge: ev.eliteBadge,
      eliteColor: ev.eliteColor,
      announcement: ev.announcement,
      dialogueId: ev.dialogueId,
      inlineDialogue: ev.inlineDialogue,
      eventId: ev.eventId,
      eventOverrides: ev.eventOverrides,
      event: ev.event,
    };
  });
}
