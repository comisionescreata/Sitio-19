import { EFFECTS_CATALOG, ENEMY_CATALOG, TOWER_CATALOG } from '../data/scpCatalog';
import {
  ActiveEffectState,
  EffectDefinition,
  EffectModifiers,
  EffectSoundKey,
  EffectTrigger,
  Enemy,
  EnemyDefinition,
  EnemyImmunity,
  EnemyType,
  Tower,
  TowerDefinition,
  TowerType,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import type { SimState } from './simulation';

export type EffectOwnerSide = 'enemy' | 'tower';

export interface DeclarativeSpawnRequest {
  type: EnemyType;
  row: number;
  col: number;
}

function getEnemyDefLocal(type: EnemyType): EnemyDefinition | undefined {
  return ENEMY_CATALOG.find((e) => e.type === type);
}

function getTowerDefLocal(type: TowerType): TowerDefinition | undefined {
  return TOWER_CATALOG.find((t) => t.type === type);
}

export function isDeclarativeEffect(fx?: EffectDefinition): fx is EffectDefinition {
  return Boolean(fx && fx.engineMode !== 'builtin');
}

export function getDeclarativeEffects(effectIds?: string[]): EffectDefinition[] {
  if (!effectIds || effectIds.length === 0) return [];
  const result: EffectDefinition[] = [];
  for (const id of effectIds) {
    const fx = EFFECTS_CATALOG[id];
    if (isDeclarativeEffect(fx)) {
      result.push(fx);
    }
  }
  return result;
}

export function resolveModifiers(fx: EffectDefinition): EffectModifiers {
  const m = fx.modifiers ?? {};
  return {
    damageInstant: m.damageInstant,
    damagePercentMaxHp: m.damagePercentMaxHp,
    dotDps: m.dotDps ?? fx.burnDps,
    healAmount: m.healAmount ?? fx.healAmount,
    healPercent: m.healPercent ?? fx.healPercent,
    hotHps: m.hotHps,
    energyGain: m.energyGain,
    speedMultiplier: m.speedMultiplier ?? fx.speedMultiplier,
    slowFactor: m.slowFactor ?? fx.slowFactor,
    fireRateMultiplier: m.fireRateMultiplier ?? fx.fireRateBoost,
    damageMultiplier: m.damageMultiplier,
    disableTowerActions: m.disableTowerActions,
    hypnotizeTower: m.hypnotizeTower,
    stunSec: m.stunSec ?? fx.stunDurationSec,
    deafSec: m.deafSec ?? fx.deafDurationSec,
    immuneToPsych: m.immuneToPsych,
    cleanseNegative: m.cleanseNegative,
    grantsImmunities: m.grantsImmunities,
    knockbackCols: m.knockbackCols,
    teleportCells: m.teleportCells,
    pullCells: m.pullCells,
    spawnType: m.spawnType,
    spawnCount: m.spawnCount,
    spawnOffsetCol: m.spawnOffsetCol,
    convertVictimTo: m.convertVictimTo,
    extraLives: m.extraLives ?? fx.extraLives,
    reviveHpPercent: m.reviveHpPercent ?? fx.reviveHpPercent,
    instakill: m.instakill,
    disappearOnHit: m.disappearOnHit,
    respectImmunity: m.respectImmunity,
  };
}

export function enemyHasDeclarativeImmunity(
  enemy: Enemy | undefined,
  type: EnemyType,
  immunity: EnemyImmunity
): boolean {
  const def = getEnemyDefLocal(type);
  const combinedIds = [
    ...(def?.effects ?? []),
    ...(enemy?.extraEffects ?? []),
  ];
  const effects = getDeclarativeEffects(combinedIds);
  for (const fx of effects) {
    if ((fx.trigger ?? 'passive') !== 'passive') continue;
    const grants = resolveModifiers(fx).grantsImmunities;
    if (grants && (grants.includes('all_effects') || grants.includes(immunity))) {
      return true;
    }
  }
  if (enemy?.activeEffects) {
    for (const active of Object.values(enemy.activeEffects)) {
      const fx = EFFECTS_CATALOG[active.id];
      const grants = fx ? resolveModifiers(fx).grantsImmunities : undefined;
      if (grants && (grants.includes('all_effects') || grants.includes(immunity))) {
        return true;
      }
    }
  }
  return false;
}

export function playEffectSound(sound?: EffectSoundKey) {
  if (!sound) return;
  switch (sound) {
    case 'explosion':
      soundEngine.playExplosion();
      break;
    case 'heal':
      soundEngine.playHeal();
      break;
    case 'revive':
      soundEngine.playRevive();
      break;
    case 'stun':
      soundEngine.playScream096();
      break;
    case 'scream066':
      soundEngine.playScream066();
      break;
    case 'pull':
      soundEngine.playPull012();
      break;
    case 'portal':
      soundEngine.playPocket106();
      break;
    case 'tesla':
      soundEngine.playTeslaArc();
      break;
    case 'blink':
      soundEngine.playBlink();
      break;
    case 'place':
      soundEngine.playPlace();
      break;
    case 'collect':
      soundEngine.playCollect();
      break;
  }
}

export function emitEffectVisual(
  s: SimState,
  fx: EffectDefinition,
  row: number,
  col: number,
  nextId: (prefix: string) => string,
  suppressSound = false
) {
  const vis = fx.visual;
  if (!vis) return;

  if (vis.waveKind) {
    s.effects.push({
      id: nextId('fx'),
      kind: vis.waveKind,
      row,
      col,
      timer: 0,
      duration: vis.waveDurationSec ?? 0.5,
      color: vis.waveColorRgb ?? fx.color,
      radiusPx: vis.waveRadiusPx,
    });
  }

  if (vis.floatingText) {
    s.effects.push({
      id: nextId('fx'),
      kind: 'text',
      row,
      col,
      timer: 0,
      duration: 0.85,
      text: vis.floatingText,
      color: vis.floatingTextColor ?? fx.color,
    });
  }

  if (vis.sound && !suppressSound) {
    playEffectSound(vis.sound);
  }
}

export function initEntityEffectTimers(
  entity: Tower | Enemy,
  effectIds?: string[]
) {
  const effects = getDeclarativeEffects(effectIds);
  if (effects.length === 0) return;
  entity.effectTimers = entity.effectTimers ?? {};
  entity.effectCooldowns = entity.effectCooldowns ?? {};
  entity.effectTriggered = entity.effectTriggered ?? {};
  entity.activeEffects = entity.activeEffects ?? {};

  for (const fx of effects) {
    if (fx.trigger === 'periodic') {
      const delay = fx.initialDelaySec ?? fx.intervalSec ?? fx.spawnIntervalSec ?? 3.0;
      entity.effectTimers[fx.id] = delay;
    }
    if (fx.trigger === 'passive') {
      const mods = resolveModifiers(fx);
      if (mods.extraLives && mods.extraLives > 0 && 'extraLivesLeft' in entity) {
        entity.extraLivesLeft = (entity.extraLivesLeft ?? 0) + mods.extraLives;
        entity.extraReviveHpPercent = mods.reviveHpPercent ?? 1.0;
      }
    }
  }
}

function getSourceRows(entity: Tower | Enemy): number[] {
  if ('occupiedRows' in entity && entity.occupiedRows.length > 0) {
    return entity.occupiedRows;
  }
  return [entity.row];
}

function isTowerMatchingFilter(tower: Tower, fx: EffectDefinition): boolean {
  if (fx.targetCategories && fx.targetCategories.length > 0) {
    if (!fx.targetCategories.includes(tower.category)) return false;
  }
  if (fx.targetTypes && fx.targetTypes.length > 0) {
    if (!fx.targetTypes.includes(tower.type)) return false;
  }
  if (fx.excludeTypes && fx.excludeTypes.includes(tower.type)) {
    return false;
  }
  return true;
}

function isEnemyMatchingFilter(enemy: Enemy, fx: EffectDefinition): boolean {
  if (fx.targetTypes && fx.targetTypes.length > 0) {
    if (!fx.targetTypes.includes(enemy.type)) return false;
  }
  if (fx.excludeTypes && fx.excludeTypes.includes(enemy.type)) {
    return false;
  }
  return true;
}

function isWithinArea(
  srcRows: number[],
  srcCol: number,
  tgtRows: number[],
  tgtCol: number,
  fx: EffectDefinition
): boolean {
  const shape = fx.areaShape ?? 'square';
  if (shape === 'global') return true;
  if (shape === 'lane') {
    return tgtRows.some((tr) => srcRows.includes(tr));
  }
  if (shape === 'rect') {
    const rRows = fx.radiusRows ?? fx.radiusCells ?? 1;
    const rCols = fx.radiusCols ?? fx.radiusCells ?? 1;
    return (
      tgtRows.some((tr) => srcRows.some((sr) => Math.abs(tr - sr) <= rRows)) &&
      Math.abs(tgtCol - srcCol) <= rCols
    );
  }
  const rad = fx.radiusCells ?? 1;
  return (
    tgtRows.some((tr) => srcRows.some((sr) => Math.abs(tr - sr) <= rad)) &&
    Math.abs(tgtCol - srcCol) <= rad
  );
}

function resolveTargetKind(
  fx: EffectDefinition,
  ownerSide: EffectOwnerSide
): 'towers' | 'enemies' | 'self' {
  const side = fx.targetSide ?? 'opponents';
  if (side === 'self') return 'self';
  if (side === 'towers') return 'towers';
  if (side === 'enemies') return 'enemies';
  if (side === 'allies') return ownerSide === 'tower' ? 'towers' : 'enemies';
  return ownerSide === 'tower' ? 'enemies' : 'towers';
}

export function applyDeclarativeEffectToTower(
  s: SimState,
  fx: EffectDefinition,
  tower: Tower,
  durationOverride: number | undefined,
  towersToRemove: Set<string>,
  nextId: (prefix: string) => string,
  emitVisual = true
) {
  if (tower.hp <= 0 || towersToRemove.has(tower.id)) return;
  const mods = resolveModifiers(fx);

  const isPsych = Boolean(mods.disableTowerActions || mods.hypnotizeTower || mods.deafSec);
  if (tower.immuneToPsych && isPsych) return;

  if (mods.instakill) {
    tower.hp = 0;
    towersToRemove.add(tower.id);
    if (emitVisual) emitEffectVisual(s, fx, tower.row, tower.col, nextId);
    return;
  }

  if (mods.damageInstant) {
    tower.hp -= mods.damageInstant;
    tower.hitFlash = 1;
  }
  if (mods.damagePercentMaxHp) {
    tower.hp -= tower.maxHp * mods.damagePercentMaxHp;
    tower.hitFlash = 1;
  }
  if (mods.healAmount) {
    tower.hp = Math.min(tower.maxHp, tower.hp + mods.healAmount);
  }
  if (mods.healPercent) {
    tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * mods.healPercent);
  }
  if (mods.cleanseNegative) {
    tower.stunTimer = 0;
    tower.deafTimer = 0;
    tower.suppressed = false;
    tower.hypnotized = false;
  }
  if (mods.stunSec) {
    tower.stunTimer = Math.max(tower.stunTimer, mods.stunSec);
  }
  if (mods.deafSec) {
    const dur = tower.radioProtected && fx.radioReducedSec ? fx.radioReducedSec : mods.deafSec;
    tower.deafTimer = Math.max(tower.deafTimer, dur);
  }
  if (mods.immuneToPsych) {
    tower.immuneToPsych = true;
  }

  if (tower.hp <= 0) {
    towersToRemove.add(tower.id);
  }

  const dur = durationOverride ?? fx.durationSec ?? 0;
  if (dur > 0) {
    tower.activeEffects = tower.activeEffects ?? {};
    const existing = tower.activeEffects[fx.id];
    const nextRemaining =
      fx.stackMode === 'stack'
        ? (existing?.remaining ?? 0) + dur
        : fx.stackMode === 'max'
        ? Math.max(existing?.remaining ?? 0, dur)
        : dur;

    tower.activeEffects[fx.id] = {
      id: fx.id,
      remaining: nextRemaining,
      dotDps: mods.dotDps,
      hotHps: mods.hotHps,
      fireRateMultiplier: mods.fireRateMultiplier,
      damageMultiplier: mods.damageMultiplier,
      disableTowerActions: mods.disableTowerActions,
      hypnotizeTower: mods.hypnotizeTower,
      immuneToPsych: mods.immuneToPsych,
      badgeLabel: fx.badgeLabel,
      color: fx.color,
      textColor: fx.badgeTextColor,
      tintColor: fx.visual?.targetTintColor,
    };
  }

  if (emitVisual) {
    emitEffectVisual(s, fx, tower.row, tower.col, nextId);
  }
}

