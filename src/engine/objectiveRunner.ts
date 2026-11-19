import {
  LevelConfig,
  ObjectiveCategory,
  ObjectiveDefinition,
  ObjectiveProgressState,
} from '../types/game';
import type { SimState } from './simulation';

export function resolveObjectiveCategory(def: ObjectiveDefinition): ObjectiveCategory {
  if (def.category) return def.category;
  if (def.failOnViolate) return 'fail_condition';
  if (def.requiredForVictory) return 'primary';
  return 'secondary';
}

export function initLevelObjectives(levelConfig: LevelConfig): ObjectiveProgressState[] {
  const defs = levelConfig.objectives ?? [];
  return defs.map((def) => {
    const category = resolveObjectiveCategory(def);
    let targetValue: number | undefined;
    if (def.kind === 'kill_enemies') targetValue = def.targetCount ?? 10;
    else if (def.kind === 'survive_time') targetValue = def.targetSeconds ?? levelConfig.durationSeconds;
    else if (def.kind === 'max_towers_lost' || def.kind === 'max_towers_deployed' || def.kind === 'max_towers_alive' || def.kind === 'max_tesla_gates_used' || def.kind === 'protect_obstacles') {
      targetValue = def.maxCount ?? 0;
    } else if (def.kind === 'min_towers_alive') targetValue = def.minCount ?? def.targetCount ?? 1;
    else if (def.kind === 'min_energy_remaining') targetValue = def.minEnergy ?? def.targetCount ?? 100;
    else if (def.kind === 'max_energy_spent') targetValue = def.maxEnergy ?? def.maxCount ?? 500;
    else if (def.kind === 'destroy_all_obstacles') {
      targetValue = (levelConfig.obstacles ?? []).filter(
        (o) => !def.obstacleKind || (o.kind ?? 'tombstone') === def.obstacleKind
      ).length;
    }

    return {
      def,
      category,
      status: 'active',
      currentValue: 0,
      targetValue,
      progressText: '',
    };
  });
}

function isFailOnViolate(obj: ObjectiveProgressState): boolean {
  return Boolean(obj.def.failOnViolate || obj.category === 'fail_condition');
}

function countFilteredKills(s: SimState, def: ObjectiveDefinition): number {
  if (!def.enemyTypes || def.enemyTypes.length === 0) {
    if (!def.excludeEnemyTypes || def.excludeEnemyTypes.length === 0) {
      return s.kills;
    }
    const excluded = new Set(def.excludeEnemyTypes);
    return Object.entries(s.killsByEnemyType).reduce(
      (acc, [type, cnt]) => (excluded.has(type) ? acc : acc + cnt),
      0
    );
  }
  const included = new Set(def.enemyTypes);
  return Object.entries(s.killsByEnemyType).reduce(
    (acc, [type, cnt]) => (included.has(type) ? acc + cnt : acc),
    0
  );
}

function matchingTowersCount(s: SimState, def: ObjectiveDefinition): number {
  return s.towers.filter((t) => {
    if (t.hp <= 0) return false;
    if (def.towerCategory && t.category !== def.towerCategory) return false;
    if (def.towerTypes && def.towerTypes.length > 0 && !def.towerTypes.includes(t.type)) {
      return false;
    }
    return true;
  }).length;
}

