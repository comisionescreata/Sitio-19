export type GameState =
  | 'TITLE_MENU'
  | 'LOADOUT_PICK'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type TowerCategory = 'personal' | 'estructura';

export type BuiltinTowerType =
  | 'researcher'
  | 'guard'
  | 'medic'
  | 'shotgunner'
  | 'cryo'
  | 'pyro'
  | 'mtf'
  | 'sniper'
  | 'heavy_gunner'
  | 'engineer'
  | 'grenadier'
  | 'psionic'
  | 'barricade'
  | 'mine'
  | 'generator'
  | 'laser_trap'
  | 'bunker'
  | 'tesla_coil'
  | 'turret'
  | 'radio';

export type TowerType = BuiltinTowerType | (string & {});

export type BuiltinEnemyType =
  | 'scp_008'
  | 'scp_966'
  | 'scp_939'
  | 'scp_173'
  | 'scp_049'
  | 'scp_049_2'
  | 'scp_035'
  | 'scp_012'
  | 'scp_096'
  | 'scp_019'
  | 'scp_019_2'
  | 'scp_106'
  | 'scp_066'
  | 'scp_079'
  | 'scp_018'
  | 'scp_058'
  | 'scp_682';

export type EnemyType = BuiltinEnemyType | (string & {});

export type EnemyImmunity = 'all_effects' | 'explosion' | 'slow' | 'burn' | 'stun' | 'silence';

export type EffectCategory =
  | 'aura'
  | 'status'
  | 'trigger'
  | 'combat'
  | 'summon'
  | 'utility'
  | 'immunity';

export type EffectTrigger =
  | 'continuous_aura'
  | 'periodic'
  | 'on_spawn'
  | 'on_attack'
  | 'on_hit'
  | 'on_damaged'
  | 'on_enemy_enter'
  | 'on_kill'
  | 'on_death'
  | 'on_hp_below'
  | 'passive';

export type EffectTargetSide = 'towers' | 'enemies' | 'allies' | 'opponents' | 'self';

export type EffectAreaShape =
  | 'single'
  | 'self'
  | 'square'
  | 'rect'
  | 'cross'
  | 'cone_front'
  | 'lane_behind'
  | 'lane'
  | 'random'
  | 'global';

export type EffectSoundKey =
  | 'explosion'
  | 'heal'
  | 'revive'
  | 'stun'
  | 'scream066'
  | 'pull'
  | 'portal'
  | 'tesla'
  | 'blink'
  | 'place'
  | 'collect'
  | 'door'
  | 'horde'
  | 'alert';

export interface EffectModifiers {
  damageInstant?: number;
  damagePercentMaxHp?: number;
  dotDps?: number;
  healAmount?: number;
  healPercent?: number;
  hotHps?: number;
  shieldHp?: number;
  energyGain?: number;
  energyPerSec?: number;
  speedMultiplier?: number;
  slowFactor?: number;
  fireRateMultiplier?: number;
  damageMultiplier?: number;
  projectileSpeedMultiplier?: number;
  maxHpMultiplier?: number;
  damageReduction?: number;
  vulnerableMultiplier?: number;
  lifestealRatio?: number;
  thornsDps?: number;
  disableTowerActions?: boolean;
  hypnotizeTower?: boolean;
  stunSec?: number;
  deafSec?: number;
  silenceSec?: number;
  immuneToPsych?: boolean;
  cleanseNegative?: boolean;
  grantsImmunities?: EnemyImmunity[];
  knockbackCols?: number;
  teleportCells?: number;
  pullCells?: number;
  laneShift?: number;
  spawnType?: EnemyType | (string & {});
  spawnCount?: number;
  spawnOffsetCol?: number;
  convertVictimTo?: EnemyType | (string & {});
  applyEffectIds?: string[];
  removeEffectIds?: string[];
  extraLives?: number;
  reviveHpPercent?: number;
  instakill?: boolean;
  disappearOnHit?: boolean;
  respectImmunity?: EnemyImmunity | 'none';
  executeBelowHpRatio?: number;
  reflectDamagePercent?: number;
  chainBounceCount?: number;
  chainBounceRangeCols?: number;
  chainDamageDecay?: number;
  splitOnDeathCount?: number;
  splitOnDeathType?: EnemyType | (string & {});
  transformToType?: EnemyType | (string & {});
  shieldDecayPerSec?: number;
}

export interface EffectParticleBurstConfig {
  color: string;
  count?: number;
  speedPx?: number;
  durationSec?: number;
  sizePx?: number;
}

export interface EffectVisualConfig {
  showZone?: boolean;
  zoneShape?: 'box' | 'circle' | 'cross';
  zoneRgb?: string;
  zoneStroke?: string;
  zonePulseSpeed?: number;
  warnBeforeSec?: number;
  waveKind?:
    | 'ring'
    | 'explosion'
    | 'stun_wave'
    | 'scream_wave_066'
    | 'heal_ring'
    | 'revive_ring'
    | 'cryo_hit'
    | 'burn_hit'
    | 'pocket_portal'
    | 'bounce_impact';
  waveColorRgb?: string;
  waveRadiusPx?: number;
  waveDurationSec?: number;
  beamToTarget?: boolean;
  beamColorRgb?: string;
  beamWidth?: number;
  beamDurationSec?: number;
  particleBurst?: EffectParticleBurstConfig;
  particlePresetId?: string;
  screenFlashRgb?: string;
  screenFlashAlpha?: number;
  screenShake?: number;
  floatingText?: string;
  floatingTextColor?: string;
  sound?: EffectSoundKey;
  targetTintColor?: string;
  shieldColor?: string;
}

export type ParticleShape =
  | 'circle'
  | 'square'
  | 'spark'
  | 'ring'
  | 'star'
  | 'cross'
  | 'shard'
  | 'smoke'
  | 'sprite';

export type ParticleBlendMode = 'source-over' | 'lighter' | 'screen';

export interface ParticleEmitterConfig {
  shape?: ParticleShape;
  sprite?: string;
  colors: string[];
  colorEnd?: string;
  count: number | [number, number];
  durationSec: number | [number, number];
  sizePx: number | [number, number];
  sizeEndScale?: number;
  alphaStart?: number;
  alphaEnd?: number;
  speedPx?: number | [number, number];
  angleDeg?: number;
  spreadDeg?: number;
  gravityPx?: number;
  drag?: number;
  spinDegPerSec?: number | [number, number];
  offsetX?: number;
  offsetY?: number;
  spawnRadiusPx?: number;
  blendMode?: ParticleBlendMode;
  glowColor?: string;
  glowBlur?: number;
  strokeColor?: string;
  strokeWidth?: number;
  delaySec?: number;
  ringExpandPx?: number;
}

export type ParticleCategory =
  | 'attack'
  | 'explosion'
  | 'deployment'
  | 'impact'
  | 'aura'
  | 'obstacle'
  | 'custom';

export interface ParticlePresetDefinition {
  id: string;
  name?: string;
  description?: string;
  category?: ParticleCategory;
  emitters: ParticleEmitterConfig[];
  screenFlashRgb?: string;
  screenFlashAlpha?: number;
  screenShake?: number;
  sound?: EffectSoundKey | (string & {});
}

export interface TowerParticleHooks {
  onDeploy?: string;
  onAttack?: string;
  onHit?: string;
  onDeath?: string;
  projectileTrail?: string;
}

export interface EnemyParticleHooks {
  onSpawn?: string;
  onAttack?: string;
  onDamaged?: string;
  onKill?: string;
  onDeath?: string;
  trail?: string;
  trailIntervalSec?: number;
}