export function applyDeclarativeEffectToEnemy(
  s: SimState,
  fx: EffectDefinition,
  enemy: Enemy,
  durationOverride: number | undefined,
  nextId: (prefix: string) => string,
  emitVisual = true,
  hasEnemyImmunityFn?: (type: EnemyType, immunity: EnemyImmunity, enemy?: Enemy) => boolean
) {
  if (enemy.hp <= 0) return;
  const mods = resolveModifiers(fx);

  if (mods.respectImmunity && mods.respectImmunity !== 'none') {
    const isImmune = hasEnemyImmunityFn
      ? hasEnemyImmunityFn(enemy.type, mods.respectImmunity, enemy)
      : enemyHasDeclarativeImmunity(enemy, enemy.type, mods.respectImmunity);
    if (isImmune) {
      if (emitVisual) {
        s.effects.push({
          id: nextId('fx'),
          kind: 'text',
          row: enemy.row,
          col: enemy.col,
          timer: 0,
          duration: 0.5,
          text: 'INMUNE',
          color: '#FB7185',
        });
      }
      return;
    }
  }

  if (mods.instakill) {
    enemy.hp = 0;
    enemy.hasRevived = true;
    if (emitVisual) emitEffectVisual(s, fx, enemy.row, enemy.col, nextId);
    return;
  }

  if (mods.damageInstant) {
    enemy.hp -= mods.damageInstant;
    enemy.hitFlash = 1;
  }
  if (mods.damagePercentMaxHp) {
    enemy.hp -= enemy.maxHp * mods.damagePercentMaxHp;
    enemy.hitFlash = 1;
  }
  if (mods.healAmount) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + mods.healAmount);
  }
  if (mods.healPercent) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * mods.healPercent);
  }
  if (mods.cleanseNegative) {
    enemy.slowTimer = 0;
    enemy.slowFactor = 0;
    enemy.burnTimer = 0;
    enemy.burnDps = 0;
    enemy.stunTimer = 0;
  }
  if (mods.knockbackCols) {
    enemy.col = Math.min(s.gridCols - 0.15, enemy.col + mods.knockbackCols);
  }
  if (mods.teleportCells) {
    enemy.col = Math.max(-0.15, Math.min(s.gridCols - 0.15, enemy.col - mods.teleportCells));
  }
  if (mods.stunSec) {
    enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, mods.stunSec);
  }

  const dur = durationOverride ?? fx.durationSec ?? 0;
  if (dur > 0) {
    enemy.activeEffects = enemy.activeEffects ?? {};
    const existing = enemy.activeEffects[fx.id];
    const nextRemaining =
      fx.stackMode === 'stack'
        ? (existing?.remaining ?? 0) + dur
        : fx.stackMode === 'max'
        ? Math.max(existing?.remaining ?? 0, dur)
        : dur;

    enemy.activeEffects[fx.id] = {
      id: fx.id,
      remaining: nextRemaining,
      dotDps: mods.dotDps,
      hotHps: mods.hotHps,
      slowFactor: mods.slowFactor,
      speedMultiplier: mods.speedMultiplier,
      damageMultiplier: mods.damageMultiplier,
      badgeLabel: fx.badgeLabel,
      color: fx.color,
      textColor: fx.badgeTextColor,
      tintColor: fx.visual?.targetTintColor,
    };
  }

  if (emitVisual) {
    emitEffectVisual(s, fx, enemy.row, enemy.col, nextId);
  }
}

