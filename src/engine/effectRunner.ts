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
    shieldHp: m.shieldHp,
    energyGain: m.energyGain,
    energyPerSec: m.energyPerSec,
    speedMultiplier: m.speedMultiplier ?? fx.speedMultiplier,
    slowFactor: m.slowFactor ?? fx.slowFactor,
    fireRateMultiplier: m.fireRateMultiplier ?? fx.fireRateBoost,
    damageMultiplier: m.damageMultiplier,
    projectileSpeedMultiplier: m.projectileSpeedMultiplier,
    maxHpMultiplier: m.maxHpMultiplier,
    damageReduction: m.damageReduction,
    vulnerableMultiplier: m.vulnerableMultiplier,
    lifestealRatio: m.lifestealRatio,
    thornsDps: m.thornsDps,
    disableTowerActions: m.disableTowerActions,
    hypnotizeTower: m.hypnotizeTower,
    stunSec: m.stunSec ?? fx.stunDurationSec,
    deafSec: m.deafSec ?? fx.deafDurationSec,
    silenceSec: m.silenceSec,
    immuneToPsych: m.immuneToPsych,
    cleanseNegative: m.cleanseNegative,
    grantsImmunities: m.grantsImmunities,
    knockbackCols: m.knockbackCols,
    teleportCells: m.teleportCells,
    pullCells: m.pullCells,
    laneShift: m.laneShift,
    spawnType: m.spawnType,
    spawnCount: m.spawnCount,
    spawnOffsetCol: m.spawnOffsetCol,
    convertVictimTo: m.convertVictimTo,
    applyEffectIds: m.applyEffectIds,
    removeEffectIds: m.removeEffectIds,
    extraLives: m.extraLives ?? fx.extraLives,
    reviveHpPercent: m.reviveHpPercent ?? fx.reviveHpPercent,
    instakill: m.instakill,
    disappearOnHit: m.disappearOnHit,
    respectImmunity: m.respectImmunity,
    executeBelowHpRatio: m.executeBelowHpRatio,
    reflectDamagePercent: m.reflectDamagePercent,
    chainBounceCount: m.chainBounceCount,
    chainBounceRangeCols: m.chainBounceRangeCols,
    chainDamageDecay: m.chainDamageDecay,
    splitOnDeathCount: m.splitOnDeathCount,
    splitOnDeathType: m.splitOnDeathType,
    transformToType: m.transformToType,
    shieldDecayPerSec: m.shieldDecayPerSec,
  };
}

export function enemyHasDeclarativeImmunity(
  enemy: Enemy | undefined,
  type: EnemyType,
  immunity: EnemyImmunity
): boolean {
  if (enemy?.extraImmunities) {
    if (enemy.extraImmunities.includes('all_effects') || enemy.extraImmunities.includes(immunity)) {
      return true;
    }
  }
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
    case 'door':
      soundEngine.playDoor079();
      break;
    case 'horde':
      soundEngine.playFlagHorde();
      break;
    case 'alert':
      soundEngine.playTesla();
      break;
  }
}

export function spawnParticleBurst(
  s: SimState,
  row: number,
  col: number,
  color: string,
  count: number,
  speedPx: number,
  durationSec: number,
  sizePx: number,
  nextId: (prefix: string) => string
) {
  const total = Math.min(28, Math.max(1, count));
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 * i) / total + (Math.random() - 0.5) * 0.45;
    const speed = speedPx * (0.55 + Math.random() * 0.7);
    s.effects.push({
      id: nextId('pt'),
      kind: 'particle',
      row,
      col,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      sizePx,
      timer: 0,
      duration: durationSec * (0.75 + Math.random() * 0.5),
      color,
    });
  }
}