export type EffectTargetPriority =
  | 'closest'
  | 'furthest'
  | 'lowest_hp'
  | 'highest_hp'
  | 'random';

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  engineMode?: 'builtin' | 'declarative';
  isTemplate?: boolean;
  category?: EffectCategory;
  kind?: string;
  trigger?: EffectTrigger;
  targetSide?: EffectTargetSide;
  targetCategories?: TowerCategory[];
  targetTypes?: string[];
  excludeTypes?: string[];
  excludeSelf?: boolean;
  priority?: EffectTargetPriority;
  minHpRatio?: number;
  maxHpRatio?: number;
  onlyAttacking?: boolean;
  onlyElite?: boolean;
  areaShape?: EffectAreaShape;
  radiusCells?: number;
  radiusRows?: number;
  radiusCols?: number;
  maxTargets?: number;
  color: string;
  badgeLabel?: string;
  badgeTextColor?: string;
  initialDelaySec?: number;
  intervalSec?: number;
  durationSec?: number;
  cooldownSec?: number;
  hpThresholdRatio?: number;
  chance?: number;
  maxTriggers?: number;
  stackMode?: 'refresh' | 'stack' | 'max';
  modifiers?: EffectModifiers;
  visual?: EffectVisualConfig;
  // Legacy / top-level convenience fields (still supported directly!)
  speedMultiplier?: number;
  extraLives?: number;
  blinkIntervalSec?: number;
  blinkDurationSec?: number;
  moveIntervalSec?: number;
  moveCells?: number;
  slowFactor?: number;
  healAmount?: number;
  burnDps?: number;
  fireRateBoost?: number;
  pullIntervalSec?: number;
  healPercent?: number;
  stunDurationSec?: number;
  spawnIntervalSec?: number;
  screamIntervalSec?: number;
  deafDurationSec?: number;
  radioReducedSec?: number;
  reviveChance?: number;
  reviveHpPercent?: number;
  minDelaySec?: number;
  maxDelaySec?: number;
  doorCount?: number;
  extraDoorCount?: number;
  accelPerSec?: number;
  maxSpeed?: number;
}

export type BuiltinProjectileKind =
  | 'standard'
  | 'mtf'
  | 'cryo'
  | 'turret'
  | 'sniper'
  | 'shotgun'
  | 'pyro'
  | 'heavy'
  | 'grenade'
  | 'psionic';

export type ProjectileKind = BuiltinProjectileKind | (string & {});

export type DamageTypeKind =
  | 'physical'
  | 'explosion'
  | 'fire'
  | 'cryo'
  | 'electric'
  | 'psionic'
  | 'true';

export interface TowerDefinition {
  type: TowerType;
  name: string;
  category: TowerCategory;
  cost: number;
  costScalePerDeployed?: number;
  cooldown: number;
  maxHp: number;
  unlockLevel: number;
  roleLabel: string;
  description: string;
  fireRate?: number;
  damage?: number;
  damageType?: DamageTypeKind;
  armorPenetration?: number;
  bonusDamageToBoss?: number;
  critChance?: number;
  critMultiplier?: number;
  burstCount?: number;
  projectileCountPerShot?: number;
  projectileRowSpread?: number;
  maxRangeCols?: number;
  canTargetRows?: number;
  attackBehind?: boolean;
  targetPriority?: 'closest' | 'furthest' | 'lowest_hp' | 'highest_hp' | 'fastest';
  splashRadius?: number;
  pierceCount?: number;
  chainBounceCount?: number;
  chainBounceRangeCols?: number;
  chainDamageDecay?: number;
  knockbackCols?: number;
  stunDuration?: number;
  silenceDuration?: number;
  slowFactor?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  energyAmount?: number;
  energyInterval?: number;
  deployEnergyBonus?: number;
  healAmount?: number;
  healInterval?: number;
  armTime?: number;
  explosionDamage?: number;
  explosionRadiusCols?: number;
  explosionRadiusRows?: number;
  thornsDps?: number;
  reflectDamagePercent?: number;
  lifestealRatio?: number;
  regenHpPerSec?: number;
  shieldOnDeploy?: number;
  shieldColor?: string;
  shieldRegenPerSec?: number;
  maxShieldHp?: number;
  floorTrapDps?: number;
  aoeTargets?: number;
  aoeRadiusRows?: number;
  aoeRadiusCols?: number;
  passThrough?: boolean;
  projectileKind?: ProjectileKind;
  projectileSpeed?: number;
  canBeHypnotized?: boolean;
  immuneToPsych?: boolean;
  placementRule?: 'any' | 'frontHalf' | 'backHalf' | 'rows' | 'cols';
  allowedRows?: number[];
  allowedCols?: number[];
  canPlaceOnObstacles?: boolean;
  maxPerBoard?: number;
  maxPerRow?: number;
  effects?: string[];
  onDeployEffects?: string[];
  onAttackEffects?: string[];
  onHitEffects?: string[];
  onDeathEffects?: string[];
  onDeathExplosionDamage?: number;
  onDeathExplosionRadius?: number;
  onDeployTriggerEventId?: string;
  onDeathTriggerEventId?: string;
  particles?: TowerParticleHooks;
  soundOnDeploy?: EffectSoundKey | (string & {});
  soundOnAttack?: string;
  soundOnDeath?: EffectSoundKey | (string & {});
  inlineDesign?: Partial<TowerDesignConfig>;
}

export interface EnemyRangedAttackConfig {
  rangeCols: number;
  intervalSec: number;
  damage: number;
  splashRadius?: number;
  stunSec?: number;
  rowSpan?: number;
  particlePresetId?: string;
  beamColor?: string;
  sound?: EffectSoundKey | (string & {});
}

export interface EnemyPeriodicSummonConfig {
  intervalSec: number;
  initialDelaySec?: number;
  type: EnemyType;
  count?: number;
  offsetCol?: number;
  rowSpread?: number;
  maxAlive?: number;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  sound?: EffectSoundKey | (string & {});
  particlePresetId?: string;
}

export interface EnemyEnrageConfig {
  hpRatio: number;
  triggerCol?: number;
  convulseSec?: number;
  newHp?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  stunRadiusRow?: number;
  stunRadiusCol?: number;
  stunSec?: number;
  badge?: string;
  color?: string;
  sound?: EffectSoundKey | (string & {});
  particlePresetId?: string;
}

export interface EnemyBehaviorConfig {
  laneSpan?: number;
  defaultPackCount?: number;
  immunities?: EnemyImmunity[];
  damageReduction?: number;
  maxDamagePerHit?: number;
  knockbackResist?: number;
  dodgeChance?: number;
  initialShieldHp?: number;
  shieldColor?: string;
  shieldRegenPerSec?: number;
  regenHpPerSec?: number;
  thornsDps?: number;
  reflectDamagePercent?: number;
  lifestealRatio?: number;
  reviveCount?: number;
  reviveHpPercent?: number;
  eliteBadge?: string;
  eliteColor?: string;
  rewardsEnergyOnKill?: number;
  untargetableUntilCol?: number;
  laneHopIntervalSec?: number;
  laneHopMode?: 'random' | 'toward_towers' | 'avoid_towers';
  speedScaleAsHpDrops?: {
    maxBonusMultiplier: number;
  };
  enrageOnLowHp?: EnemyEnrageConfig;
  rangedAttack?: EnemyRangedAttackConfig;
  summonPeriodic?: EnemyPeriodicSummonConfig;
  onKillConvertTo?: {
    type: EnemyType;
    hpMultiplier?: number;
    particlePresetId?: string;
  };
  onDeathSplit?: {
    type: EnemyType;
    count: number;
    spreadRows?: number;
    hpMultiplier?: number;
    particlePresetId?: string;
  };
  onDeathExplosion?: {
    radiusCols: number;
    radiusRows?: number;
    damage: number;
    stunSec?: number;
    particlePresetId?: string;
    sound?: EffectSoundKey | (string & {});
  };
  onSpawnTriggerEventId?: string;
  onDeathTriggerEventId?: string;
  spawnRule?: {
    mode: 'edge' | 'sky';
    colRange?: [number, number];
    maxPerLevel?: number;
  };
  instakillTower?: boolean;
  disappearOnHit?: boolean;
  bounceAccel?: {
    accelPerSec: number;
    maxSpeed: number;
  };
  pocketDimension?: {
    effectId: string;
  };
  blinkJump?: {
    effectId: string;
    intervalSec?: number;
    cells?: number;
    paranoiaPartner?: EnemyType;
    paranoiaIntervalSec?: number;
    paranoiaCells?: number;
  };
  plagueAura?: {
    effectId: string;
    buffTarget: EnemyType;
    convertType: EnemyType;
  };
  sleepAura?: {
    effectId: string;
  };
  hypnosisGlobal?: {
    effectId: string;
  };
  skyPull?: {
    effectId: string;
  };
  enrage096?: {
    triggerCol: number;
    convulseSec: number;
    enragedHpFrom: EnemyType;
    enragedSpeed: number;
    enragedDps: number;
    stunRadiusRow: number;
    stunRadiusCol: number;
    effectId: string;
  };
  vaseSpawner?: {
    spawnType: EnemyType;
    effectId: string;
  };
  screamArea?: {
    effectId: string;
  };
  doorController?: {
    effectId: string;
    triggerHpRatio: number;
  };
}