function executeEffectFire(
  s: SimState,
  fx: EffectDefinition,
  ownerSide: EffectOwnerSide,
  owner: Tower | Enemy,
  towersToRemove: Set<string>,
  extraSpawns: DeclarativeSpawnRequest[],
  nextId: (prefix: string) => string,
  explicitEnemyTarget?: Enemy,
  explicitTowerTarget?: Tower,
  hasEnemyImmunityFn?: (type: EnemyType, immunity: EnemyImmunity, enemy?: Enemy) => boolean,
  durationOverride?: number
) {
  if (fx.chance !== undefined && fx.chance < 1 && Math.random() > fx.chance) {
    return;
  }

  const mods = resolveModifiers(fx);
  const srcRows = getSourceRows(owner);
  const srcCol = ownerSide === 'enemy' ? Math.min(s.gridCols - 1, Math.max(0, Math.round(owner.col))) : owner.col;
  const targetKind = resolveTargetKind(fx, ownerSide);

  if (mods.energyGain) {
    s.energy += mods.energyGain;
  }

  if (mods.spawnType) {
    const count = Math.max(1, mods.spawnCount ?? 1);
    const offsetCol = mods.spawnOffsetCol ?? -0.2;
    for (let i = 0; i < count; i++) {
      extraSpawns.push({
        type: mods.spawnType as EnemyType,
        row: owner.row,
        col: Math.max(0.4, Math.min(s.gridCols - 0.15, owner.col + offsetCol + i * 0.15)),
      });
    }
  }

  if (targetKind === 'self') {
    if (ownerSide === 'tower') {
      applyDeclarativeEffectToTower(s, fx, owner as Tower, durationOverride, towersToRemove, nextId, true);
    } else {
      applyDeclarativeEffectToEnemy(
        s,
        fx,
        owner as Enemy,
        durationOverride,
        nextId,
        true,
        hasEnemyImmunityFn
      );
    }
    return;
  }

  const shape = fx.areaShape ?? 'square';

  if (targetKind === 'towers') {
    let targets: Tower[] = [];
    if (shape === 'single' && explicitTowerTarget) {
      targets = isTowerMatchingFilter(explicitTowerTarget, fx) ? [explicitTowerTarget] : [];
    } else {
      targets = s.towers.filter((t) => {
        if (t.hp <= 0 || towersToRemove.has(t.id)) return false;
        if (fx.excludeSelf && ownerSide === 'tower' && t.id === owner.id) return false;
        if (!isTowerMatchingFilter(t, fx)) return false;
        return isWithinArea(srcRows, srcCol, [t.row], t.col, fx);
      });
      if (shape === 'single' && targets.length > 1) {
        targets.sort((a, b) => Math.abs(a.col - srcCol) - Math.abs(b.col - srcCol));
        targets = targets.slice(0, 1);
      }
    }
    if (fx.maxTargets && targets.length > fx.maxTargets) {
      targets = targets.slice(0, fx.maxTargets);
    }

    if (mods.pullCells && targets.length > 0) {
      const pullTarget = targets[0];
      const nextCol =
        pullTarget.col === srcCol
          ? srcCol
          : pullTarget.col + Math.sign(srcCol - pullTarget.col) * Math.min(mods.pullCells, Math.abs(srcCol - pullTarget.col));
      const occupant = s.towers.find(
        (t) => t.id !== pullTarget.id && t.row === pullTarget.row && t.col === nextCol && !towersToRemove.has(t.id)
      );
      if (occupant) occupant.col = pullTarget.col;
      pullTarget.col = nextCol;
      s.effects.push({
        id: nextId('fx'),
        kind: 'pull_beam',
        row: owner.row,
        col: owner.col,
        targetRow: pullTarget.row,
        targetCol: pullTarget.col,
        timer: 0,
        duration: 0.45,
      });
    }

    let emittedOriginVisual = false;
    for (const tgt of targets) {
      applyDeclarativeEffectToTower(
        s,
        fx,
        tgt,
        durationOverride,
        towersToRemove,
        nextId,
        shape === 'single' || !emittedOriginVisual
      );
      emittedOriginVisual = true;
    }
    if (targets.length === 0 && fx.trigger === 'periodic') {
      emitEffectVisual(s, fx, owner.row, owner.col, nextId);
    }
  } else {
    let targets: Enemy[] = [];
    if (shape === 'single' && explicitEnemyTarget) {
      targets = isEnemyMatchingFilter(explicitEnemyTarget, fx) ? [explicitEnemyTarget] : [];
    } else {
      targets = s.enemies.filter((e) => {
        if (e.hp <= 0 || e.skyOffsetRows > 0.3) return false;
        if (fx.excludeSelf && ownerSide === 'enemy' && e.id === owner.id) return false;
        if (!isEnemyMatchingFilter(e, fx)) return false;
        return isWithinArea(srcRows, srcCol, getSourceRows(e), e.col, fx);
      });
      if (shape === 'single' && targets.length > 1) {
        targets.sort((a, b) => Math.abs(a.col - srcCol) - Math.abs(b.col - srcCol));
        targets = targets.slice(0, 1);
      }
    }
    if (fx.maxTargets && targets.length > fx.maxTargets) {
      targets = targets.slice(0, fx.maxTargets);
    }

    if (targets.length > 0 && shape !== 'single') {
      emitEffectVisual(s, fx, owner.row, owner.col, nextId);
    }
    for (const tgt of targets) {
      applyDeclarativeEffectToEnemy(
        s,
        fx,
        tgt,
        durationOverride,
        nextId,
        shape === 'single',
        hasEnemyImmunityFn
      );
    }
  }
}