export function emitEffectVisual(
  s: SimState,
  fx: EffectDefinition,
  row: number,
  col: number,
  nextId: (prefix: string) => string,
  suppressSound = false,
  targetPos?: { row: number; col: number }
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

  if (vis.beamToTarget && targetPos) {
    s.effects.push({
      id: nextId('fx'),
      kind: 'beam',
      row,
      col,
      targetRow: targetPos.row,
      targetCol: targetPos.col,
      timer: 0,
      duration: vis.beamDurationSec ?? 0.28,
      color: vis.beamColorRgb ?? fx.color,
      lineWidth: vis.beamWidth ?? 3,
    });
  }

  if (vis.particlePresetId && s.particleSystem) {
    const meta = s.particleSystem.emitPreset(
      vis.particlePresetId,
      targetPos?.row ?? row,
      targetPos?.col ?? col
    );
    if (meta?.screenShake && meta.screenShake > 0) {
      s.shakeIntensity = Math.max(s.shakeIntensity, meta.screenShake);
      s.shakeTimer = Math.max(s.shakeTimer, 0.35);
    }
    if (meta?.screenFlashRgb) {
      s.flashRgb = meta.screenFlashRgb;
      s.flashAlpha = Math.max(s.flashAlpha, meta.screenFlashAlpha ?? 0.3);
      s.flashDecaySpeed = 2.6;
    }
  }

  if (vis.particleBurst) {
    const pb = vis.particleBurst;
    spawnParticleBurst(
      s,
      targetPos?.row ?? row,
      targetPos?.col ?? col,
      pb.color || fx.color,
      pb.count ?? 8,
      pb.speedPx ?? 72,
      pb.durationSec ?? 0.45,
      pb.sizePx ?? 3.5,
      nextId
    );
  }

  if (vis.screenShake && vis.screenShake > 0) {
    s.shakeIntensity = Math.max(s.shakeIntensity, vis.screenShake);
    s.shakeTimer = Math.max(s.shakeTimer, 0.35);
  }

  if (vis.screenFlashRgb) {
    s.flashRgb = vis.screenFlashRgb;
    s.flashAlpha = Math.max(s.flashAlpha, vis.screenFlashAlpha ?? 0.45);
    s.flashDecaySpeed = 2.6;
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
      if (mods.maxHpMultiplier && mods.maxHpMultiplier > 0 && mods.maxHpMultiplier !== 1) {
        entity.maxHp = Math.max(1, Math.round(entity.maxHp * mods.maxHpMultiplier));
        entity.hp = Math.max(1, Math.round(entity.hp * mods.maxHpMultiplier));
      }
      if (mods.shieldHp && mods.shieldHp > 0) {
        entity.shieldHp = (entity.shieldHp ?? 0) + mods.shieldHp;
        if (fx.visual?.shieldColor) entity.shieldColor = fx.visual.shieldColor;
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
  const ratio = tower.hp / Math.max(1, tower.maxHp);
  if (fx.minHpRatio !== undefined && ratio < fx.minHpRatio) return false;
  if (fx.maxHpRatio !== undefined && ratio > fx.maxHpRatio) return false;
  return true;
}

function isEnemyMatchingFilter(enemy: Enemy, fx: EffectDefinition): boolean {
  if (fx.targetTypes && fx.targetTypes.length > 0) {
    if (!fx.targetTypes.includes(enemy.type)) return false;
  }
  if (fx.excludeTypes && fx.excludeTypes.includes(enemy.type)) {
    return false;
  }
  if (fx.onlyAttacking && !enemy.isAttacking) return false;
  if (fx.onlyElite && !enemy.customBadge) return false;
  const ratio = enemy.hp / Math.max(1, enemy.maxHp);
  if (fx.minHpRatio !== undefined && ratio < fx.minHpRatio) return false;
  if (fx.maxHpRatio !== undefined && ratio > fx.maxHpRatio) return false;
  return true;
}

function sortByPriority<T extends { hp: number; maxHp: number; row: number; col: number }>(
  list: T[],
  priority: EffectDefinition['priority'],
  srcRow: number,
  srcCol: number
): T[] {
  if (!priority || list.length <= 1) return list;
  if (priority === 'random') {
    return shuffleInPlace(list);
  }
  return list.sort((a, b) => {
    if (priority === 'closest') {
      const da = Math.abs(a.col - srcCol) + Math.abs(a.row - srcRow);
      const db = Math.abs(b.col - srcCol) + Math.abs(b.row - srcRow);
      return da - db;
    }
    if (priority === 'furthest') {
      const da = Math.abs(a.col - srcCol) + Math.abs(a.row - srcRow);
      const db = Math.abs(b.col - srcCol) + Math.abs(b.row - srcRow);
      return db - da;
    }
    if (priority === 'lowest_hp') {
      return a.hp - b.hp;
    }
    if (priority === 'highest_hp') {
      return b.hp - a.hp;
    }
    return 0;
  });
}

function isWithinArea(
  srcRows: number[],
  srcCol: number,
  tgtRows: number[],
  tgtCol: number,
  fx: EffectDefinition,
  ownerSide: EffectOwnerSide
): boolean {
  const shape = fx.areaShape ?? 'square';
  if (shape === 'global' || shape === 'random') return true;
  if (shape === 'lane') {
    return tgtRows.some((tr) => srcRows.includes(tr));
  }
  if (shape === 'cross') {
    const rad = fx.radiusCells ?? 1;
    const sameRow = tgtRows.some((tr) => srcRows.includes(tr)) && Math.abs(tgtCol - srcCol) <= rad;
    const sameCol =
      Math.abs(tgtCol - srcCol) <= 0.45 &&
      tgtRows.some((tr) => srcRows.some((sr) => Math.abs(tr - sr) <= rad));
    return sameRow || sameCol;
  }
  if (shape === 'cone_front') {
    const rRows = fx.radiusRows ?? 0;
    const rCols = fx.radiusCols ?? fx.radiusCells ?? 2;
    const rowOk = tgtRows.some((tr) => srcRows.some((sr) => Math.abs(tr - sr) <= rRows));
    if (!rowOk) return false;
    return ownerSide === 'tower'
      ? tgtCol >= srcCol - 0.15 && tgtCol <= srcCol + rCols
      : tgtCol <= srcCol + 0.15 && tgtCol >= srcCol - rCols;
  }
  if (shape === 'lane_behind') {
    const rRows = fx.radiusRows ?? 0;
    const rCols = fx.radiusCols ?? fx.radiusCells ?? 2;
    const rowOk = tgtRows.some((tr) => srcRows.some((sr) => Math.abs(tr - sr) <= rRows));
    if (!rowOk) return false;
    return ownerSide === 'tower'
      ? tgtCol <= srcCol + 0.15 && tgtCol >= srcCol - rCols
      : tgtCol >= srcCol - 0.15 && tgtCol <= srcCol + rCols;
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

function dealMitigatedTowerDamage(tower: Tower, rawAmount: number) {
  const vuln = tower.customVulnerableMult ?? 1;
  const red = Math.min(0.85, Math.max(0, tower.customDamageReduction ?? 0));
  let dmg = Math.max(0, rawAmount * vuln * (1 - red));
  if (tower.shieldHp && tower.shieldHp > 0) {
    const absorbed = Math.min(tower.shieldHp, dmg);
    tower.shieldHp -= absorbed;
    dmg -= absorbed;
  }
  if (dmg > 0) {
    tower.hp -= dmg;
    tower.hitFlash = 1;
  }
}

function dealMitigatedEnemyDamage(enemy: Enemy, rawAmount: number) {
  const vuln = enemy.customVulnerableMult ?? 1;
  const red = Math.min(0.85, Math.max(0, enemy.customDamageReduction ?? 0));
  let dmg = Math.max(0, rawAmount * vuln * (1 - red));
  if (enemy.shieldHp && enemy.shieldHp > 0) {
    const absorbed = Math.min(enemy.shieldHp, dmg);
    enemy.shieldHp -= absorbed;
    dmg -= absorbed;
  }
  if (dmg > 0) {
    enemy.hp -= dmg;
    enemy.hitFlash = 1;
  }
}

export function applyDeclarativeEffectToTower(
  s: SimState,
  fx: EffectDefinition,
  tower: Tower,
  durationOverride: number | undefined,
  towersToRemove: Set<string>,
  nextId: (prefix: string) => string,
  emitVisual = true,
  extraSpawns?: DeclarativeSpawnRequest[],
  originPos?: { row: number; col: number },
  chainDepth = 0
) {
  if (tower.hp <= 0 || towersToRemove.has(tower.id)) return;
  const mods = resolveModifiers(fx);

  const isPsych = Boolean(mods.disableTowerActions || mods.hypnotizeTower || mods.deafSec);
  if (tower.immuneToPsych && isPsych) return;

  if (mods.instakill) {
    tower.hp = 0;
    towersToRemove.add(tower.id);
    if (mods.convertVictimTo && extraSpawns) {
      extraSpawns.push({
        type: mods.convertVictimTo as EnemyType,
        row: tower.row,
        col: tower.col,
      });
    }
    if (emitVisual) emitEffectVisual(s, fx, originPos?.row ?? tower.row, originPos?.col ?? tower.col, nextId, false, { row: tower.row, col: tower.col });
    return;
  }

  if (mods.damageInstant) {
    dealMitigatedTowerDamage(tower, mods.damageInstant);
  }
  if (mods.damagePercentMaxHp) {
    dealMitigatedTowerDamage(tower, tower.maxHp * mods.damagePercentMaxHp);
  }
  if (mods.healAmount) {
    tower.hp = Math.min(tower.maxHp, tower.hp + mods.healAmount);
  }
  if (mods.healPercent) {
    tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * mods.healPercent);
  }
  if (mods.shieldHp && mods.shieldHp > 0) {
    tower.shieldHp = (tower.shieldHp ?? 0) + mods.shieldHp;
    if (fx.visual?.shieldColor) tower.shieldColor = fx.visual.shieldColor;
  }
  if (mods.cleanseNegative) {
    tower.stunTimer = 0;
    tower.deafTimer = 0;
    tower.suppressed = false;
    tower.hypnotized = false;
    if (tower.activeEffects) {
      for (const [eid, st] of Object.entries(tower.activeEffects)) {
        if (st.dotDps || st.disableTowerActions || st.hypnotizeTower || (st.vulnerableMultiplier ?? 1) > 1) {
          delete tower.activeEffects[eid];
        }
      }
    }
  }
  if (mods.removeEffectIds && tower.activeEffects) {
    for (const rid of mods.removeEffectIds) {
      delete tower.activeEffects[rid];
    }
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
    if (mods.convertVictimTo && extraSpawns) {
      extraSpawns.push({
        type: mods.convertVictimTo as EnemyType,
        row: tower.row,
        col: tower.col,
      });
    }
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
      energyPerSec: mods.energyPerSec,
      fireRateMultiplier: mods.fireRateMultiplier,
      damageMultiplier: mods.damageMultiplier,
      projectileSpeedMultiplier: mods.projectileSpeedMultiplier,
      damageReduction: mods.damageReduction,
      vulnerableMultiplier: mods.vulnerableMultiplier,
      lifestealRatio: mods.lifestealRatio,
      thornsDps: mods.thornsDps,
      reflectDamagePercent: mods.reflectDamagePercent,
      shieldDecayPerSec: mods.shieldDecayPerSec,
      disableTowerActions: mods.disableTowerActions,
      hypnotizeTower: mods.hypnotizeTower,
      immuneToPsych: mods.immuneToPsych,
      badgeLabel: fx.badgeLabel,
      color: fx.color,
      textColor: fx.badgeTextColor,
      tintColor: fx.visual?.targetTintColor,
    };
  }

  if (mods.applyEffectIds && chainDepth < 2) {
    for (const cid of mods.applyEffectIds) {
      const chainedFx = EFFECTS_CATALOG[cid];
      if (chainedFx) {
        applyDeclarativeEffectToTower(
          s,
          chainedFx,
          tower,
          undefined,
          towersToRemove,
          nextId,
          false,
          extraSpawns,
          originPos,
          chainDepth + 1
        );
      }
    }
  }

  if (emitVisual) {
    emitEffectVisual(
      s,
      fx,
      originPos?.row ?? tower.row,
      originPos?.col ?? tower.col,
      nextId,
      false,
      { row: tower.row, col: tower.col }
    );
  }
}

export function applyDeclarativeEffectToEnemy(
  s: SimState,
  fx: EffectDefinition,
  enemy: Enemy,
  durationOverride: number | undefined,
  nextId: (prefix: string) => string,
  emitVisual = true,
  hasEnemyImmunityFn?: (type: EnemyType, immunity: EnemyImmunity, enemy?: Enemy) => boolean,
  originPos?: { row: number; col: number },
  chainDepth = 0
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
    if (emitVisual) {
      emitEffectVisual(
        s,
        fx,
        originPos?.row ?? enemy.row,
        originPos?.col ?? enemy.col,
        nextId,
        false,
        { row: enemy.row, col: enemy.col }
      );
    }
    return;
  }

  if (mods.damageInstant) {
    dealMitigatedEnemyDamage(enemy, mods.damageInstant);
  }
  if (mods.damagePercentMaxHp) {
    dealMitigatedEnemyDamage(enemy, enemy.maxHp * mods.damagePercentMaxHp);
  }
  if (mods.healAmount) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + mods.healAmount);
  }
  if (mods.healPercent) {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * mods.healPercent);
  }
  if (mods.shieldHp && mods.shieldHp > 0) {
    enemy.shieldHp = (enemy.shieldHp ?? 0) + mods.shieldHp;
    if (fx.visual?.shieldColor) enemy.shieldColor = fx.visual.shieldColor;
  }
  if (mods.cleanseNegative) {
    enemy.slowTimer = 0;
    enemy.slowFactor = 0;
    enemy.burnTimer = 0;
    enemy.burnDps = 0;
    enemy.stunTimer = 0;
    enemy.silenceTimer = 0;
    if (enemy.activeEffects) {
      for (const [eid, st] of Object.entries(enemy.activeEffects)) {
        if (st.dotDps || st.slowFactor || st.silence || (st.vulnerableMultiplier ?? 1) > 1) {
          delete enemy.activeEffects[eid];
        }
      }
    }
  }
  if (mods.removeEffectIds && enemy.activeEffects) {
    for (const rid of mods.removeEffectIds) {
      delete enemy.activeEffects[rid];
    }
  }
  if (mods.knockbackCols) {
    enemy.col = Math.min(s.gridCols - 0.15, enemy.col + mods.knockbackCols);
  }
  if (mods.teleportCells) {
    enemy.col = Math.max(-0.15, Math.min(s.gridCols - 0.15, enemy.col - mods.teleportCells));
  }
  if (mods.laneShift !== undefined && mods.laneShift !== 0 && s.gridRows > 1) {
    const delta = mods.laneShift;
    const span = enemy.occupiedRows.length;
    const nextMin = Math.max(0, Math.min(s.gridRows - span, enemy.occupiedRows[0] + delta));
    enemy.occupiedRows = Array.from({ length: span }, (_, idx) => nextMin + idx);
    enemy.row = enemy.occupiedRows[0];
  }
  if (mods.executeBelowHpRatio !== undefined && enemy.hp > 0) {
    if (enemy.hp / Math.max(1, enemy.maxHp) <= mods.executeBelowHpRatio) {
      enemy.hp = 0;
      enemy.hasRevived = true;
      s.effects.push({
        id: nextId('fx'),
        kind: 'text',
        row: enemy.row,
        col: enemy.col,
        timer: 0,
        duration: 0.9,
        text: fx.visual?.floatingText ?? 'EJECUCIÓN',
        color: fx.visual?.floatingTextColor ?? '#EF4444',
      });
      if (emitVisual) {
        emitEffectVisual(
          s,
          fx,
          originPos?.row ?? enemy.row,
          originPos?.col ?? enemy.col,
          nextId,
          false,
          { row: enemy.row, col: enemy.col }
        );
      }
      return;
    }
  }
  if (mods.transformToType && enemy.hp > 0) {
    const newDef = getEnemyDefLocal(mods.transformToType as EnemyType);
    if (newDef) {
      const ratio = enemy.hp / Math.max(1, enemy.maxHp);
      enemy.type = newDef.type;
      enemy.maxHp = Math.max(1, Math.round(newDef.hp));
      enemy.hp = Math.max(1, Math.round(enemy.maxHp * ratio));
      enemy.baseSpeed = newDef.speed;
      enemy.currentSpeed = newDef.speed;
      enemy.dps = newDef.dps;
      const laneSpan = newDef.behavior?.laneSpan ?? 1;
      if (laneSpan === 2 && enemy.occupiedRows.length < 2 && s.gridRows > 1) {
        const second =
          enemy.row + 1 < s.gridRows ? enemy.row + 1 : Math.max(0, enemy.row - 1);
        enemy.occupiedRows = [...new Set([enemy.row, second])].sort((a, b) => a - b);
        enemy.row = enemy.occupiedRows[0];
      } else if (laneSpan === 1) {
        enemy.occupiedRows = [enemy.row];
      }
      s.effects.push({
        id: nextId('fx'),
        kind: 'revive_ring',
        row: enemy.row,
        col: enemy.col,
        timer: 0,
        duration: 0.55,
      });
    }
  }
  if (mods.stunSec) {
    enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, mods.stunSec);
  }
  if (mods.silenceSec) {
    enemy.silenceTimer = Math.max(enemy.silenceTimer ?? 0, mods.silenceSec);
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
      damageReduction: mods.damageReduction,
      vulnerableMultiplier: mods.vulnerableMultiplier,
      lifestealRatio: mods.lifestealRatio,
      thornsDps: mods.thornsDps,
      reflectDamagePercent: mods.reflectDamagePercent,
      shieldDecayPerSec: mods.shieldDecayPerSec,
      silence: Boolean(mods.silenceSec),
      badgeLabel: fx.badgeLabel,
      color: fx.color,
      textColor: fx.badgeTextColor,
      tintColor: fx.visual?.targetTintColor,
    };
  }

  if (mods.applyEffectIds && chainDepth < 2) {
    for (const cid of mods.applyEffectIds) {
      const chainedFx = EFFECTS_CATALOG[cid];
      if (chainedFx) {
        applyDeclarativeEffectToEnemy(
          s,
          chainedFx,
          enemy,
          undefined,
          nextId,
          false,
          hasEnemyImmunityFn,
          originPos,
          chainDepth + 1
        );
      }
    }
  }

  if (emitVisual) {
    emitEffectVisual(
      s,
      fx,
      originPos?.row ?? enemy.row,
      originPos?.col ?? enemy.col,
      nextId,
      false,
      { row: enemy.row, col: enemy.col }
    );
  }
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
): boolean {
  if (fx.chance !== undefined && fx.chance < 1 && Math.random() > fx.chance) {
    return false;
  }

  const mods = resolveModifiers(fx);
  const srcRows = getSourceRows(owner);
  const srcCol = ownerSide === 'enemy' ? Math.min(s.gridCols - 1, Math.max(0, Math.round(owner.col))) : owner.col;
  const targetKind = resolveTargetKind(fx, ownerSide);

  if (mods.energyGain) {
    s.energy += mods.energyGain;
    if (s.rules?.energyCap !== undefined) {
      s.energy = Math.min(s.rules.energyCap, s.energy);
    }
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
  if (mods.splitOnDeathType && fx.trigger === 'on_death') {
    const splitCount = Math.max(1, mods.splitOnDeathCount ?? 2);
    for (let i = 0; i < splitCount; i++) {
      const rowOffset = i % 2 === 0 ? 0 : i % 3 === 0 ? -1 : 1;
      const targetRow = Math.max(0, Math.min(s.gridRows - 1, owner.row + rowOffset));
      extraSpawns.push({
        type: mods.splitOnDeathType as EnemyType,
        row: targetRow,
        col: Math.max(0.3, Math.min(s.gridCols - 0.15, owner.col + (i - (splitCount - 1) / 2) * 0.18)),
      });
    }
  }

  if (targetKind === 'self') {
    if (ownerSide === 'tower') {
      applyDeclarativeEffectToTower(
        s,
        fx,
        owner as Tower,
        durationOverride,
        towersToRemove,
        nextId,
        true,
        extraSpawns
      );
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
    return true;
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
        return isWithinArea(srcRows, srcCol, [t.row], t.col, fx, ownerSide);
      });
      if (fx.priority) {
        sortByPriority(targets, fx.priority, owner.row, srcCol);
      } else if (shape === 'random') {
        shuffleInPlace(targets);
      } else if (shape === 'single' && targets.length > 1) {
        targets.sort((a, b) => Math.abs(a.col - srcCol) - Math.abs(b.col - srcCol));
        targets = targets.slice(0, 1);
      }
    }
    if (fx.maxTargets && targets.length > fx.maxTargets) {
      targets = targets.slice(0, fx.maxTargets);
    } else if (shape === 'random' && !fx.maxTargets && targets.length > 1) {
      targets = targets.slice(0, 1);
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
        shape === 'single' || !emittedOriginVisual || Boolean(fx.visual?.beamToTarget),
        extraSpawns,
        { row: owner.row, col: owner.col }
      );
      emittedOriginVisual = true;
    }
    if (targets.length === 0 && fx.trigger === 'periodic') {
      emitEffectVisual(s, fx, owner.row, owner.col, nextId);
    }
    return targets.length > 0;
  } else {
    let targets: Enemy[] = [];
    if (shape === 'single' && explicitEnemyTarget) {
      targets = isEnemyMatchingFilter(explicitEnemyTarget, fx) ? [explicitEnemyTarget] : [];
    } else {
      targets = s.enemies.filter((e) => {
        if (e.hp <= 0 || e.skyOffsetRows > 0.3) return false;
        if (fx.excludeSelf && ownerSide === 'enemy' && e.id === owner.id) return false;
        if (!isEnemyMatchingFilter(e, fx)) return false;
        return isWithinArea(srcRows, srcCol, getSourceRows(e), e.col, fx, ownerSide);
      });
      if (fx.priority) {
        sortByPriority(targets, fx.priority, owner.row, srcCol);
      } else if (shape === 'random') {
        shuffleInPlace(targets);
      } else if (shape === 'single' && targets.length > 1) {
        targets.sort((a, b) => Math.abs(a.col - srcCol) - Math.abs(b.col - srcCol));
        targets = targets.slice(0, 1);
      }
    }
    if (fx.maxTargets && targets.length > fx.maxTargets) {
      targets = targets.slice(0, fx.maxTargets);
    } else if (shape === 'random' && !fx.maxTargets && targets.length > 1) {
      targets = targets.slice(0, 1);
    }

    if (targets.length > 0 && shape !== 'single' && !fx.visual?.beamToTarget) {
      emitEffectVisual(s, fx, owner.row, owner.col, nextId);
    }
    for (const tgt of targets) {
      applyDeclarativeEffectToEnemy(
        s,
        fx,
        tgt,
        durationOverride,
        nextId,
        shape === 'single' || Boolean(fx.visual?.beamToTarget),
        hasEnemyImmunityFn,
        { row: owner.row, col: owner.col }
      );
    }
    return targets.length > 0;
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

    const fired = executeEffectFire(
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

    if (fired) {
      owner.effectTriggered[fx.id] = (owner.effectTriggered[fx.id] ?? 0) + 1;
      if (fx.cooldownSec && fx.cooldownSec > 0) {
        owner.effectCooldowns[fx.id] = fx.cooldownSec;
      }
    }
  }
}