export interface EnemyDefinition {
  type: EnemyType;
  code: string;
  name: string;
  classification: string;
  hp: number;
  speed: number;
  dps: number;
  scoreValue: number;
  portrait: string;
  summary: string;
  tacticalNote: string;
  effects: string[];
  isSummon?: boolean;
  announcement?: string;
  behavior?: EnemyBehaviorConfig;
  particles?: EnemyParticleHooks;
  soundOnSpawn?: EffectSoundKey | (string & {});
  soundOnDeath?: EffectSoundKey | (string & {});
  inlineDesign?: Partial<EnemyDesignConfig>;
}

export interface LevelSkyEnergyConfig {
  disabled?: boolean;
  amount?: number;
  intervalMinSec?: number;
  intervalVarianceSec?: number;
  initialDelaySec?: number;
}

export type WeatherParticleKind =
  | 'none'
  | 'ash'
  | 'snow'
  | 'sparks'
  | 'spores'
  | 'rain'
  | 'static'
  | 'embers';

export interface LevelEnvironmentConfig {
  weather?: WeatherParticleKind;
  weatherColor?: string;
  weatherDensity?: number;
  weatherSpeed?: number;
  tintColor?: string;
  tintAlpha?: number;
  tintPulseSpeed?: number;
  alertLevel?: 'normal' | 'warning' | 'critical';
}

export interface LevelRulesConfig {
  enemyHpMultiplier?: number;
  enemySpeedMultiplier?: number;
  enemyDpsMultiplier?: number;
  towerHpMultiplier?: number;
  towerDamageMultiplier?: number;
  towerFireRateMultiplier?: number;
  towerCostMultiplier?: number;
  towerCooldownMultiplier?: number;
  energyCap?: number;
  passiveEnergyPerSec?: number;
  maxTowersOnBoard?: number;
  bannedTowers?: Array<TowerType | (string & {})>;
  lockedDeck?: Array<TowerType | (string & {})>;
}

export interface BlockedCellConfig {
  row: number;
  col: number;
  label?: string;
  color?: string;
}

export type TileModifierKind =
  | 'heal'
  | 'damage_tower'
  | 'damage_enemy'
  | 'boost_fire'
  | 'boost_damage'
  | 'slow_enemy'
  | 'energy'
  | 'shield'
  | 'ignite_projectiles'
  | 'chill_projectiles'
  | 'pierce_projectiles'
  | 'boost_projectile_damage'
  | 'speed_enemy'
  | 'heal_enemy'
  | 'regen_barrier'
  | 'block_enemy_spawn'
  | 'apply_effect';

export interface TileModifierConfig {
  id?: string;
  row?: number;
  col?: number;
  rows?: number[];
  cols?: number[];
  kind: TileModifierKind;
  value?: number;
  appliesEffectId?: string;
  targetSide?: 'towers' | 'enemies' | 'all';
  color?: string;
  strokeColor?: string;
  sprite?: string;
  opacity?: number;
  label?: string;
  durationSec?: number;
  remaining?: number;
}

export interface TileOverrideConfig {
  row?: number;
  col?: number;
  rows?: number[];
  cols?: number[];
  color?: string;
  strokeColor?: string;
  sprite?: string;
  spriteOpacity?: number;
  label?: string;
  labelColor?: string;
  opacity?: number;
}

export type BoardObstacleKind = 'tombstone' | 'barricade' | 'anomaly_node' | 'debris' | 'custom';

export interface ObstacleDestroySpawnConfig {
  type: EnemyType | (string & {});
  count?: number;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  immunities?: EnemyImmunity[];
  eliteBadge?: string;
  eliteColor?: string;
}

export interface BoardObstacleConfig {
  id?: string;
  kind?: BoardObstacleKind;
  row: number;
  col: number;
  hp?: number;
  destructible?: boolean;
  blocksPlacement?: boolean;
  blocksProjectiles?: boolean;
  blocksEnemies?: boolean;
  blocksEnemySpawn?: boolean;
  canSpawnEnemies?: boolean;
  allowCounterPlacement?: boolean;
  counterTowerTypes?: Array<TowerType | (string & {})>;
  counterDamageMultiplier?: number;
  absorbsSplash?: boolean;
  rewardEnergy?: number;
  spawnOnDestroy?: ObstacleDestroySpawnConfig;
  triggerEventOnDestroy?: string;
  sprite?: string;
  crackedSprite?: string;
  color?: string;
  strokeColor?: string;
  crackedColor?: string;
  label?: string;
  widthRatio?: number;
  heightRatio?: number;
}

export interface BoardObstacle {
  id: string;
  kind: BoardObstacleKind;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  destructible: boolean;
  blocksPlacement: boolean;
  blocksProjectiles: boolean;
  blocksEnemies: boolean;
  blocksEnemySpawn: boolean;
  canSpawnEnemies: boolean;
  allowCounterPlacement: boolean;
  counterTowerTypes?: string[];
  counterDamageMultiplier: number;
  absorbsSplash?: boolean;
  rewardEnergy: number;
  spawnOnDestroy?: ObstacleDestroySpawnConfig;
  triggerEventOnDestroy?: string;
  sprite?: string;
  crackedSprite?: string;
  color?: string;
  strokeColor?: string;
  crackedColor?: string;
  label?: string;
  widthRatio?: number;
  heightRatio?: number;
  hitFlash: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  title?: string;
  role?: string;
  faction?: string;
  description?: string;
  defaultExpression?: string;
  defaultPortrait?: string;
  expressions?: Record<string, string>;
  side?: 'left' | 'right' | 'center';
  accentColor?: string;
  textColor?: string;
  voicePitch?: number;
}

export interface DialogueChoice {
  label: string;
  nextIndex?: number;
  nextLineId?: string;
  nextDialogueId?: string;
  triggerEventId?: string;
  energyDelta?: number;
  closeDialogue?: boolean;
}

export interface DialogueLine {
  id?: string;
  characterId?: string;
  speakerName?: string;
  speakerTitle?: string;
  expression?: string;
  portrait?: string;
  side?: 'left' | 'right' | 'center';
  text: string;
  color?: string;
  sound?: EffectSoundKey | (string & {});
  triggerEventId?: string;
  energyDelta?: number;
  choices?: DialogueChoice[];
  autoAdvanceSec?: number;
  nextIndex?: number;
  nextLineId?: string;
  endAfterLine?: boolean;
}

