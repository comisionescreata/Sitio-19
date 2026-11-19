export type GameState =
  | 'TITLE_MENU'
  | 'LOADOUT_PICK'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export type TowerCategory = 'personal' | 'estructura';

export type TowerType =
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

export type EnemyType =
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
  | 'on_kill'
  | 'on_death'
  | 'on_hp_below'
  | 'passive';

export type EffectTargetSide = 'towers' | 'enemies' | 'allies' | 'opponents' | 'self';

export type EffectAreaShape = 'single' | 'self' | 'square' | 'rect' | 'lane' | 'global';

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
  | 'collect';

export interface EffectModifiers {
  damageInstant?: number;
  damagePercentMaxHp?: number;
  dotDps?: number;
  healAmount?: number;
  healPercent?: number;
  hotHps?: number;
  energyGain?: number;
  speedMultiplier?: number;
  slowFactor?: number;
  fireRateMultiplier?: number;
  damageMultiplier?: number;
  disableTowerActions?: boolean;
  hypnotizeTower?: boolean;
  stunSec?: number;
  deafSec?: number;
  immuneToPsych?: boolean;
  cleanseNegative?: boolean;
  grantsImmunities?: EnemyImmunity[];
  knockbackCols?: number;
  teleportCells?: number;
  pullCells?: number;
  spawnType?: EnemyType | (string & {});
  spawnCount?: number;
  spawnOffsetCol?: number;
  convertVictimTo?: EnemyType | (string & {});
  extraLives?: number;
  reviveHpPercent?: number;
  instakill?: boolean;
  disappearOnHit?: boolean;
  respectImmunity?: EnemyImmunity | 'none';
}

export interface EffectVisualConfig {
  showZone?: boolean;
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
  floatingText?: string;
  floatingTextColor?: string;
  sound?: EffectSoundKey;
  targetTintColor?: string;
}

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

export type ProjectileKind =
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

export interface TowerDefinition {
  type: TowerType;
  name: string;
  category: TowerCategory;
  cost: number;
  cooldown: number;
  maxHp: number;
  unlockLevel: number;
  roleLabel: string;
  description: string;
  fireRate?: number;
  damage?: number;
  burstCount?: number;
  maxRangeCols?: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  energyAmount?: number;
  energyInterval?: number;
  healAmount?: number;
  healInterval?: number;
  armTime?: number;
  explosionDamage?: number;
  thornsDps?: number;
  floorTrapDps?: number;
  aoeTargets?: number;
  passThrough?: boolean;
  projectileKind?: ProjectileKind;
  projectileSpeed?: number;
  canBeHypnotized?: boolean;
  placementRule?: 'any' | 'frontHalf' | 'backHalf';
  maxPerBoard?: number;
  maxPerRow?: number;
  effects?: string[];
}

export interface EnemyBehaviorConfig {
  laneSpan?: number;
  defaultPackCount?: number;
  immunities?: EnemyImmunity[];
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
}

export interface LevelSkyEnergyConfig {
  disabled?: boolean;
  amount?: number;
  intervalMinSec?: number;
  intervalVarianceSec?: number;
  initialDelaySec?: number;
}

// Raw customizable level schema stored in levels.json
// `time` = relative delay in seconds since the previous wave!
// `row` / `rows` are optional (omitted = random row(s)); `[x1, x2]` spans 2 rows (e.g. SCP-682).
// `flagMarkers` is optional (auto-computed from `isFlagHorde` events).
export interface RawLevelEvent {
  time: number;
  type: EnemyType;
  row?: number | [number, number];
  rows?: Array<number | [number, number]>;
  count?: number;
  isFlagHorde?: boolean;
  hordeLabel?: string;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  announcement?: string;
}