export function triggerDeclarativeHooks(
  s: SimState,
  hook: EffectTrigger,
  ownerSide: EffectOwnerSide,
  owner: Tower | Enemy,
  effectIds: string[] | undefined,
  towersToRemove: Set<string>,
  extraSpawns: DeclarativeSpawnRequest[],
  nextId: (prefix: string) => string,
  explicitEnemyTarget?: Enemy,
  explicitTowerTarget?: Tower,
  hasEnemyImmunityFn?: (type: EnemyType, immunity: EnemyImmunity, enemy?: Enemy) => boolean
) {
  const effects = getDeclarativeEffects(effectIds);
  if (effects.length === 0) return;

  owner.effectCooldowns = owner.effectCooldowns ?? {};
  owner.effectTriggered = owner.effectTriggered ?? {};

  for (const fx of effects) {
    if (fx.trigger !== hook) continue;

    if (fx.maxTriggers !== undefined && (owner.effectTriggered[fx.id] ?? 0) >= fx.maxTriggers) {
      continue;
    }
    if ((owner.effectCooldowns[fx.id] ?? 0) > 0) {
      continue;
    }

    owner.effectTriggered[fx.id] = (owner.effectTriggered[fx.id] ?? 0) + 1;
    if (fx.cooldownSec && fx.cooldownSec > 0) {
      owner.effectCooldowns[fx.id] = fx.cooldownSec;
    }

    executeEffectFire(
      s,
      fx,
      ownerSide,
      owner,
      towersToRemove,
      extraSpawns,
      nextId,
      explicitEnemyTarget,
      explicitTowerTarget,
      hasEnemyImmunityFn
    );
  }
}