export interface DialogueDefinition {
  id: string;
  title?: string;
  description?: string;
  pauseGame?: boolean;
  skippable?: boolean;
  typingSpeedCps?: number;
  backdropTint?: string;
  lines: DialogueLine[];
  onCompleteEventId?: string;
}

export interface StartingTowerConfig {
  type: TowerType | (string & {});
  row: number;
  col: number;
  hp?: number;
  immuneToPsych?: boolean;
  shieldHp?: number;
}

export interface StartingEnemyConfig {
  type: EnemyType | (string & {});
  row: number | [number, number];
  col?: number;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  immunities?: EnemyImmunity[];
  eliteBadge?: string;
  eliteColor?: string;
}

export interface StartingDoorConfig {
  row: number;
  col: number;
  isOpen?: boolean;
  toggleIntervalSec?: number;
}

export type ObjectiveCategory = 'primary' | 'secondary' | 'bonus' | 'fail_condition';

export type ObjectiveKind =
  | 'no_enemy_past_col'
  | 'no_enemy_reach_row_col'
  | 'no_tesla_gate_used'
  | 'max_tesla_gates_used'
  | 'max_towers_lost'
  | 'max_towers_deployed'
  | 'max_towers_alive'
  | 'min_towers_alive'
  | 'protect_obstacles'
  | 'destroy_all_obstacles'
  | 'kill_enemies'
  | 'min_energy_remaining'
  | 'max_energy_spent'
  | 'survive_time'
  | 'no_tower_type_used'
  | 'keep_tower_hp_above'
  | 'event_triggered';

export interface ObjectiveDefinition {
  id: string;
  title?: string;
  description: string;
  category?: ObjectiveCategory;
  kind: ObjectiveKind;
  col?: number;
  minCol?: number;
  maxCol?: number;
  rows?: number[];
  enemyTypes?: Array<EnemyType | (string & {})>;
  excludeEnemyTypes?: Array<EnemyType | (string & {})>;
  towerTypes?: Array<TowerType | (string & {})>;
  towerCategory?: TowerCategory;
  obstacleKind?: BoardObstacleKind | (string & {});
  eventId?: string;
  targetCount?: number;
  maxCount?: number;
  minCount?: number;
  targetSeconds?: number;
  minEnergy?: number;
  maxEnergy?: number;
  minHpRatio?: number;
  ignoreSkyFalling?: boolean;
  failOnViolate?: boolean;
  requiredForVictory?: boolean;
  failReason?: string;
  showBoundaryLine?: boolean;
  boundaryColor?: string;
  boundaryLabel?: string;
  rewardEnergy?: number;
  scoreBonus?: number;
  color?: string;
}

export type LevelObjectiveSpec =
  | string
  | (Partial<ObjectiveDefinition> & {
      objectiveId?: string;
    });

export interface ObjectiveProgressState {
  def: ObjectiveDefinition;
  category: ObjectiveCategory;
  status: 'active' | 'completed' | 'failed';
  currentValue: number;
  targetValue?: number;
  progressText?: string;
  rewardClaimed?: boolean;
}

export type VictoryConditionMode =
  | 'standard'
  | 'survive_time'
  | 'kill_count'
  | 'destroy_obstacles'
  | 'objectives_only'
  | 'survive_and_kill'
  | 'boss_hunt'
  | 'endless';

export interface LevelVictoryCondition {
  mode?: VictoryConditionMode;
  targetSeconds?: number;
  targetKills?: number;
  targetEnemyTypes?: Array<EnemyType | (string & {})>;
  targetObstacles?: number;
  obstacleKind?: BoardObstacleKind | (string & {});
  requireClearAfter?: boolean;
  breachCol?: number;
  defeatOnZeroTowersAfterSec?: number;
  label?: string;
  victoryTitle?: string;
  victorySubtitle?: string;
}

export type LevelEventTriggerType =
  | 'at_time'
  | 'on_start'
  | 'periodic'
  | 'on_flag_horde'
  | 'on_progress'
  | 'on_enemy_count_above'
  | 'on_enemy_count_below'
  | 'on_tower_count_above'
  | 'on_tower_count_below'
  | 'on_energy_above'
  | 'on_energy_below'
  | 'on_kill_count'
  | 'on_obstacle_destroyed'
  | 'on_dialogue_end'
  | 'on_enemy_type_spawn'
  | 'on_enemy_low_hp'
  | 'on_wave_index';

export interface EnemyTargetFilter {
  types?: string[];
  excludeTypes?: string[];
  packIds?: string[];
  eliteOnly?: boolean;
  nonEliteOnly?: boolean;
  eliteBadges?: string[];
  rows?: number[];
  cols?: number[];
  colRange?: [number, number];
  minHpRatio?: number;
  maxHpRatio?: number;
  isAttacking?: boolean;
  hasEffectIds?: string[];
  sortBy?:
    | 'closest_to_breach'
    | 'furthest_from_breach'
    | 'lowest_hp'
    | 'highest_hp'
    | 'fastest'
    | 'random';
  maxTargets?: number;
}

export interface EnemyMutationEntry {
  filter?: EnemyTargetFilter;
  damageInstant?: number;
  damagePercentMaxHp?: number;
  healAmount?: number;
  healPercent?: number;
  shieldHp?: number;
  shieldColor?: string;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  stunSec?: number;
  slowFactor?: number;
  slowSec?: number;
  burnDps?: number;
  burnSec?: number;
  silenceSec?: number;
  knockbackCols?: number;
  advanceCols?: number;
  teleportToCol?: number;
  shiftLane?: number;
  transformToType?: EnemyType | (string & {});
  addEffects?: string[];
  removeEffects?: string[];
  addImmunities?: EnemyImmunity[];
  removeImmunities?: EnemyImmunity[];
  eliteBadge?: string;
  eliteColor?: string;
  floatingText?: string;
  floatingTextColor?: string;
  triggerEffectId?: string;
  sound?: EffectSoundKey;
}

export interface LevelEventSpawnEntry {
  type: EnemyType | (string & {});
  count?: number;
  row?: number | [number, number];
  rows?: Array<number | [number, number]>;
  col?: number;
  staggerSec?: number;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  immunities?: EnemyImmunity[];
  eliteBadge?: string;
  eliteColor?: string;
}

export interface LevelEventApplyEffectEntry {
  effectId?: string;
  inlineEffect?: Partial<EffectDefinition>;
  targetSide?: 'towers' | 'enemies' | 'all';
  areaShape?: EffectAreaShape;
  rows?: number[] | 'random';
  cols?: number[] | [number, number];
  radiusCells?: number;
  targetCategories?: TowerCategory[];
  targetTypes?: string[];
  excludeTypes?: string[];
  enemyFilter?: EnemyTargetFilter;
  maxTargets?: number;
  durationOverrideSec?: number;
}