export function stepObjectives(s: SimState): { failedReason?: string } {
  for (const obj of s.objectives) {
    if (obj.status === 'failed') continue;
    const def = obj.def;

    switch (def.kind) {
      case 'no_enemy_past_col': {
        const limitCol = def.col ?? 3;
        const ignoreSky = def.ignoreSkyFalling ?? true;
        const breached = s.enemies.some((e) => {
          if (e.hp <= 0) return false;
          if (ignoreSky && e.skyOffsetRows > 0.3) return false;
          if (def.enemyTypes && def.enemyTypes.length > 0 && !def.enemyTypes.includes(e.type)) {
            return false;
          }
          if (def.excludeEnemyTypes && def.excludeEnemyTypes.includes(e.type)) {
            return false;
          }
          return e.col <= limitCol;
        });
        obj.currentValue = breached ? 1 : 0;
        obj.progressText = breached ? 'PERÍMETRO VIOLADO' : `Col > ${limitCol}`;
        if (breached) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ??
                `Un SCP cruzó más allá de la columna ${limitCol}.`,
            };
          }
        }
        break;
      }

      case 'no_enemy_reach_row_col': {
        const minC = def.minCol ?? 0;
        const maxC = def.maxCol ?? def.col ?? 3;
        const ignoreSky = def.ignoreSkyFalling ?? true;
        const violated = s.enemies.some((e) => {
          if (e.hp <= 0) return false;
          if (ignoreSky && e.skyOffsetRows > 0.3) return false;
          if (def.enemyTypes && def.enemyTypes.length > 0 && !def.enemyTypes.includes(e.type)) {
            return false;
          }
          if (def.excludeEnemyTypes && def.excludeEnemyTypes.includes(e.type)) {
            return false;
          }
          const rowOk =
            !def.rows || def.rows.length === 0 || e.occupiedRows.some((r) => def.rows!.includes(r));
          return rowOk && e.col >= minC && e.col <= maxC;
        });
        obj.currentValue = violated ? 1 : 0;
        obj.progressText = violated ? 'ZONA INVADIDA' : 'Zona segura';
        if (violated) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason: def.failReason ?? 'Un SCP invadió la zona restringida.',
            };
          }
        }
        break;
      }

      case 'no_tesla_gate_used':
      case 'max_tesla_gates_used': {
        const maxAllowed = def.kind === 'no_tesla_gate_used' ? 0 : (def.maxCount ?? 1);
        obj.currentValue = s.teslaGatesUsedCount;
        obj.targetValue = maxAllowed;
        obj.progressText = `${s.teslaGatesUsedCount}/${maxAllowed} Tesla`;
        if (s.teslaGatesUsedCount > maxAllowed) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ?? `Se excedió el límite de puertas Tesla (${maxAllowed}).`,
            };
          }
        }
        break;
      }

      case 'max_towers_lost': {
        const maxLost = def.maxCount ?? 0;
        obj.currentValue = s.towersLostCount;
        obj.targetValue = maxLost;
        obj.progressText = `${s.towersLostCount}/${maxLost} bajas`;
        if (s.towersLostCount > maxLost) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ?? `Se perdió el máximo permitido de unidades (${maxLost}).`,
            };
          }
        }
        break;
      }

      case 'max_towers_deployed': {
        const maxDep = def.maxCount ?? 8;
        obj.currentValue = s.towersDeployed;
        obj.targetValue = maxDep;
        obj.progressText = `${s.towersDeployed}/${maxDep} despl.`;
        if (s.towersDeployed > maxDep) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ?? `Se superó el límite de despliegues (${maxDep}).`,
            };
          }
        }
        break;
      }

      case 'max_towers_alive': {
        const alive = matchingTowersCount(s, def);
        const maxAlive = def.maxCount ?? 6;
        obj.currentValue = alive;
        obj.targetValue = maxAlive;
        obj.progressText = `${alive}/${maxAlive} activas`;
        if (alive > maxAlive) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ?? `Límite simultáneo de torres (${maxAlive}) superado.`,
            };
          }
        }
        break;
      }

      case 'min_towers_alive': {
        const alive = matchingTowersCount(s, def);
        const minAlive = def.minCount ?? def.targetCount ?? 1;
        obj.currentValue = alive;
        obj.targetValue = minAlive;
        obj.progressText = `${alive}/${minAlive} vivas`;
        if (alive < minAlive && s.levelTimer > 1.0 && isFailOnViolate(obj)) {
          obj.status = 'failed';
          return {
            failedReason:
              def.failReason ?? `Cayó por debajo de ${minAlive} unidades requeridas.`,
          };
        }
        break;
      }

      case 'protect_obstacles': {
        const lost = def.obstacleKind
          ? s.obstaclesLostByKind[def.obstacleKind] ?? 0
          : s.obstaclesLostCount;
        const maxLost = def.maxCount ?? 0;
        obj.currentValue = lost;
        obj.targetValue = maxLost;
        obj.progressText = `${lost}/${maxLost} perd.`;
        if (lost > maxLost) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ?? 'Se destruyó un obstáculo o sello protegido.',
            };
          }
        }
        break;
      }

      case 'destroy_all_obstacles': {
        const remaining = s.obstacles.filter(
          (o) => !def.obstacleKind || o.kind === def.obstacleKind
        ).length;
        const destroyed = def.obstacleKind
          ? s.obstaclesDestroyedByKind[def.obstacleKind] ?? 0
          : s.obstacleDestroyedCount;
        const total = Math.max(remaining + destroyed, obj.targetValue ?? remaining);
        obj.currentValue = total - remaining;
        obj.targetValue = total;
        obj.progressText = `${total - remaining}/${total}`;
        if (remaining === 0 && (total === 0 || destroyed > 0)) {
          obj.status = 'completed';
        }
        break;
      }

      case 'kill_enemies': {
        const kills = countFilteredKills(s, def);
        const target = def.targetCount ?? 10;
        obj.currentValue = kills;
        obj.targetValue = target;
        obj.progressText = `${Math.min(kills, target)}/${target}`;
        if (kills >= target) {
          obj.status = 'completed';
        }
        break;
      }

      case 'min_energy_remaining': {
        const minEn = def.minEnergy ?? def.targetCount ?? 100;
        obj.currentValue = Math.round(s.energy);
        obj.targetValue = minEn;
        obj.progressText = `${Math.round(s.energy)}/${minEn} EN`;
        break;
      }

      case 'max_energy_spent': {
        const maxSpent = def.maxEnergy ?? def.maxCount ?? 500;
        obj.currentValue = Math.round(s.energySpentTotal);
        obj.targetValue = maxSpent;
        obj.progressText = `${Math.round(s.energySpentTotal)}/${maxSpent} EN`;
        if (s.energySpentTotal > maxSpent) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ?? `Presupuesto de energía superado (${maxSpent}).`,
            };
          }
        }
        break;
      }

      case 'survive_time': {
        const targetSec = def.targetSeconds ?? s.levelConfig.durationSeconds;
        obj.currentValue = Math.floor(s.levelTimer);
        obj.targetValue = targetSec;
        obj.progressText = `${Math.min(Math.floor(s.levelTimer), targetSec)}/${targetSec}s`;
        if (s.levelTimer >= targetSec) {
          obj.status = 'completed';
        }
        break;
      }

      case 'no_tower_type_used': {
        const forbidden = new Set(def.towerTypes ?? []);
        const usedForbidden = Array.from(s.deployedTowerTypesUsed).some((t) =>
          forbidden.has(t)
        );
        obj.currentValue = usedForbidden ? 1 : 0;
        obj.progressText = usedForbidden ? 'Usada' : 'Sin usar';
        if (usedForbidden) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason: def.failReason ?? 'Se desplegó una torre prohibida por el objetivo.',
            };
          }
        }
        break;
      }

      case 'keep_tower_hp_above': {
        const minRatio = def.minHpRatio ?? 0.5;
        const matching = s.towers.filter(
          (t) =>
            t.hp > 0 &&
            (!def.towerCategory || t.category === def.towerCategory) &&
            (!def.towerTypes || def.towerTypes.length === 0 || def.towerTypes.includes(t.type))
        );
        const violated = matching.some((t) => t.hp / Math.max(1, t.maxHp) < minRatio);
        obj.currentValue = violated ? 0 : 1;
        obj.progressText = violated
          ? `< ${Math.round(minRatio * 100)}%`
          : `≥ ${Math.round(minRatio * 100)}%`;
        if (violated) {
          obj.status = 'failed';
          if (isFailOnViolate(obj)) {
            return {
              failedReason:
                def.failReason ??
                `Una unidad bajó del ${Math.round(minRatio * 100)}% de salud.`,
            };
          }
        }
        break;
      }

      case 'event_triggered': {
        const triggered = def.eventId ? s.triggeredEventIds.has(def.eventId) : false;
        obj.currentValue = triggered ? 1 : 0;
        obj.progressText = triggered ? 'Completado' : 'Pendiente';
        if (triggered) {
          obj.status = 'completed';
        }
        break;
      }
    }

    if (obj.status === 'completed' && !obj.rewardClaimed && def.rewardEnergy) {
      obj.rewardClaimed = true;
      s.energy += def.rewardEnergy;
      if (s.rules?.energyCap !== undefined) {
        s.energy = Math.min(s.rules.energyCap, s.energy);
      }
    }
  }

  return {};
}