export function triggerProjectileDeclarativeHits(
  s: SimState,
  effectIds: string[] | undefined,
  hitEnemy: Enemy,
  nextId: (prefix: string) => string,
  hasEnemyImmunityFn?: (type: EnemyType, immunity: EnemyImmunity, enemy?: Enemy) => boolean,
  sourceTower?: Tower
) {
  const effects = getDeclarativeEffects(effectIds);
  if (effects.length === 0) return;
  const dummyRemove = new Set<string>();
  const dummySpawns: DeclarativeSpawnRequest[] = [];

  for (const fx of effects) {
    if (fx.trigger !== 'on_hit' && fx.trigger !== 'on_attack') continue;
    if (fx.chance !== undefined && fx.chance < 1 && Math.random() > fx.chance) continue;

    const mods = resolveModifiers(fx);
    if (mods.lifestealRatio && sourceTower && sourceTower.hp > 0) {
      const heal = (mods.damageInstant ?? 20) * mods.lifestealRatio;
      sourceTower.hp = Math.min(sourceTower.maxHp, sourceTower.hp + heal);
    }

    const shape = fx.areaShape ?? 'single';
    if (shape === 'single') {
      applyDeclarativeEffectToEnemy(
        s,
        fx,
        hitEnemy,
        undefined,
        nextId,
        true,
        hasEnemyImmunityFn,
        sourceTower ? { row: sourceTower.row, col: sourceTower.col } : undefined
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

    if (mods.chainBounceCount && mods.chainBounceCount > 0) {
      const range = mods.chainBounceRangeCols ?? 2.2;
      const decay = mods.chainDamageDecay ?? 0.7;
      let currDmg = (mods.damageInstant ?? 30) * decay;
      let currSource = hitEnemy;
      const visited = new Set<string>([hitEnemy.id]);
      for (let b = 0; b < mods.chainBounceCount; b++) {
        const nextTarget = s.enemies
          .filter(
            (e) =>
              e.hp > 0 &&
              e.skyOffsetRows <= 0.3 &&
              !visited.has(e.id) &&
              Math.hypot(e.row - currSource.row, e.col - currSource.col) <= range
          )
          .sort(
            (a, c) =>
              Math.hypot(a.row - currSource.row, a.col - currSource.col) -
              Math.hypot(c.row - currSource.row, c.col - currSource.col)
          )[0];
        if (!nextTarget) break;
        visited.add(nextTarget.id);
        dealMitigatedEnemyDamage(nextTarget, currDmg);
        s.effects.push({
          id: nextId('fx'),
          kind: 'beam',
          row: currSource.row,
          col: currSource.col,
          targetRow: nextTarget.row,
          targetCol: nextTarget.col,
          timer: 0,
          duration: 0.25,
          color: fx.visual?.beamColorRgb ?? fx.color,
          lineWidth: fx.visual?.beamWidth ?? 2.5,
        });
        currSource = nextTarget;
        currDmg *= decay;
      }
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
  // 1. Run passive, continuous_aura, periodic, on_hp_below, on_enemy_enter from all active towers
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
        if (mods.energyPerSec && !towerInactive) {
          s.energy += mods.energyPerSec * dt;
        }
        tower.activeEffects = tower.activeEffects ?? {};
        tower.activeEffects[fx.id] = {
          id: fx.id,
          remaining: 0.15,
          fireRateMultiplier: mods.fireRateMultiplier,
          damageMultiplier: mods.damageMultiplier,
          projectileSpeedMultiplier: mods.projectileSpeedMultiplier,
          damageReduction: mods.damageReduction,
          vulnerableMultiplier: mods.vulnerableMultiplier,
          lifestealRatio: mods.lifestealRatio,
          thornsDps: mods.thornsDps,
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
      } else if (trig === 'on_enemy_enter' && !towerInactive) {
        const maxT = fx.maxTriggers;
        if (
          (maxT === undefined || (tower.effectTriggered[fx.id] ?? 0) < maxT) &&
          (tower.effectCooldowns[fx.id] ?? 0) <= 0
        ) {
          const fired = executeEffectFire(
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
          if (fired) {
            tower.effectTriggered[fx.id] = (tower.effectTriggered[fx.id] ?? 0) + 1;
            tower.effectCooldowns[fx.id] = fx.cooldownSec ?? 1.5;
          }
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

  // 2. Run passive, continuous_aura, periodic, on_hp_below, on_enemy_enter from all active enemies
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
    const incapacitated = (enemy.stunTimer ?? 0) > 0 || (enemy.silenceTimer ?? 0) > 0;

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
          damageReduction: mods.damageReduction,
          vulnerableMultiplier: mods.vulnerableMultiplier,
          lifestealRatio: mods.lifestealRatio,
          thornsDps: mods.thornsDps,
          badgeLabel: fx.badgeLabel,
          color: fx.color,
          textColor: fx.badgeTextColor,
          tintColor: fx.visual?.targetTintColor,
        };
      } else if (trig === 'continuous_aura' && !incapacitated) {
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
      } else if (trig === 'periodic' && !incapacitated) {
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
      } else if (trig === 'on_enemy_enter' && !incapacitated) {
        const maxT = fx.maxTriggers;
        if (
          (maxT === undefined || (enemy.effectTriggered[fx.id] ?? 0) < maxT) &&
          (enemy.effectCooldowns[fx.id] ?? 0) <= 0
        ) {
          const fired = executeEffectFire(
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
          if (fired) {
            enemy.effectTriggered[fx.id] = (enemy.effectTriggered[fx.id] ?? 0) + 1;
            enemy.effectCooldowns[fx.id] = fx.cooldownSec ?? 1.5;
          }
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
    let projSpeedMult = 1;
    let damageReduction = 0;
    let vulnerableMult = 1;
    let lifesteal = 0;
    let thornsDps = 0;
    let customDisabled = false;
    let badge: { label: string; color: string; textColor?: string } | undefined;
    let tintColor: string | undefined;

    if (tower.activeEffects) {
      const nextMap: Record<string, ActiveEffectState> = {};
      for (const [id, st] of Object.entries(tower.activeEffects)) {
        const rem = st.remaining - dt;
        if (st.dotDps) {
          dealMitigatedTowerDamage(tower, st.dotDps * dt);
          if (tower.hp <= 0) towersToRemove.add(tower.id);
        }
        if (st.hotHps && tower.hp > 0 && tower.hp < tower.maxHp) {
          tower.hp = Math.min(tower.maxHp, tower.hp + st.hotHps * dt);
        }
        if (st.energyPerSec && tower.hp > 0) {
          s.energy += st.energyPerSec * dt;
        }
        if (st.fireRateMultiplier) fireRateMult *= st.fireRateMultiplier;
        if (st.damageMultiplier) damageMult *= st.damageMultiplier;
        if (st.projectileSpeedMultiplier) projSpeedMult *= st.projectileSpeedMultiplier;
        if (st.damageReduction) damageReduction = Math.max(damageReduction, st.damageReduction);
        if (st.vulnerableMultiplier) vulnerableMult *= st.vulnerableMultiplier;
        if (st.lifestealRatio) lifesteal = Math.max(lifesteal, st.lifestealRatio);
        if (st.thornsDps) thornsDps += st.thornsDps;
        if (st.shieldDecayPerSec && tower.shieldHp && tower.shieldHp > 0) {
          tower.shieldHp = Math.max(0, tower.shieldHp - st.shieldDecayPerSec * dt);
        }
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

    const tDef = getTowerDefLocal(tower.type);
    tower.customFireRateMult = fireRateMult;
    tower.customDamageMult = damageMult;
    tower.customProjSpeedMult = projSpeedMult;
    tower.customDamageReduction = damageReduction;
    tower.customVulnerableMult = vulnerableMult;
    tower.customLifesteal = Math.max(tDef?.lifestealRatio ?? 0, lifesteal);
    tower.customThornsDps = thornsDps;
    tower.customDisabled = customDisabled;
    if (customDisabled) tower.suppressed = true;
    if (badge) tower.customBadge = badge;
    if (tintColor) tower.customTintColor = tintColor;
  }

  // 4. Tick activeEffects, stunTimer & silenceTimer on all enemies
  for (const enemy of s.enemies) {
    if (enemy.stunTimer && enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
    }
    if (enemy.silenceTimer && enemy.silenceTimer > 0) {
      enemy.silenceTimer = Math.max(0, enemy.silenceTimer - dt);
    }

    const beh = getEnemyDefLocal(enemy.type)?.behavior;
    let speedMult = 1;
    let damageMult = 1;
    let damageReduction = beh?.damageReduction ?? 0;
    let vulnerableMult = 1;
    let lifesteal = beh?.lifestealRatio ?? 0;
    let thornsDps = beh?.thornsDps ?? 0;
    let badge: { label: string; color: string; textColor?: string } | undefined;
    let tintColor: string | undefined;

    if (enemy.activeEffects) {
      const nextMap: Record<string, ActiveEffectState> = {};
      for (const [id, st] of Object.entries(enemy.activeEffects)) {
        const rem = st.remaining - dt;
        if (st.dotDps) {
          dealMitigatedEnemyDamage(enemy, st.dotDps * dt);
        }
        if (st.hotHps && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + st.hotHps * dt);
        }
        if (st.slowFactor) speedMult *= Math.max(0.1, 1 - st.slowFactor);
        if (st.speedMultiplier) speedMult *= st.speedMultiplier;
        if (st.damageMultiplier) damageMult *= st.damageMultiplier;
        if (st.damageReduction) damageReduction = Math.max(damageReduction, st.damageReduction);
        if (st.vulnerableMultiplier) vulnerableMult *= st.vulnerableMultiplier;
        if (st.lifestealRatio) lifesteal = Math.max(lifesteal, st.lifestealRatio);
        if (st.thornsDps) thornsDps += st.thornsDps;
        if (st.shieldDecayPerSec && enemy.shieldHp && enemy.shieldHp > 0) {
          enemy.shieldHp = Math.max(0, enemy.shieldHp - st.shieldDecayPerSec * dt);
        }
        if (st.silence) enemy.silenceTimer = Math.max(enemy.silenceTimer ?? 0, 0.12);
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
    enemy.customDamageReduction = damageReduction;
    enemy.customVulnerableMult = vulnerableMult;
    enemy.customLifesteal = lifesteal;
    enemy.customThornsDps = thornsDps;
    if (badge) enemy.customBadge = badge;
    if (tintColor) enemy.customTintColor = tintColor;
  }
}