export interface LevelEventLogicConfig {
  spawns?: LevelEventSpawnEntry[];
  spawnFromObstacles?: {
    obstacleKind?: BoardObstacleKind | (string & {});
    rows?: number[];
    cols?: number[];
    types: LevelEventSpawnEntry[];
    countPerObstacle?: number;
    destroyObstacleAfter?: boolean;
    maxObstacles?: number;
  };
  spawnObstacles?: BoardObstacleConfig[];
  destroyObstacles?: {
    kind?: BoardObstacleKind | (string & {});
    rows?: number[];
    cols?: number[];
    triggerDestroyEffects?: boolean;
  };
  addTileModifiers?: TileModifierConfig[];
  removeTileModifiers?: {
    id?: string;
    kind?: TileModifierKind;
    rows?: number[];
    cols?: number[];
  };
  addBlockedCells?: BlockedCellConfig[];
  removeBlockedCells?: {
    rows?: number[];
    cols?: number[];
  };
  mutateEnemies?: EnemyMutationEntry[];
  energyDelta?: number;
  energyDrops?: {
    count?: number;
    amount?: number;
    row?: number;
    col?: number;
  };
  applyEffects?: LevelEventApplyEffectEntry[];
  clearNegativeTowerStatuses?: boolean;
  clearNegativeEnemyStatuses?: boolean;
  spawnDoors079?: {
    count: number;
    durationSec?: number;
    minCol?: number;
    maxCol?: number;
  };
  clearDoors079?: boolean;
  teslaGateAction?: {
    action: 'fire' | 'disable' | 'enable' | 'recharge';
    rows?: number[];
  };
  globalModifiers?: {
    durationSec?: number;
    enemySpeedMultiplier?: number;
    enemyDamageMultiplier?: number;
    towerFireRateMultiplier?: number;
    towerDamageMultiplier?: number;
    energyGenerationMultiplier?: number;
    autoCollectEnergy?: boolean;
  };
  boardOverride?: Partial<BoardDesignConfig>;
  boardOverrideDurationSec?: number;
  dialogueId?: string;
  inlineDialogue?: DialogueDefinition;
  chainEventId?: string;
  chainDelaySec?: number;
  announcement?: string;
  bannerText?: string;
  bannerStyle?: 'info' | 'warning' | 'danger' | 'horde';
}

export interface LevelEventLaneHighlight {
  rows?: number[];
  cols?: number[];
  color?: string;
  strokeColor?: string;
  label?: string;
  durationSec?: number;
  pulseSpeed?: number;
}

export interface LevelEventVisualConfig {
  screenTintRgb?: string;
  screenTintAlpha?: number;
  screenTintDurationSec?: number;
  screenTintPulseSpeed?: number;
  flashRgb?: string;
  flashAlpha?: number;
  flashDecaySpeed?: number;
  shakeIntensity?: number;
  shakeDurationSec?: number;
  weather?: WeatherParticleKind;
  weatherColor?: string;
  weatherDensity?: number;
  weatherSpeed?: number;
  weatherDurationSec?: number;
  laneHighlight?: LevelEventLaneHighlight;
  waveKind?: EffectVisualConfig['waveKind'];
  waveColorRgb?: string;
  waveRadiusPx?: number;
  waveDurationSec?: number;
  waveRow?: number;
  waveCol?: number;
  particleBurst?: EffectParticleBurstConfig;
  particlePresetId?: string;
  floatingText?: string;
  floatingTextColor?: string;
  sound?: EffectSoundKey;
  bannerText?: string;
  bannerColor?: string;
  bannerBorderColor?: string;
  bannerDurationSec?: number;
}

export interface LevelEventDefinition {
  id: string;
  name?: string;
  description?: string;
  trigger?: LevelEventTriggerType;
  time?: number;
  initialDelaySec?: number;
  intervalSec?: number;
  durationSec?: number;
  cooldownSec?: number;
  maxTriggers?: number;
  chance?: number;
  threshold?: number;
  progressRatio?: number;
  targetDialogueId?: string;
  targetEnemyType?: string;
  hpThresholdRatio?: number;
  waveIndex?: number;
  logic?: LevelEventLogicConfig;
  visual?: LevelEventVisualConfig;
}

// Raw customizable level schema stored in levels.json
// `time` = relative delay in seconds since the previous wave (or `absoluteTime` for exact timestamp)!
// `row` / `rows` are optional (omitted = random row(s)); `[x1, x2]` spans 2 rows (e.g. SCP-682).
// `flagMarkers` is optional (auto-computed from `isFlagHorde` events).
export interface RawLevelEvent {
  time: number;
  absoluteTime?: number;
  type?: EnemyType;
  row?: number | [number, number];
  rows?: Array<number | [number, number]>;
  col?: number;
  count?: number;
  staggerSec?: number;
  repeat?: {
    times: number;
    intervalSec: number;
  };
  isFlagHorde?: boolean;
  hordeLabel?: string;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  immunities?: EnemyImmunity[];
  eliteBadge?: string;
  eliteColor?: string;
  announcement?: string;
  dialogueId?: string;
  inlineDialogue?: DialogueDefinition;
  eventId?: string;
  eventOverrides?: Partial<LevelEventDefinition>;
  event?: Partial<LevelEventDefinition>;
}

export interface RawLevelConfig {
  level?: number;
  title: string;
  description: string;
  coverImage?: string;
  portrait?: string;
  bannerImage?: string;
  startingEnergy: number;
  maxDeckSlots: number;
  rows?: number;
  cols?: number;
  grid?: { rows?: number; cols?: number };
  boardOverride?: Partial<BoardDesignConfig>;
  environment?: LevelEnvironmentConfig;
  rules?: LevelRulesConfig;
  disableTeslaGates?: boolean;
  autoCollectEnergy?: boolean;
  skyEnergy?: LevelSkyEnergyConfig;
  blockedCells?: BlockedCellConfig[];
  tileModifiers?: TileModifierConfig[];
  tileOverrides?: TileOverrideConfig[];
  obstacles?: BoardObstacleConfig[];
  tombstones?: BoardObstacleConfig[];
  startingTowers?: StartingTowerConfig[];
  startingEnemies?: StartingEnemyConfig[];
  startingDoors079?: StartingDoorConfig[];
  globalEffects?: string[];
  levelEvents?: Array<string | (Partial<LevelEventDefinition> & { eventId?: string })>;
  objectives?: LevelObjectiveSpec[];
  introDialogueId?: string;
  victoryDialogueId?: string;
  defeatDialogueId?: string;
  inlineDialogues?: Record<string, DialogueDefinition>;
  victoryCondition?: LevelVictoryCondition;
  enemiesPresent?: EnemyType[];
  durationSeconds?: number;
  flagMarkers?: number[];
  rewardLabel?: string | null;
  unlockTower?: TowerType;
  events: RawLevelEvent[];
}

export interface ResolvedSpawnTarget {
  row: number;
  occupiedRows: number[];
}

export interface LevelEvent {
  time: number; // Absolute seconds from level start (computed from relative `time` delays)
  type?: EnemyType;
  targets: ResolvedSpawnTarget[];
  col?: number;
  staggerSec?: number;
  isFlagHorde?: boolean;
  hordeLabel?: string;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  immunities?: EnemyImmunity[];
  eliteBadge?: string;
  eliteColor?: string;
  announcement?: string;
  dialogueId?: string;
  inlineDialogue?: DialogueDefinition;
  eventId?: string;
  eventOverrides?: Partial<LevelEventDefinition>;
  event?: Partial<LevelEventDefinition>;
}

export interface LevelConfig {
  level: number;
  title: string;
  description: string;
  coverImage?: string;
  startingEnergy: number;
  maxDeckSlots: number;
  gridRows: number;
  gridCols: number;
  boardOverride?: Partial<BoardDesignConfig>;
  environment?: LevelEnvironmentConfig;
  rules?: LevelRulesConfig;
  disableTeslaGates?: boolean;
  autoCollectEnergy?: boolean;
  skyEnergy?: LevelSkyEnergyConfig;
  blockedCells?: BlockedCellConfig[];
  tileModifiers?: TileModifierConfig[];
  tileOverrides?: TileOverrideConfig[];
  obstacles?: BoardObstacleConfig[];
  startingTowers?: StartingTowerConfig[];
  startingEnemies?: StartingEnemyConfig[];
  startingDoors079?: StartingDoorConfig[];
  globalEffects?: string[];
  levelEvents?: Array<string | (Partial<LevelEventDefinition> & { eventId?: string })>;
  objectives?: ObjectiveDefinition[];
  introDialogueId?: string;
  victoryDialogueId?: string;
  defeatDialogueId?: string;
  inlineDialogues?: Record<string, DialogueDefinition>;
  victoryCondition?: LevelVictoryCondition;
  enemiesPresent: EnemyType[];
  durationSeconds: number;
  flagMarkers: number[];
  rewardLabel: string | null;
  unlockTower?: TowerType;
  rawEvents: RawLevelEvent[];
}