export function arePrimaryObjectivesCompleted(s: SimState): boolean {
  const primaries = s.objectives.filter(
    (o) => o.category === 'primary' || o.def.requiredForVictory
  );
  if (primaries.length === 0) return true;
  return primaries.every((o) => {
    if (o.status === 'failed') return false;
    if (o.status === 'completed') return true;
    const k = o.def.kind;
    if (k === 'min_energy_remaining') {
      return s.energy >= (o.def.minEnergy ?? o.def.targetCount ?? 100);
    }
    if (k === 'min_towers_alive') {
      return matchingTowersCount(s, o.def) >= (o.def.minCount ?? o.def.targetCount ?? 1);
    }
    // Preventive "do not violate" primary objectives pass when reaching victory condition
    return (
      k === 'no_enemy_past_col' ||
      k === 'no_enemy_reach_row_col' ||
      k === 'no_tesla_gate_used' ||
      k === 'max_tesla_gates_used' ||
      k === 'max_towers_lost' ||
      k === 'max_towers_deployed' ||
      k === 'max_towers_alive' ||
      k === 'protect_obstacles' ||
      k === 'max_energy_spent' ||
      k === 'no_tower_type_used' ||
      k === 'keep_tower_hp_above'
    );
  });
}

export function finalizeObjectivesOnOutcome(s: SimState, won: boolean) {
  for (const obj of s.objectives) {
    if (obj.status === 'failed') continue;
    const k = obj.def.kind;
    if (!won) {
      if (obj.status === 'active') obj.status = 'failed';
      continue;
    }
    if (obj.status === 'completed') continue;

    if (k === 'min_energy_remaining') {
      const target = obj.def.minEnergy ?? obj.def.targetCount ?? 100;
      obj.status = s.energy >= target ? 'completed' : 'failed';
    } else if (k === 'min_towers_alive') {
      const target = obj.def.minCount ?? obj.def.targetCount ?? 1;
      obj.status = matchingTowersCount(s, obj.def) >= target ? 'completed' : 'failed';
    } else if (
      k === 'no_enemy_past_col' ||
      k === 'no_enemy_reach_row_col' ||
      k === 'no_tesla_gate_used' ||
      k === 'max_tesla_gates_used' ||
      k === 'max_towers_lost' ||
      k === 'max_towers_deployed' ||
      k === 'max_towers_alive' ||
      k === 'protect_obstacles' ||
      k === 'max_energy_spent' ||
      k === 'no_tower_type_used' ||
      k === 'keep_tower_hp_above'
    ) {
      obj.status = 'completed';
    } else {
      obj.status = 'failed';
    }
  }
}