export function triggerProjectileDeclarativeHits(
  s: SimState,
  effectIds: string[] | undefined,
  hitEnemy: Enemy,
  nextId: (prefix: string) => string,
  hasEnemyImmunityFn?: (type: EnemyType, immunity: EnemyImmunity, enemy?: Enemy) => boolean
) {
  const effects = getDeclarativeEffects(effectIds);
  if (effects.length === 0) return;
  const dummyRemove = new Set<string>();
  const dummySpawns: DeclarativeSpawnRequest[] = [];

  for (const fx of effects) {
    if (fx.trigger !== 'on_hit' && fx.trigger !== 'on_attack') continue;
    if (fx.chance !== undefined && fx.chance < 1 && Math.random() > fx.chance) continue;

    const shape = fx.areaShape ?? 'single';
    if (shape === 'single') {
      applyDeclarativeEffectToEnemy(
        s,
        fx,
        hitEnemy,
        undefined,
        nextId,
        true,
        hasEnemyImmunityFn
      );
    } else {
      executeEffectFire(
        s,
        fx,
        'tower',
        hitEnemy,
        dummyRemove,
        dummySpawns,
        nextId,
        hitEnemy,
        undefined,
        hasEnemyImmunityFn
      );
    }
  }
}

export function stepDeclarativeEffects(
  s: SimState,
  dt: number,
  towersToRemove: Set<string>,
  extraSpawns: DeclarativeSpawnRequest[],
  nextId: (prefix: string) => string,
  hasEnemyImmunityFn: (type: EnemyType, immunity: EnemyImmunity, enemy?: Enemy) => boolean
) {
  // 1. Run passive, continuous_aura, periodic, on_hp_below from all active towers
  for (const tower of s.towers) {
    if (tower.hp <= 0 || towersToRemove.has(tower.id)) continue;
    const def = getTowerDefLocal(tower.type);
    const effects = getDeclarativeEffects(def?.effects);
    if (effects.length === 0) continue;

    tower.effectTimers = tower.effectTimers ?? {};
    tower.effectCooldowns = tower.effectCooldowns ?? {};
    tower.effectTriggered = tower.effectTriggered ?? {};

    for (const key of Object.keys(tower.effectCooldowns)) {
      if (tower.effectCooldowns[key] > 0) {
        tower.effectCooldowns[key] = Math.max(0, tower.effectCooldowns[key] - dt);
      }
    }

    const towerInactive =
      tower.suppressed || tower.stunTimer > 0 || tower.deafTimer > 0 || tower.customDisabled;

    for (const fx of effects) {
      const trig = fx.trigger ?? 'passive';
      const mods = resolveModifiers(fx);

      if (trig === 'passive') {
        if (mods.immuneToPsych) tower.immuneToPsych = true;
        if (mods.hotHps && tower.hp < tower.maxHp) {
          tower.hp = Math.min(tower.maxHp, tower.hp + mods.hotHps * dt);
        }
        tower.activeEffects = tower.activeEffects ?? {};
        tower.activeEffects[fx.id] = {
          id: fx.id,
          remaining: 0.15,
          fireRateMultiplier: mods.fireRateMultiplier,
          damageMultiplier: mods.damageMultiplier,
          immuneToPsych: mods.immuneToPsych,
          badgeLabel: fx.badgeLabel,
          color: fx.color,
          textColor: fx.badgeTextColor,
          tintColor: fx.visual?.targetTintColor,
        };
      } else if (trig === 'continuous_aura' && !towerInactive) {
        executeEffectFire(
          s,
          fx,
          'tower',
          tower,
          towersToRemove,
          extraSpawns,
          nextId,
          undefined,
          undefined,
          hasEnemyImmunityFn,
          0.16
        );
      } else if (trig === 'periodic' && !towerInactive) {
        const interval = fx.intervalSec ?? fx.spawnIntervalSec ?? 4.0;
        const prev = tower.effectTimers[fx.id] ?? fx.initialDelaySec ?? interval;
        const nextVal = prev - dt;
        if (nextVal <= 0) {
          tower.effectTimers[fx.id] = interval;
          executeEffectFire(
            s,
            fx,
            'tower',
            tower,
            towersToRemove,
            extraSpawns,
            nextId,
            undefined,
            undefined,
            hasEnemyImmunityFn
          );
        } else {
          tower.effectTimers[fx.id] = nextVal;
        }
      } else if (trig === 'on_hp_below') {
        const ratio = fx.hpThresholdRatio ?? 0.5;
        const maxT = fx.maxTriggers ?? 1;
        if (
          tower.hp / tower.maxHp <= ratio &&
          (tower.effectTriggered[fx.id] ?? 0) < maxT
        ) {
          tower.effectTriggered[fx.id] = (tower.effectTriggered[fx.id] ?? 0) + 1;
          executeEffectFire(
            s,
            fx,
            'tower',
            tower,
            towersToRemove,
            extraSpawns,
            nextId,
            undefined,
            undefined,
            hasEnemyImmunityFn
          );
        }
      }
    }
  }

  // 2. Run passive, continuous_aura, periodic, on_hp_below from all active enemies
  for (const enemy of s.enemies) {
    if (enemy.hp <= 0) continue;
    const def = getEnemyDefLocal(enemy.type);
    const combinedIds = [
      ...(def?.effects ?? []),
      ...(enemy.extraEffects ?? []),
    ];
    const effects = getDeclarativeEffects(combinedIds);
    if (effects.length === 0) continue;

    enemy.effectTimers = enemy.effectTimers ?? {};
    enemy.effectCooldowns = enemy.effectCooldowns ?? {};
    enemy.effectTriggered = enemy.effectTriggered ?? {};

    for (const key of Object.keys(enemy.effectCooldowns)) {
      if (enemy.effectCooldowns[key] > 0) {
        enemy.effectCooldowns[key] = Math.max(0, enemy.effectCooldowns[key] - dt);
      }
    }

    if (enemy.skyOffsetRows > 0.3) continue;
    const stunned = (enemy.stunTimer ?? 0) > 0;

    for (const fx of effects) {
      const trig = fx.trigger ?? 'passive';
      const mods = resolveModifiers(fx);

      if (trig === 'passive') {
        if (mods.hotHps && enemy.hp < enemy.maxHp) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + mods.hotHps * dt);
        }
        enemy.activeEffects = enemy.activeEffects ?? {};
        enemy.activeEffects[fx.id] = {
          id: fx.id,
          remaining: 0.15,
          speedMultiplier: mods.speedMultiplier,
          damageMultiplier: mods.damageMultiplier,
          badgeLabel: fx.badgeLabel,
          color: fx.color,
          textColor: fx.badgeTextColor,
          tintColor: fx.visual?.targetTintColor,
        };
      } else if (trig === 'continuous_aura' && !stunned) {
        executeEffectFire(
          s,
          fx,
          'enemy',
          enemy,
          towersToRemove,
          extraSpawns,
          nextId,
          undefined,
          undefined,
          hasEnemyImmunityFn,
          0.16
        );
      } else if (trig === 'periodic' && !stunned) {
        const interval = fx.intervalSec ?? fx.spawnIntervalSec ?? fx.screamIntervalSec ?? 4.0;
        const prev = enemy.effectTimers[fx.id] ?? fx.initialDelaySec ?? interval;
        const nextVal = prev - dt;
        if (nextVal <= 0) {
          enemy.effectTimers[fx.id] = interval;
          executeEffectFire(
            s,
            fx,
            'enemy',
            enemy,
            towersToRemove,
            extraSpawns,
            nextId,
            undefined,
            undefined,
            hasEnemyImmunityFn
          );
        } else {
          enemy.effectTimers[fx.id] = nextVal;
        }
      } else if (trig === 'on_hp_below') {
        const ratio = fx.hpThresholdRatio ?? 0.5;
        const maxT = fx.maxTriggers ?? 1;
        if (
          enemy.hp / enemy.maxHp <= ratio &&
          (enemy.effectTriggered[fx.id] ?? 0) < maxT
        ) {
          enemy.effectTriggered[fx.id] = (enemy.effectTriggered[fx.id] ?? 0) + 1;
          executeEffectFire(
            s,
            fx,
            'enemy',
            enemy,
            towersToRemove,
            extraSpawns,
            nextId,
            undefined,
            undefined,
            hasEnemyImmunityFn
          );
        }
      }
    }
  }

  // 3. Tick activeEffects on all towers & compute aggregate multipliers/badges
  for (const tower of s.towers) {
    let fireRateMult = 1;
    let damageMult = 1;
    let customDisabled = false;
    let badge: { label: string; color: string; textColor?: string } | undefined;
    let tintColor: string | undefined;

    if (tower.activeEffects) {
      const nextMap: Record<string, ActiveEffectState> = {};
      for (const [id, st] of Object.entries(tower.activeEffects)) {
        const rem = st.remaining - dt;
        if (st.dotDps) {
          tower.hp -= st.dotDps * dt;
          if (tower.hp <= 0) towersToRemove.add(tower.id);
        }
        if (st.hotHps && tower.hp > 0 && tower.hp < tower.maxHp) {
          tower.hp = Math.min(tower.maxHp, tower.hp + st.hotHps * dt);
        }
        if (st.fireRateMultiplier) fireRateMult *= st.fireRateMultiplier;
        if (st.damageMultiplier) damageMult *= st.damageMultiplier;
        if (st.disableTowerActions) customDisabled = true;
        if (st.hypnotizeTower && !tower.radioProtected && !tower.immuneToPsych) {
          tower.hypnotized = true;
        }
        if (st.immuneToPsych) tower.immuneToPsych = true;
        if (st.badgeLabel && st.color && !badge) {
          badge = { label: st.badgeLabel, color: st.color, textColor: st.textColor };
        }
        if (st.tintColor && !tintColor) tintColor = st.tintColor;

        if (rem > 0) {
          nextMap[id] = { ...st, remaining: rem };
        }
      }
      tower.activeEffects = nextMap;
    }

    tower.customFireRateMult = fireRateMult;
    tower.customDamageMult = damageMult;
    tower.customDisabled = customDisabled;
    if (customDisabled) tower.suppressed = true;
    tower.customBadge = badge;
    tower.customTintColor = tintColor;
  }

  // 4. Tick activeEffects & stunTimer on all enemies
  for (const enemy of s.enemies) {
    if (enemy.stunTimer && enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
    }

    let speedMult = 1;
    let damageMult = 1;
    let badge: { label: string; color: string; textColor?: string } | undefined;
    let tintColor: string | undefined;

    if (enemy.activeEffects) {
      const nextMap: Record<string, ActiveEffectState> = {};
      for (const [id, st] of Object.entries(enemy.activeEffects)) {
        const rem = st.remaining - dt;
        if (st.dotDps) {
          enemy.hp -= st.dotDps * dt;
        }
        if (st.hotHps && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + st.hotHps * dt);
        }
        if (st.slowFactor) speedMult *= Math.max(0.1, 1 - st.slowFactor);
        if (st.speedMultiplier) speedMult *= st.speedMultiplier;
        if (st.damageMultiplier) damageMult *= st.damageMultiplier;
        if (st.badgeLabel && st.color && !badge) {
          badge = { label: st.badgeLabel, color: st.color, textColor: st.textColor };
        }
        if (st.tintColor && !tintColor) tintColor = st.tintColor;

        if (rem > 0) {
          nextMap[id] = { ...st, remaining: rem };
        }
      }
      enemy.activeEffects = nextMap;
    }

    enemy.customSpeedMult = speedMult;
    enemy.customDamageMult = damageMult;
    enemy.customBadge = badge;
    enemy.customTintColor = tintColor;
  }
}