export type TowerDesignShape =
  | 'researcher'
  | 'guard'
  | 'medic'
  | 'engineer'
  | 'shotgunner'
  | 'cryo'
  | 'pyro'
  | 'mtf'
  | 'heavy_gunner'
  | 'grenadier'
  | 'psionic'
  | 'sniper'
  | 'barricade'
  | 'bunker'
  | 'mine'
  | 'generator'
  | 'laser_trap'
  | 'tesla_coil'
  | 'radio'
  | 'turret';

export type EnemyDesignShape =
  | 'zombie'
  | 'wraith'
  | 'quadruped'
  | 'sculpture'
  | 'plague_doc'
  | 'masked'
  | 'parchment'
  | 'shy_guy'
  | 'vase'
  | 'spawnling'
  | 'corrosive'
  | 'yarn_eyes'
  | 'crt_ai'
  | 'bounce_ball'
  | 'heart_beast'
  | 'reptile_giant';

export type SpriteRenderMode = 'replace' | 'under' | 'over';
export type ProjectileDesignShape =
  | 'circle'
  | 'streak'
  | 'pellet_cluster'
  | 'diamond'
  | 'laser_bolt'
  | 'orb'
  | 'rocket'
  | 'ring'
  | 'sprite';

export type CustomShapePrimitiveType =
  | 'rect'
  | 'roundRect'
  | 'circle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'arc'
  | 'text';

export type CustomShapeCondition =
  | 'always'
  | 'slowed'
  | 'notSlowed'
  | 'disabled'
  | 'enabled'
  | 'armed'
  | 'unarmed'
  | 'enraged'
  | 'convulsing'
  | 'damaged'
  | 'burning';

export interface CustomShapeLayer {
  type: CustomShapePrimitiveType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x2?: number;
  y2?: number;
  points?: number[][];
  startDeg?: number;
  endDeg?: number;
  closed?: boolean;
  text?: string;
  font?: string;
  textAlign?: CanvasTextAlign;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
  opacity?: number;
  rotationDeg?: number;
  applyBob?: boolean;
  applyRecoil?: number;
  applyShake?: boolean;
  pulseSpeed?: number;
  pulseMinAlpha?: number;
  pulseMaxAlpha?: number;
  condition?: CustomShapeCondition;
}

export interface CustomShapeDefinition {
  layers: CustomShapeLayer[];
}

export interface TowerDesignConfig {
  shape?: TowerDesignShape | (string & {});
  layers?: CustomShapeLayer[];
  sprite?: string;
  spriteMode?: SpriteRenderMode;
  spriteWidth?: number;
  spriteHeight?: number;
  spriteOffsetX?: number;
  spriteOffsetY?: number;
  spriteFlipX?: boolean;
  spriteOpacity?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotationDeg?: number;
  bobSpeed?: number;
  bobAmount?: number;
  shadow?: boolean;
  shadowColor?: string;
  shadowRadiusX?: number;
  shadowRadiusY?: number;
  shadowOffsetY?: number;
  glowColor?: string;
  glowBlur?: number;
  pulseRgb?: string;
  pulseSpeed?: number;
  body: string;
  stroke: string;
  strokeWidth?: number;
  headOrTop: string;
  accent: string;
  weaponOrDetail: string;
  secondary?: string;
  detail?: string;
  glow?: string;
  disabledBody?: string;
  disabledStroke?: string;
  disabledAccent?: string;
  showHpBar?: boolean;
  hpBarWidth?: number;
  hpBarHeight?: number;
  hpBarOffsetY?: number;
  hpBarFill?: string;
  hpBarBg?: string;
  shieldBarColor?: string;
  shieldRingColor?: string;
  label?: string;
  labelColor?: string;
  auraColor?: string;
  auraRadius?: number;
  auraPulseSpeed?: number;
  outlineGlowColor?: string;
  outlineGlowBlur?: number;
  breatheAmp?: number;
  breatheSpeed?: number;
  recoilScale?: number;
  opacity?: number;
}

export interface EnemyDesignConfig {
  shape?: EnemyDesignShape | (string & {});
  layers?: CustomShapeLayer[];
  sprite?: string;
  spriteMode?: SpriteRenderMode;
  spriteWidth?: number;
  spriteHeight?: number;
  spriteOffsetX?: number;
  spriteOffsetY?: number;
  spriteFlipX?: boolean;
  spriteOpacity?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotationDeg?: number;
  multiRow?: boolean;
  bobSpeed?: number;
  bobAmount?: number;
  shadow?: boolean;
  shadowColor?: string;
  shadowRadiusX?: number;
  shadowRadiusY?: number;
  shadowOffsetY?: number;
  body: string;
  stroke: string;
  strokeWidth?: number;
  head: string;
  accent: string;
  secondary?: string;
  detail?: string;
  aura?: string;
  auraRadius?: number;
  auraPulseSpeed?: number;
  glowColor?: string;
  glowBlur?: number;
  slowBody?: string;
  slowHead?: string;
  slowDetail?: string;
  revivedBody?: string;
  revivedStroke?: string;
  revivedAccent?: string;
  revivedLabel?: string;
  enragedStroke?: string;
  enragedMouth?: string;
  enragedLabel?: string;
  convulseShakeSpeed?: number;
  convulseShakeAmount?: number;
  hpBar: string;
  hpBarBg?: string;
  showHpBar?: boolean;
  barWidth: number;
  hpBarHeight?: number;
  hpBarOffsetY?: number;
  shieldBarColor?: string;
  shieldRingColor?: string;
  codeLabel: string;
  showCodeLabel?: boolean;
  labelColor?: string;
  labelBg?: string;
  labelOffsetY?: number;
  eliteGlowColor?: string;
  eliteGlowBlur?: number;
  stealthAlpha?: number;
  burnTint?: string;
  stunRingColor?: string;
  opacity?: number;
}

export interface ProjectileDesignConfig {
  shape?: ProjectileDesignShape | (string & {});
  layers?: CustomShapeLayer[];
  sprite?: string;
  spriteWidth?: number;
  spriteHeight?: number;
  rotationDeg?: number;
  rotateToVelocity?: boolean;
  spinSpeed?: number;
  color: string;
  coreColor: string;
  outlineColor?: string;
  outlineWidth?: number;
  glowColor?: string;
  glowBlur?: number;
  radius: number;
  length?: number;
  cornerRadius?: number;
  coreRatio?: number;
  pelletSpread?: number;
  trailLength?: number;
  trailColor?: string;
  trailWidth?: number;
  pulseSpeed?: number;
  alpha?: number;
  trailParticleId?: string;
  impactParticleId?: string;
}

export interface BoardDesignConfig {
  canvasBg: string;
  gateBg: string;
  breachBg: string;
  bgImage?: string;
  bgImageOpacity?: number;
  tileEven: string;
  tileOdd: string;
  tileSpriteEven?: string;
  tileSpriteOdd?: string;
  tileStroke: string;
  tileStrokeWidth?: number;
  tileCornerRadius?: number;
  tileGap?: number;
  tileHighlightColor?: string;
  arrowFill: string;
  arrowColumns?: number[];
  adaptArrowsToGrid?: boolean;
  arrowStyle?: 'chevron' | 'triangle' | 'line';
  arrowScale?: number;
  laneStroke: string;
  laneStrokeWidth?: number;
  laneAlternateTint?: string;
  showLaneNumbers?: boolean;
  laneLabelPrefix?: string;
  laneNumberColor?: string;
  gateLabel?: string;
  gateLabelColor?: string;
  gateBorderColor?: string;
  gateBorderWidth?: number;
  breachLabel?: string;
  breachLabelColor?: string;
  breachStripeDark: string;
  breachStripeAmber: string;
  breachStripeWidth?: number;
  breachStripeHeight?: number;
  outerBorderColor?: string;
  outerBorderWidth?: number;
  boundaryLineColor?: string;
  boundaryLineWidth?: number;
  boundaryLineDash?: number[];
  boundaryLabelBg?: string;
  boundaryLabelText?: string;
  blinkOverlayRgb: string;
  blinkMaxAlpha?: number;
}