export interface RawLevelConfig {
  level: number;
  title: string;
  description: string;
  startingEnergy: number;
  maxDeckSlots: number;
  rows?: number;
  cols?: number;
  grid?: { rows?: number; cols?: number };
  boardOverride?: Partial<BoardDesignConfig>;
  disableTeslaGates?: boolean;
  autoCollectEnergy?: boolean;
  skyEnergy?: LevelSkyEnergyConfig;
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
  type: EnemyType;
  targets: ResolvedSpawnTarget[];
  isFlagHorde?: boolean;
  hordeLabel?: string;
  hpMultiplier?: number;
  speedMultiplier?: number;
  dpsMultiplier?: number;
  extraEffects?: string[];
  announcement?: string;
}

export interface LevelConfig {
  level: number;
  title: string;
  description: string;
  startingEnergy: number;
  maxDeckSlots: number;
  gridRows: number;
  gridCols: number;
  boardOverride?: Partial<BoardDesignConfig>;
  disableTeslaGates?: boolean;
  autoCollectEnergy?: boolean;
  skyEnergy?: LevelSkyEnergyConfig;
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
export type ProjectileDesignShape = 'circle' | 'streak' | 'pellet_cluster';

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
  showHpBar?: boolean;
  barWidth: number;
  hpBarHeight?: number;
  hpBarOffsetY?: number;
  codeLabel: string;
  showCodeLabel?: boolean;
  labelColor?: string;
  labelOffsetY?: number;
}

export interface ProjectileDesignConfig {
  shape?: ProjectileDesignShape | (string & {});
  layers?: CustomShapeLayer[];
  sprite?: string;
  spriteWidth?: number;
  spriteHeight?: number;
  rotationDeg?: number;
  color: string;
  coreColor: string;
  glowColor?: string;
  glowBlur?: number;
  radius: number;
  length?: number;
  cornerRadius?: number;
  coreRatio?: number;
  pelletSpread?: number;
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
  arrowFill: string;
  arrowColumns?: number[];
  adaptArrowsToGrid?: boolean;
  laneStroke: string;
  laneStrokeWidth?: number;
  breachStripeDark: string;
  breachStripeAmber: string;
  breachStripeWidth?: number;
  breachStripeHeight?: number;
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

export interface UiDesignConfig {
  hpBarBg: string;
  hpBarHigh: string;
  hpBarMid: string;
  hpBarLow: string;
  labelText: string;
  energyDropBg: string;
  energyDropStroke: string;
  energyDropText: string;
  energyDropGlow: string;
  energyDropRadius?: number;
  energyDropHaloBase?: number;
  energyDropHaloAmp?: number;
  energyDropSprite?: string;
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
  effects: EffectsDesignConfig;
  fonts?: FontsDesignConfig;
  ui: UiDesignConfig;
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
    projectileSpeeds: Record<ProjectileKind, number>;
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
  slowFactor?: number;
  speedMultiplier?: number;
  fireRateMultiplier?: number;
  damageMultiplier?: number;
  disableTowerActions?: boolean;
  hypnotizeTower?: boolean;
  immuneToPsych?: boolean;
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
  baseSpeed: number;
  currentSpeed: number;
  dps: number;
  slowTimer: number;
  slowFactor: number;
  burnTimer: number;
  burnDps: number;
  stunTimer?: number;
  hitFlash: number;
  animPhase: number;
  blinkMoveTimer: number;
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
  activeEffects?: Record<string, ActiveEffectState>;
  effectTimers?: Record<string, number>;
  effectCooldowns?: Record<string, number>;
  effectTriggered?: Record<string, number>;
  customSpeedMult?: number;
  customDamageMult?: number;
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
  maxRangeCols?: number;
  splashRadius?: number;
  speed: number;
  damage: number;
  kind: ProjectileKind;
  slowFactor?: number;
  slowDuration?: number;
  burnDps?: number;
  burnDuration?: number;
  effectIds?: string[];
  sourceTowerType?: TowerType;
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
    | 'ring';
  row: number;
  col: number;
  targetRow?: number;
  targetCol?: number;
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