export interface ZonesDesignConfig {
  lineWidth?: number;
  dashPattern?: number[];
  radioFill: string;
  radioStroke: string;
  medicFill: string;
  medicStroke: string;
  teslaFill: string;
  teslaStroke: string;
  scp966Rgb: string;
  scp966Stroke: string;
  scp966PulseSpeed?: number;
  scp966AlphaBase?: number;
  scp966AlphaAmp?: number;
  scp066Rgb: string;
  scp066Stroke: string;
  scp066WarnSec?: number;
  scp066PulseSpeed?: number;
  scp066AlphaBase?: number;
  scp066AlphaAmp?: number;
  hoverValidFill: string;
  hoverValidStroke: string;
  hoverInvalidFill: string;
  hoverInvalidStroke: string;
  hoverRemoveActiveFill: string;
  hoverRemoveActiveStroke: string;
  hoverRemoveIdleFill: string;
  hoverRemoveIdleStroke: string;
  hoverLineWidth?: number;
  hoverInset?: number;
}

export interface GatesDesignConfig {
  activeFill: string;
  activeStroke: string;
  activeCore: string;
  readyGlowRgb?: string;
  pulseSpeed?: number;
  cornerRadius?: number;
  beamColor: string;
  beamCore: string;
  beamRadius?: number;
  beamShadowBlur?: number;
  beamCoreWidth?: number;
  spentFill: string;
  spentStroke: string;
  spentCross: string;
  spriteActive?: string;
  spriteSpent?: string;
}

export interface Doors079DesignConfig {
  closedFill: string;
  closedStroke: string;
  closedAccent: string;
  closedTextColor?: string;
  closedLabel?: string;
  ledOnColor?: string;
  ledOffColor?: string;
  blinkSpeed?: number;
  spriteClosed?: string;
  openFill: string;
  openStroke: string;
  openAccent: string;
  openTextColor?: string;
  openLabel?: string;
  openDash?: number[];
  spriteOpen?: string;
}

export interface StatusDesignConfig {
  towerShadow?: string;
  enemyShadow?: string;
  multiRowShadow?: string;
  multiRowFill?: string;
  multiRowStroke?: string;
  immunePsychRingColor?: string;
  immunePsychRingWidth?: number;
  immunePsychRingRadius?: number;
  towerHitFlashRgb?: string;
  enemyHitFlashRgb?: string;
  disabledAlpha?: number;
  disabledBody?: string;
  disabledStroke?: string;
  disabledAccent?: string;
  plague049RingColor?: string;
  plague049RingWidth?: number;
  burnRingColor?: string;
  burnRingWidth?: number;
  defaultSlowBody?: string;
  defaultSlowHead?: string;
}

export interface EffectsDesignConfig {
  explosionStroke: string;
  explosionFill: string;
  explosionBaseRadius?: number;
  explosionExpandRadius?: number;
  explosionLineWidth?: number;
  stunWave: string;
  stunWaveBaseRadius?: number;
  stunWaveExpandRadius?: number;
  stunWaveLineWidth?: number;
  screamWave066: string;
  scream066BaseRadius?: number;
  scream066ExpandRadius?: number;
  scream066LineWidth?: number;
  pullBeam: string;
  pullBeamWidth?: number;
  pocketPortal: string;
  pocketPortalBaseRadius?: number;
  pocketPortalExpandRadius?: number;
  pocketPortalLineWidth?: number;
  bounceImpact: string;
  bounceImpactBaseRadius?: number;
  bounceImpactExpandRadius?: number;
  bounceImpactLineWidth?: number;
  muzzle: string;
  muzzleOffsetX?: number;
  muzzleBaseRadius?: number;
  cryoHit: string;
  cryoHitBaseRadius?: number;
  cryoHitExpandRadius?: number;
  burnHit: string;
  burnHitBaseRadius?: number;
  burnHitExpandRadius?: number;
  teslaArc: string;
  teslaArcWidth?: number;
  healRing: string;
  healRingBaseRadius?: number;
  healRingExpandRadius?: number;
  reviveRing: string;
  reviveRingBaseRadius?: number;
  reviveRingExpandRadius?: number;
  floatingTextDefaultColor?: string;
  floatingTextRisePx?: number;
}

export interface FontsDesignConfig {
  family?: string;
  enemyLabel?: string;
  towerTag?: string;
  doorLabel?: string;
  energyDrop?: string;
  floatingText?: string;
}

export interface ObstacleDesignConfig {
  color?: string;
  crackedColor?: string;
  strokeColor?: string;
  crackColor?: string;
  labelColor?: string;
  hpBarColor?: string;
  hpBarWidth?: number;
  cornerRadius?: number;
  sprite?: string;
  crackedSprite?: string;
}

export interface TileModifierDesignConfig {
  color?: string;
  borderColor?: string;
  label?: string;
  opacity?: number;
  pulseSpeed?: number;
  sprite?: string;
}

export interface HudThemeDesignConfig {
  accentColor?: string;
  panelBg?: string;
  panelBorder?: string;
  canvasBorderColor?: string;
  headerBg?: string;
}

export interface UiDesignConfig {
  hpBarBg: string;
  hpBarHigh: string;
  hpBarMid: string;
  hpBarLow: string;
  hpBarRadius?: number;
  hpBarBorderColor?: string;
  hpBarBorderWidth?: number;
  shieldBarColor?: string;
  shieldBarHeight?: number;
  shieldGlowColor?: string;
  labelText: string;
  energyDropBg: string;
  energyDropStroke: string;
  energyDropText: string;
  energyDropGlow: string;
  energyDropRadius?: number;
  energyDropHaloBase?: number;
  energyDropHaloAmp?: number;
  energyDropSprite?: string;
  energyDropShape?: 'circle' | 'diamond' | 'cell';
  energyDropPulseSpeed?: number;
  energyDropLabelPrefix?: string;
  tagBg: string;
  tagWidth?: number;
  tagHeight?: number;
  tagRadius?: number;
  tagOffsetBottom?: number;
  towerHpBarWidth?: number;
  towerHpBarHeight?: number;
  towerHpBarOffsetY?: number;
  enemyHpBarHeight?: number;
  enemyHpBarOffsetY?: number;
  enemyLabelOffsetY?: number;
  enemyLabelBg?: string;
  enemyLabelRadius?: number;
  floatingTextShadowColor?: string;
  floatingTextScale?: number;
}

export interface DesignCatalog {
  board: BoardDesignConfig;
  zones: ZonesDesignConfig;
  gates: GatesDesignConfig;
  doors079: Doors079DesignConfig;
  statuses?: StatusDesignConfig;
  badges: {
    suppressed: { border: string; text: string; label: string };
    hypnotized: { border: string; text: string; label: string };
    stunned: { border: string; text: string; label: string };
    deafened: { border: string; text: string; label: string };
    immune: { border: string; text: string; label: string };
  };
  customShapes?: Record<string, CustomShapeDefinition | CustomShapeLayer[]>;
  defaultTower?: TowerDesignConfig;
  defaultEnemy?: EnemyDesignConfig;
  defaultProjectile?: ProjectileDesignConfig;
  towers: Record<string, TowerDesignConfig>;
  enemies: Record<string, EnemyDesignConfig>;
  projectiles: Record<string, ProjectileDesignConfig>;
  obstacles?: Record<string, ObstacleDesignConfig>;
  tileModifiers?: Record<string, TileModifierDesignConfig>;
  effects: EffectsDesignConfig;
  fonts?: FontsDesignConfig;
  ui: UiDesignConfig;
  hudTheme?: HudThemeDesignConfig;
}


export interface SectorDefinition {
  id: number;
  label: string;
  start: number;
  end: number;
}

export interface GameConfig {
  app: {
    title: string;
    storageKey: string;
    sectorBackdropImage: string;
  };
  levelOrder?: number[];
  scpOrder?: string[];
  towerOrder?: string[];
  grid: {
    rows: number;
    cols: number;
  };
  boardLayout: {
    gateWidth: number;
    breachMargin: number;
    padTop: number;
    padBottom: number;
    cellSize: number;
  };
  progression: {
    autoDeckMaxLevel: number;
    defaultStarterDeck: TowerType[];
    defaultDeckPriority: TowerType[];
    sectors: SectorDefinition[];
  };
  gameplay: {
    energyDropAmount: number;
    initialSkyEnergyDelaySec: number;
    skyEnergyIntervalMinSec: number;
    skyEnergyIntervalVarianceSec: number;
    skyEnergyColMin: number;
    skyEnergyColSpan: number;
    energyDropLifetimeSec: number;
    energyDropCollectRadiusPx: number;
    removeRefundRatio: number;
    announcementDurationSec: number;
    flagBannerDurationSec: number;
    defaultFlagBanner: string;
    projectileSpeeds: Record<string, number>;
    doors079: {
      minCol: number;
      toggleMinSec: number;
      toggleVarianceSec: number;
    };
    teslaGate: {
      firingDurationSec: number;
      sweepSpeedColsPerSec: number;
    };
  };
  trackUi: {
    nodeSpacing: number;
    trackHeight: number;
    waveAmplitude: number;
  };
  admin: {
    secret: string;
    quickJumpLevels: number[];
  };
}

export interface ActiveEffectState {
  id: string;
  remaining: number;
  dotDps?: number;
  hotHps?: number;
  energyPerSec?: number;
  slowFactor?: number;
  speedMultiplier?: number;
  fireRateMultiplier?: number;
  damageMultiplier?: number;
  projectileSpeedMultiplier?: number;
  damageReduction?: number;
  vulnerableMultiplier?: number;
  lifestealRatio?: number;
  thornsDps?: number;
  reflectDamagePercent?: number;
  shieldDecayPerSec?: number;
  disableTowerActions?: boolean;
  hypnotizeTower?: boolean;
  immuneToPsych?: boolean;
  silence?: boolean;
  badgeLabel?: string;
  color?: string;
  textColor?: string;
  tintColor?: string;
}

export interface Tower {
  id: string;
  type: TowerType;
  category: TowerCategory;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  shieldHp?: number;
  shieldColor?: string;
  actionTimer: number;
  armProgress: number;
  isArmed: boolean;
  suppressed: boolean;
  hypnotized: boolean;
  radioProtected: boolean;
  stunTimer: number;
  deafTimer: number;
  immuneToPsych: boolean;
  recoil: number;
  hitFlash: number;
  activeEffects?: Record<string, ActiveEffectState>;
  effectTimers?: Record<string, number>;
  effectCooldowns?: Record<string, number>;
  effectTriggered?: Record<string, number>;
  customFireRateMult?: number;
  customDamageMult?: number;
  customProjSpeedMult?: number;
  customDamageReduction?: number;
  customVulnerableMult?: number;
  customLifesteal?: number;
  customThornsDps?: number;
  customDisabled?: boolean;
  customBadge?: { label: string; color: string; textColor?: string };
  customTintColor?: string;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  row: number;
  occupiedRows: number[]; // Usually [row], or [x1, x2] for 2-lane SCP-682
  col: number;
  hp: number;
  maxHp: number;
  shieldHp?: number;
  shieldColor?: string;
  baseSpeed: number;
  currentSpeed: number;
  dps: number;
  slowTimer: number;
  slowFactor: number;
  burnTimer: number;
  burnDps: number;
  stunTimer?: number;
  silenceTimer?: number;
  hitFlash: number;
  animPhase: number;
  blinkMoveTimer: number;
  laneHopTimer?: number;
  rangedAttackTimer?: number;
  summonPeriodicTimer?: number;
  trailParticleTimer?: number;
  genericEnrageTriggered?: boolean;
  genericEnrageConvulseTimer?: number;
  hasRevived: boolean;
  isAttacking: boolean;
  packId?: string;
  skyOffsetRows: number;
  pullTimer: number;
  phase096: 'calm' | 'convulsing' | 'enraged';
  convulseTimer: number;
  vaseSpawnTimer: number;
  screamTimer066: number;
  phase079Triggered: boolean;
  extraEffects?: string[];
  extraImmunities?: EnemyImmunity[];
  lastHitByTowerId?: string;
  activeEffects?: Record<string, ActiveEffectState>;
  effectTimers?: Record<string, number>;
  effectCooldowns?: Record<string, number>;
  effectTriggered?: Record<string, number>;
  customSpeedMult?: number;
  customDamageMult?: number;
  customDamageReduction?: number;
  customVulnerableMult?: number;
  customLifesteal?: number;
  customThornsDps?: number;
  extraLivesLeft?: number;
  extraReviveHpPercent?: number;
  customBadge?: { label: string; color: string; textColor?: string };
  customTintColor?: string;
}

export interface Door079 {
  id: string;
  row: number;
  col: number;
  isOpen: boolean;
  toggleTimer: number;
  remainingLifetime?: number;
  toggleIntervalSec?: number;
}

export interface PocketRescue {
  id: string;
  towerType: TowerType;
  category: TowerCategory;
  hp: number;
  maxHp: number;
  row: number;
  col: number;
  timer: number;
}

export interface Projectile {
  id: string;
  row: number;
  col: number;
  originCol: number;
  direction?: 1 | -1;
  maxRangeCols?: number;
  splashRadius?: number;
  speed: number;
  damage: number;
  damageType?: DamageTypeKind;
  armorPenetration?: number;
  critChance?: number;
  critMultiplier?: number;
  bonusDamageToBoss?: number;
  kind: ProjectileKind;
  slowFactor?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  knockbackCols?: number;
  stunDuration?: number;
  silenceDuration?: number;
  effectIds?: string[];
  sourceTowerType?: TowerType;
  sourceTowerId?: string;
  passThrough?: boolean;
  remainingPierce?: number;
  hitEnemyIds?: string[];
  hitObstacleIds?: string[];
  appliedTileMods?: string[];
  chainBounceCount?: number;
  chainBounceRangeCols?: number;
  chainDamageDecay?: number;
  impactParticleId?: string;
  trailParticleId?: string;
  trailTimer?: number;
}

export interface EnergyDrop {
  id: string;
  xCol: number;
  yRow: number;
  targetRow: number;
  amount: number;
  lifetime: number;
  maxLifetime: number;
  collecting: boolean;
  fromSky: boolean;
}

export interface VisualEffect {
  id: string;
  kind:
    | 'explosion'
    | 'muzzle'
    | 'text'
    | 'cryo_hit'
    | 'heal_ring'
    | 'revive_ring'
    | 'tesla_arc'
    | 'burn_hit'
    | 'stun_wave'
    | 'scream_wave_066'
    | 'pull_beam'
    | 'pocket_portal'
    | 'bounce_impact'
    | 'ring'
    | 'beam'
    | 'particle';
  row: number;
  col: number;
  targetRow?: number;
  targetCol?: number;
  vx?: number;
  vy?: number;
  sizePx?: number;
  lineWidth?: number;
  timer: number;
  duration: number;
  text?: string;
  color?: string;
  radiusPx?: number;
}

export interface EmergencyGate {
  row: number;
  available: boolean;
  firingTimer: number;
  sweepCol: number;
}
