import { Check, Code2, Copy, Plus, Sliders, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EFFECTS_CATALOG, ENEMY_CATALOG } from '../data/scpCatalog';
import {
  EffectAreaShape,
  EffectCategory,
  EffectDefinition,
  EffectSoundKey,
  EffectTargetPriority,
  EffectTargetSide,
  EffectTrigger,
  EnemyImmunity,
  TowerCategory,
} from '../types/game';

interface EditorDraft {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  color: string;
  badgeLabel: string;
  badgeTextColor: string;
  trigger: EffectTrigger;
  targetSide: EffectTargetSide;
  areaShape: EffectAreaShape;
  radiusCells: number;
  radiusRows: number;
  radiusCols: number;
  intervalSec: number;
  initialDelaySec: number;
  durationSec: number;
  cooldownSec: number;
  hpThresholdRatio: number;
  chance: number;
  maxTriggers: number;
  excludeSelf: boolean;
  priority: EffectTargetPriority;
  minHpRatio: number;
  maxHpRatio: number;
  onlyAttacking: boolean;
  onlyElite: boolean;
  targetCategories: TowerCategory[];
  targetTypesText: string;
  excludeTypesText: string;
  // Modifiers
  damageInstant: number;
  damagePercentMaxHp: number;
  dotDps: number;
  healAmount: number;
  healPercent: number;
  hotHps: number;
  shieldHp: number;
  shieldDecayPerSec: number;
  energyGain: number;
  energyPerSec: number;
  slowFactor: number;
  speedMultiplier: number;
  fireRateMultiplier: number;
  damageMultiplier: number;
  projectileSpeedMultiplier: number;
  maxHpMultiplier: number;
  damageReduction: number;
  vulnerableMultiplier: number;
  lifestealRatio: number;
  thornsDps: number;
  reflectDamagePercent: number;
  executeBelowHpRatio: number;
  chainBounceCount: number;
  chainBounceRangeCols: number;
  chainDamageDecay: number;
  stunSec: number;
  deafSec: number;
  silenceSec: number;
  knockbackCols: number;
  teleportCells: number;
  pullCells: number;
  laneShift: number;
  spawnType: string;
  spawnCount: number;
  splitOnDeathType: string;
  splitOnDeathCount: number;
  transformToType: string;
  convertVictimTo: string;
  extraLives: number;
  reviveHpPercent: number;
  disableTowerActions: boolean;
  hypnotizeTower: boolean;
  immuneToPsych: boolean;
  cleanseNegative: boolean;
  instakill: boolean;
  disappearOnHit: boolean;
  immunityList: EnemyImmunity[];
  respectImmunity: '' | EnemyImmunity | 'none';
  // Visual
  showZone: boolean;
  zoneShape: 'box' | 'circle' | 'cross';
  zoneRgb: string;
  zonePulseSpeed: number;
  warnBeforeSec: number;
  waveKind: string;
  waveColorRgb: string;
  waveRadiusPx: number;
  waveDurationSec: number;
  beamToTarget: boolean;
  screenFlashRgb: string;
  screenShake: number;
  floatingText: string;
  floatingTextColor: string;
  sound: '' | EffectSoundKey;
  targetTintColor: string;
}

function hexToRgbTuple(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '56, 189, 248';
}

function fromDefinition(fx: EffectDefinition): EditorDraft {
  const m = fx.modifiers ?? {};
  const v = fx.visual ?? {};
  return {
    id: fx.id,
    name: fx.name,
    description: fx.description,
    category: fx.category ?? 'aura',
    color: fx.color || '#38BDF8',
    badgeLabel: fx.badgeLabel ?? '',
    badgeTextColor: fx.badgeTextColor ?? '',
    trigger: fx.trigger ?? 'periodic',
    targetSide: fx.targetSide ?? 'opponents',
    areaShape: fx.areaShape ?? 'square',
    radiusCells: fx.radiusCells ?? 1,
    radiusRows: fx.radiusRows ?? 1,
    radiusCols: fx.radiusCols ?? 2,
    intervalSec: fx.intervalSec ?? fx.spawnIntervalSec ?? fx.screamIntervalSec ?? 4,
    initialDelaySec: fx.initialDelaySec ?? 2,
    durationSec: fx.durationSec ?? fx.deafDurationSec ?? fx.stunDurationSec ?? 3,
    cooldownSec: fx.cooldownSec ?? 0,
    hpThresholdRatio: fx.hpThresholdRatio ?? 0.5,
    chance: fx.chance ?? 1,
    maxTriggers: fx.maxTriggers ?? 0,
    excludeSelf: Boolean(fx.excludeSelf),
    priority: fx.priority ?? 'closest',
    minHpRatio: fx.minHpRatio ?? 0,
    maxHpRatio: fx.maxHpRatio ?? 1,
    onlyAttacking: Boolean(fx.onlyAttacking),
    onlyElite: Boolean(fx.onlyElite),
    targetCategories: fx.targetCategories ?? [],
    targetTypesText: (fx.targetTypes ?? []).join(', '),
    excludeTypesText: (fx.excludeTypes ?? []).join(', '),
    damageInstant: m.damageInstant ?? 0,
    damagePercentMaxHp: m.damagePercentMaxHp ?? 0,
    dotDps: m.dotDps ?? fx.burnDps ?? 0,
    healAmount: m.healAmount ?? fx.healAmount ?? 0,
    healPercent: m.healPercent ?? fx.healPercent ?? 0,
    hotHps: m.hotHps ?? 0,
    shieldHp: m.shieldHp ?? 0,
    shieldDecayPerSec: m.shieldDecayPerSec ?? 0,
    energyGain: m.energyGain ?? 0,
    energyPerSec: m.energyPerSec ?? 0,
    slowFactor: m.slowFactor ?? fx.slowFactor ?? 0,
    speedMultiplier: m.speedMultiplier ?? fx.speedMultiplier ?? 1,
    fireRateMultiplier: m.fireRateMultiplier ?? fx.fireRateBoost ?? 1,
    damageMultiplier: m.damageMultiplier ?? 1,
    projectileSpeedMultiplier: m.projectileSpeedMultiplier ?? 1,
    maxHpMultiplier: m.maxHpMultiplier ?? 1,
    damageReduction: m.damageReduction ?? 0,
    vulnerableMultiplier: m.vulnerableMultiplier ?? 1,
    lifestealRatio: m.lifestealRatio ?? 0,
    thornsDps: m.thornsDps ?? 0,
    reflectDamagePercent: m.reflectDamagePercent ?? 0,
    executeBelowHpRatio: m.executeBelowHpRatio ?? 0,
    chainBounceCount: m.chainBounceCount ?? 0,
    chainBounceRangeCols: m.chainBounceRangeCols ?? 2.5,
    chainDamageDecay: m.chainDamageDecay ?? 0.75,
    stunSec: m.stunSec ?? fx.stunDurationSec ?? 0,
    deafSec: m.deafSec ?? fx.deafDurationSec ?? 0,
    silenceSec: m.silenceSec ?? 0,
    knockbackCols: m.knockbackCols ?? 0,
    teleportCells: m.teleportCells ?? 0,
    pullCells: m.pullCells ?? 0,
    laneShift: m.laneShift ?? 0,
    spawnType: m.spawnType ?? '',
    spawnCount: m.spawnCount ?? 1,
    splitOnDeathType: m.splitOnDeathType ?? '',
    splitOnDeathCount: m.splitOnDeathCount ?? 2,
    transformToType: m.transformToType ?? '',
    convertVictimTo: m.convertVictimTo ?? '',
    extraLives: m.extraLives ?? fx.extraLives ?? 0,
    reviveHpPercent: m.reviveHpPercent ?? fx.reviveHpPercent ?? 0.2,
    disableTowerActions: Boolean(m.disableTowerActions),
    hypnotizeTower: Boolean(m.hypnotizeTower),
    immuneToPsych: Boolean(m.immuneToPsych),
    cleanseNegative: Boolean(m.cleanseNegative),
    instakill: Boolean(m.instakill),
    disappearOnHit: Boolean(m.disappearOnHit),
    immunityList: m.grantsImmunities ?? [],
    respectImmunity: m.respectImmunity ?? '',
    showZone: Boolean(v.showZone),
    zoneShape: v.zoneShape ?? 'box',
    zoneRgb: v.zoneRgb ?? hexToRgbTuple(fx.color || '#38BDF8'),
    zonePulseSpeed: v.zonePulseSpeed ?? 4.5,
    warnBeforeSec: v.warnBeforeSec ?? 0,
    waveKind: v.waveKind ?? '',
    waveColorRgb: v.waveColorRgb ?? hexToRgbTuple(fx.color || '#38BDF8'),
    waveRadiusPx: v.waveRadiusPx ?? 80,
    waveDurationSec: v.waveDurationSec ?? 0.5,
    beamToTarget: Boolean(v.beamToTarget),
    screenFlashRgb: v.screenFlashRgb ?? '',
    screenShake: v.screenShake ?? 0,
    floatingText: v.floatingText ?? '',
    floatingTextColor: v.floatingTextColor ?? '',
    sound: v.sound ?? '',
    targetTintColor: v.targetTintColor ?? '',
  };
}

function createBlankDraft(): EditorDraft {
  return {
    id: 'efecto_creativo_personalizado',
    name: 'Efecto Creativo Avanzado',
    description: 'Efecto completamente personalizado creado en el editor.',
    category: 'combat',
    color: '#F59E0B',
    badgeLabel: 'ULTRA',
    badgeTextColor: '#FEF3C7',
    trigger: 'periodic',
    targetSide: 'opponents',
    areaShape: 'square',
    radiusCells: 1,
    radiusRows: 1,
    radiusCols: 2,
    intervalSec: 4.0,
    initialDelaySec: 1.0,
    durationSec: 3.0,
    cooldownSec: 0,
    hpThresholdRatio: 0.5,
    chance: 1,
    maxTriggers: 0,
    excludeSelf: false,
    priority: 'closest',
    minHpRatio: 0,
    maxHpRatio: 1,
    onlyAttacking: false,
    onlyElite: false,
    targetCategories: [],
    targetTypesText: '',
    excludeTypesText: '',
    damageInstant: 50,
    damagePercentMaxHp: 0,
    dotDps: 15,
    healAmount: 0,
    healPercent: 0,
    hotHps: 0,
    shieldHp: 0,
    shieldDecayPerSec: 0,
    energyGain: 0,
    energyPerSec: 0,
    slowFactor: 0.35,
    speedMultiplier: 1,
    fireRateMultiplier: 1,
    damageMultiplier: 1,
    projectileSpeedMultiplier: 1,
    maxHpMultiplier: 1,
    damageReduction: 0,
    vulnerableMultiplier: 1,
    lifestealRatio: 0,
    thornsDps: 0,
    reflectDamagePercent: 0,
    executeBelowHpRatio: 0,
    chainBounceCount: 0,
    chainBounceRangeCols: 2.5,
    chainDamageDecay: 0.75,
    stunSec: 1.5,
    deafSec: 0,
    silenceSec: 0,
    knockbackCols: 0.5,
    teleportCells: 0,
    pullCells: 0,
    laneShift: 0,
    spawnType: '',
    spawnCount: 1,
    splitOnDeathType: '',
    splitOnDeathCount: 2,
    transformToType: '',
    convertVictimTo: '',
    extraLives: 0,
    reviveHpPercent: 0.2,
    disableTowerActions: false,
    hypnotizeTower: false,
    immuneToPsych: false,
    cleanseNegative: false,
    instakill: false,
    disappearOnHit: false,
    immunityList: [],
    respectImmunity: 'none',
    showZone: true,
    zoneShape: 'box',
    zoneRgb: '245, 158, 11',
    zonePulseSpeed: 5,
    warnBeforeSec: 1.0,
    waveKind: 'stun_wave',
    waveColorRgb: '245, 158, 11',
    waveRadiusPx: 90,
    waveDurationSec: 0.5,
    beamToTarget: false,
    screenFlashRgb: '',
    screenShake: 0,
    floatingText: '¡ULTRA!',
    floatingTextColor: '#FCD34D',
    sound: 'tesla',
    targetTintColor: 'rgba(245, 158, 11, 0.85)',
  };
}

export function EffectJsonEditor() {
  const allEffects = useMemo(() => Object.values(EFFECTS_CATALOG), []);
  const [draft, setDraft] = useState<EditorDraft>(() => createBlankDraft());
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'visual' | 'rawjson'>('visual');
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const generatedObject = useMemo(() => {
    const cleanId = draft.id.trim().replace(/\s+/g, '_') || 'nuevo_efecto';
    const modifiers: Record<string, unknown> = {};
    if (draft.damageInstant > 0) modifiers.damageInstant = draft.damageInstant;
    if (draft.damagePercentMaxHp > 0) modifiers.damagePercentMaxHp = draft.damagePercentMaxHp;
    if (draft.dotDps > 0) modifiers.dotDps = draft.dotDps;
    if (draft.healAmount > 0) modifiers.healAmount = draft.healAmount;
    if (draft.healPercent > 0) modifiers.healPercent = draft.healPercent;
    if (draft.hotHps > 0) modifiers.hotHps = draft.hotHps;
    if (draft.shieldHp > 0) modifiers.shieldHp = draft.shieldHp;
    if (draft.shieldDecayPerSec > 0) modifiers.shieldDecayPerSec = draft.shieldDecayPerSec;
    if (draft.energyGain > 0) modifiers.energyGain = draft.energyGain;
    if (draft.energyPerSec > 0) modifiers.energyPerSec = draft.energyPerSec;
    if (draft.slowFactor > 0) modifiers.slowFactor = draft.slowFactor;
    if (draft.speedMultiplier !== 1) modifiers.speedMultiplier = draft.speedMultiplier;
    if (draft.fireRateMultiplier !== 1) modifiers.fireRateMultiplier = draft.fireRateMultiplier;
    if (draft.damageMultiplier !== 1) modifiers.damageMultiplier = draft.damageMultiplier;
    if (draft.projectileSpeedMultiplier !== 1)
      modifiers.projectileSpeedMultiplier = draft.projectileSpeedMultiplier;
    if (draft.maxHpMultiplier !== 1) modifiers.maxHpMultiplier = draft.maxHpMultiplier;
    if (draft.damageReduction > 0) modifiers.damageReduction = draft.damageReduction;
    if (draft.vulnerableMultiplier !== 1)
      modifiers.vulnerableMultiplier = draft.vulnerableMultiplier;
    if (draft.lifestealRatio > 0) modifiers.lifestealRatio = draft.lifestealRatio;
    if (draft.thornsDps > 0) modifiers.thornsDps = draft.thornsDps;
    if (draft.reflectDamagePercent > 0) modifiers.reflectDamagePercent = draft.reflectDamagePercent;
    if (draft.executeBelowHpRatio > 0) modifiers.executeBelowHpRatio = draft.executeBelowHpRatio;
    if (draft.chainBounceCount > 0) {
      modifiers.chainBounceCount = draft.chainBounceCount;
      modifiers.chainBounceRangeCols = draft.chainBounceRangeCols;
      modifiers.chainDamageDecay = draft.chainDamageDecay;
    }
    if (draft.stunSec > 0) modifiers.stunSec = draft.stunSec;
    if (draft.deafSec > 0) modifiers.deafSec = draft.deafSec;
    if (draft.silenceSec > 0) modifiers.silenceSec = draft.silenceSec;
    if (draft.knockbackCols !== 0) modifiers.knockbackCols = draft.knockbackCols;
    if (draft.teleportCells !== 0) modifiers.teleportCells = draft.teleportCells;
    if (draft.pullCells !== 0) modifiers.pullCells = draft.pullCells;
    if (draft.laneShift !== 0) modifiers.laneShift = draft.laneShift;
    if (draft.spawnType) {
      modifiers.spawnType = draft.spawnType;
      modifiers.spawnCount = Math.max(1, draft.spawnCount);
    }
    if (draft.splitOnDeathType) {
      modifiers.splitOnDeathType = draft.splitOnDeathType;
      modifiers.splitOnDeathCount = Math.max(1, draft.splitOnDeathCount);
    }
    if (draft.transformToType) modifiers.transformToType = draft.transformToType;
    if (draft.convertVictimTo) modifiers.convertVictimTo = draft.convertVictimTo;
    if (draft.extraLives > 0) {
      modifiers.extraLives = draft.extraLives;
      if (draft.reviveHpPercent > 0) modifiers.reviveHpPercent = draft.reviveHpPercent;
    }
    if (draft.disableTowerActions) modifiers.disableTowerActions = true;
    if (draft.hypnotizeTower) modifiers.hypnotizeTower = true;
    if (draft.immuneToPsych) modifiers.immuneToPsych = true;
    if (draft.cleanseNegative) modifiers.cleanseNegative = true;
    if (draft.instakill) modifiers.instakill = true;
    if (draft.disappearOnHit) modifiers.disappearOnHit = true;
    if (draft.immunityList.length > 0) modifiers.grantsImmunities = draft.immunityList;
    if (draft.respectImmunity) modifiers.respectImmunity = draft.respectImmunity;

    const visual: Record<string, unknown> = {};
    if (draft.showZone) {
      visual.showZone = true;
      if (draft.zoneShape !== 'box') visual.zoneShape = draft.zoneShape;
      visual.zoneRgb = draft.zoneRgb || hexToRgbTuple(draft.color);
      visual.zoneStroke = `rgba(${visual.zoneRgb}, 0.72)`;
      if (draft.zonePulseSpeed !== 4.5) visual.zonePulseSpeed = draft.zonePulseSpeed;
      if (draft.warnBeforeSec > 0) visual.warnBeforeSec = draft.warnBeforeSec;
    }
    if (draft.waveKind) {
      visual.waveKind = draft.waveKind;
      visual.waveColorRgb = draft.waveColorRgb || hexToRgbTuple(draft.color);
      visual.waveRadiusPx = draft.waveRadiusPx;
      visual.waveDurationSec = draft.waveDurationSec;
    }
    if (draft.beamToTarget) {
      visual.beamToTarget = true;
      visual.beamColorRgb = draft.waveColorRgb || hexToRgbTuple(draft.color);
    }
    if (draft.screenFlashRgb.trim()) {
      visual.screenFlashRgb = draft.screenFlashRgb.trim();
      visual.screenFlashAlpha = 0.25;
    }
    if (draft.screenShake > 0) {
      visual.screenShake = draft.screenShake;
    }
    if (draft.floatingText.trim()) {
      visual.floatingText = draft.floatingText.trim();
      visual.floatingTextColor = draft.floatingTextColor || draft.color;
    }
    if (draft.sound) visual.sound = draft.sound;
    if (draft.targetTintColor.trim()) visual.targetTintColor = draft.targetTintColor.trim();

    const tTypes = draft.targetTypesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const eTypes = draft.excludeTypesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      id: cleanId,
      engineMode: 'declarative',
      category: draft.category,
      name: draft.name,
      description: draft.description,
      trigger: draft.trigger,
      targetSide: draft.targetSide,
      areaShape: draft.areaShape,
      ...(draft.areaShape === 'square' || draft.areaShape === 'rect'
        ? { radiusCells: draft.radiusCells }
        : {}),
      ...(draft.areaShape === 'rect'
        ? { radiusRows: draft.radiusRows, radiusCols: draft.radiusCols }
        : {}),
      ...(draft.excludeSelf ? { excludeSelf: true } : {}),
      ...(draft.priority !== 'closest' ? { priority: draft.priority } : {}),
      ...(draft.minHpRatio > 0 ? { minHpRatio: draft.minHpRatio } : {}),
      ...(draft.maxHpRatio < 1 ? { maxHpRatio: draft.maxHpRatio } : {}),
      ...(draft.onlyAttacking ? { onlyAttacking: true } : {}),
      ...(draft.onlyElite ? { onlyElite: true } : {}),
      ...(draft.targetCategories.length > 0 ? { targetCategories: draft.targetCategories } : {}),
      ...(tTypes.length > 0 ? { targetTypes: tTypes } : {}),
      ...(eTypes.length > 0 ? { excludeTypes: eTypes } : {}),
      ...(draft.trigger === 'periodic'
        ? { initialDelaySec: draft.initialDelaySec, intervalSec: draft.intervalSec }
        : {}),
      ...(draft.trigger === 'on_hp_below'
        ? { hpThresholdRatio: draft.hpThresholdRatio, maxTriggers: draft.maxTriggers || 1 }
        : {}),
      ...(draft.durationSec > 0 && draft.trigger !== 'passive' && draft.trigger !== 'continuous_aura'
        ? { durationSec: draft.durationSec }
        : {}),
      ...(draft.cooldownSec > 0 ? { cooldownSec: draft.cooldownSec } : {}),
      ...(draft.chance < 1 ? { chance: draft.chance } : {}),
      color: draft.color,
      ...(draft.badgeLabel.trim() ? { badgeLabel: draft.badgeLabel.trim() } : {}),
      ...(draft.badgeTextColor.trim() ? { badgeTextColor: draft.badgeTextColor.trim() } : {}),
      ...(Object.keys(modifiers).length > 0 ? { modifiers } : {}),
      ...(Object.keys(visual).length > 0 ? { visual } : {}),
    };

    const formatted = `"${cleanId}": ${JSON.stringify(payload, null, 2)}`;
    return { cleanId, jsonText: formatted, rawPayload: payload };
  }, [draft]);

  const handleCopy = () => {
    const textToCopy = mode === 'rawjson' ? rawJsonText : generatedObject.jsonText;
    navigator.clipboard?.writeText(textToCopy).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleImmunity = (imm: EnemyImmunity) => {
    setDraft((prev) => ({
      ...prev,
      immunityList: prev.immunityList.includes(imm)
        ? prev.immunityList.filter((i) => i !== imm)
        : [...prev.immunityList, imm],
    }));
  };

  const toggleCategory = (cat: TowerCategory) => {
    setDraft((prev) => ({
      ...prev,
      targetCategories: prev.targetCategories.includes(cat)
        ? prev.targetCategories.filter((c) => c !== cat)
        : [...prev.targetCategories, cat],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Top Bar / Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#1A212B] p-3.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-2.5">
          <Wand2 className="h-5 w-5 text-amber-400" />
          <span className="text-xs font-bold tracking-wide text-white uppercase">
            Creador y Editor Master de Efectos SCP
          </span>
          <div className="ml-2 flex rounded-lg bg-[#0E1217] p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setMode('visual')}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                mode === 'visual'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="inline h-3.5 w-3.5 mr-1" />
              Editor Visual Avanzado
            </button>
            <button
              type="button"
              onClick={() => {
                setRawJsonText(JSON.stringify(generatedObject.rawPayload, null, 2));
                setMode('rawjson');
              }}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                mode === 'rawjson'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="inline h-3.5 w-3.5 mr-1" />
              Editor JSON Libre
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value=""
            onChange={(e) => {
              const found = EFFECTS_CATALOG[e.target.value];
              if (found) {
                const next = fromDefinition(found);
                next.id = `${found.id}_master`;
                setDraft(next);
                if (mode === 'rawjson') {
                  setRawJsonText(JSON.stringify(generatedObject.rawPayload, null, 2));
                }
              }
            }}
            className="rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-amber-400 focus:outline-none"
          >
            <option value="" disabled>
              Cargar preset existente...
            </option>
            {allEffects.map((fx) => (
              <option key={fx.id} value={fx.id}>
                {fx.id} — {fx.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setDraft(createBlankDraft());
              setMode('visual');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left Form Column */}
          <div className="space-y-3.5">
            {/* 1. Identity */}
            <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4 shadow">
              <h4 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                1. Identidad y Clasificación
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-[11px] text-slate-400">
                  ID Único (Clave JSON)
                  <input
                    type="text"
                    value={draft.id}
                    onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Categoría
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value as EffectCategory })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="aura">aura (Aura continua/periódica)</option>
                    <option value="status">status (Estado alterado)</option>
                    <option value="trigger">trigger (Disparador de evento)</option>
                    <option value="combat">combat (Daño / Explosión / Empuje)</option>
                    <option value="summon">summon (Invocación / Reanimación)</option>
                    <option value="utility">utility (Puertas / Utilidad)</option>
                    <option value="immunity">immunity (Inmunidades / Colosos)</option>
                  </select>
                </label>
                <label className="col-span-2 text-[11px] text-slate-400">
                  Nombre visible
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <label className="col-span-2 text-[11px] text-slate-400">
                  Descripción táctica
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Etiqueta pequeña (Badge)
                  <input
                    type="text"
                    value={draft.badgeLabel}
                    onChange={(e) => setDraft({ ...draft, badgeLabel: e.target.value })}
                    placeholder="Ej. TÓXICO"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Color principal
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={draft.color}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          color: e.target.value,
                          zoneRgb: hexToRgbTuple(e.target.value),
                          waveColorRgb: hexToRgbTuple(e.target.value),
                        })
                      }
                      className="h-8 w-10 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
                    />
                    <input
                      type="text"
                      value={draft.color}
                      onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                      className="font-mono-num w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* 2. Trigger, Target & Area */}
            <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4 shadow">
              <h4 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                2. Disparador, Objetivo y Geometría
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="text-[11px] text-slate-400">
                  Disparador (trigger)
                  <select
                    value={draft.trigger}
                    onChange={(e) =>
                      setDraft({ ...draft, trigger: e.target.value as EffectTrigger })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-2 text-xs text-white"
                  >
                    <option value="continuous_aura">continuous_aura (Aura permanente)</option>
                    <option value="periodic">periodic (Cada X segundos)</option>
                    <option value="on_hit">on_hit (Al golpear/ser golpeado)</option>
                    <option value="on_damaged">on_damaged (Al recibir daño)</option>
                    <option value="on_enemy_enter">on_enemy_enter (Al pisar zona/casilla)</option>
                    <option value="on_attack">on_attack (Al atacar)</option>
                    <option value="on_spawn">on_spawn (Al aparecer)</option>
                    <option value="on_hp_below">on_hp_below (Bajo % de HP)</option>
                    <option value="on_kill">on_kill (Al matar)</option>
                    <option value="on_death">on_death (Al morir)</option>
                    <option value="passive">passive (Pasiva / Inmunidad)</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Objetivo (targetSide)
                  <select
                    value={draft.targetSide}
                    onChange={(e) =>
                      setDraft({ ...draft, targetSide: e.target.value as EffectTargetSide })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-2 text-xs text-white"
                  >
                    <option value="opponents">opponents (Rival)</option>
                    <option value="allies">allies (Aliados)</option>
                    <option value="self">self (Sí mismo)</option>
                    <option value="towers">towers (Torres)</option>
                    <option value="enemies">enemies (Enemigos)</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Forma de Área (areaShape)
                  <select
                    value={draft.areaShape}
                    onChange={(e) =>
                      setDraft({ ...draft, areaShape: e.target.value as EffectAreaShape })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-2 text-xs text-white"
                  >
                    <option value="square">square (Cuadrada NxN)</option>
                    <option value="rect">rect (Rectangular)</option>
                    <option value="cross">cross (En cruz)</option>
                    <option value="cone_front">cone_front (Cono frontal)</option>
                    <option value="lane_behind">lane_behind (Detrás en fila)</option>
                    <option value="lane">lane (Fila completa)</option>
                    <option value="random">random (Objetivos aleatorios)</option>
                    <option value="global">global (Todo el mapa)</option>
                    <option value="single">single (Objetivo único)</option>
                    <option value="self">self (Solo emisor)</option>
                  </select>
                </label>

                {(draft.areaShape === 'square' ||
                  draft.areaShape === 'rect' ||
                  draft.areaShape === 'cross' ||
                  draft.areaShape === 'cone_front' ||
                  draft.areaShape === 'lane_behind') && (
                  <label className="text-[11px] text-slate-400">
                    Radio en Casillas (1 = 3x3)
                    <input
                      type="number"
                      min={0}
                      max={9}
                      value={draft.radiusCells}
                      onChange={(e) =>
                        setDraft({ ...draft, radiusCells: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                    />
                  </label>
                )}

                {draft.trigger === 'periodic' && (
                  <>
                    <label className="text-[11px] text-slate-400">
                      Intervalo (s)
                      <input
                        type="number"
                        step={0.5}
                        min={0.2}
                        value={draft.intervalSec}
                        onChange={(e) =>
                          setDraft({ ...draft, intervalSec: Math.max(0.2, Number(e.target.value) || 1) })
                        }
                        className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                      />
                    </label>
                    <label className="text-[11px] text-slate-400">
                      Retraso Inicial (s)
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        value={draft.initialDelaySec}
                        onChange={(e) =>
                          setDraft({ ...draft, initialDelaySec: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                      />
                    </label>
                  </>
                )}

                {draft.trigger === 'on_hp_below' && (
                  <>
                    <label className="text-[11px] text-slate-400">
                      Umbral HP (ej. 0.5 = 50%)
                      <input
                        type="number"
                        step={0.05}
                        min={0.05}
                        max={0.95}
                        value={draft.hpThresholdRatio}
                        onChange={(e) =>
                          setDraft({ ...draft, hpThresholdRatio: Number(e.target.value) || 0.5 })
                        }
                        className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                      />
                    </label>
                    <label className="text-[11px] text-slate-400">
                      Máx. Activaciones (0 = ilimitado)
                      <input
                        type="number"
                        min={0}
                        value={draft.maxTriggers}
                        onChange={(e) =>
                          setDraft({ ...draft, maxTriggers: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                      />
                    </label>
                  </>
                )}

                <label className="text-[11px] text-slate-400">
                  Duración del Estado (s)
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    value={draft.durationSec}
                    onChange={(e) =>
                      setDraft({ ...draft, durationSec: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Probabilidad (0.05 – 1.0)
                  <input
                    type="number"
                    step={0.05}
                    min={0.05}
                    max={1}
                    value={draft.chance}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        chance: Math.max(0.05, Math.min(1, Number(e.target.value) || 1)),
                      })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
              </div>

              {/* Advanced Filtering */}
              <div className="mt-3.5 border-t border-slate-800 pt-3">
                <p className="text-[11px] font-bold text-slate-300">Filtros Opcionales de Objetivo</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="text-slate-400 self-center">Categorías de torre:</span>
                  {(['personal', 'estructura'] as TowerCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        draft.targetCategories.includes(cat)
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-slate-700 bg-[#0E1217] text-slate-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <label className="text-[11px] text-slate-400">
                    Incluir Tipos Específicos (coma separada)
                    <input
                      type="text"
                      value={draft.targetTypesText}
                      onChange={(e) => setDraft({ ...draft, targetTypesText: e.target.value })}
                      placeholder="Ej. scp_008, scp_049"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-1.5 text-xs text-white"
                    />
                  </label>
                  <label className="text-[11px] text-slate-400">
                    Excluir Tipos Específicos
                    <input
                      type="text"
                      value={draft.excludeTypesText}
                      onChange={(e) => setDraft({ ...draft, excludeTypesText: e.target.value })}
                      placeholder="Ej. scp_682"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-1.5 text-xs text-white"
                    />
                  </label>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <label className="text-[11px] text-slate-400">
                    Prioridad (priority)
                    <select
                      value={draft.priority}
                      onChange={(e) =>
                        setDraft({ ...draft, priority: e.target.value as EffectTargetPriority })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="closest">closest (Más cercano)</option>
                      <option value="furthest">furthest (Más lejano)</option>
                      <option value="lowest_hp">lowest_hp (Menor HP)</option>
                      <option value="highest_hp">highest_hp (Mayor HP)</option>
                      <option value="random">random (Aleatorio)</option>
                    </select>
                  </label>
                  <label className="text-[11px] text-slate-400">
                    Mín. HP (0 – 1)
                    <input
                      type="number"
                      step={0.05}
                      min={0}
                      max={1}
                      value={draft.minHpRatio}
                      onChange={(e) => setDraft({ ...draft, minHpRatio: Number(e.target.value) || 0 })}
                      className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-1.5 text-xs text-white"
                    />
                  </label>
                  <label className="text-[11px] text-slate-400">
                    Máx. HP (0 – 1)
                    <input
                      type="number"
                      step={0.05}
                      min={0.05}
                      max={1}
                      value={draft.maxHpRatio}
                      onChange={(e) =>
                        setDraft({ ...draft, maxHpRatio: Number(e.target.value) || 1 })
                      }
                      className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-1.5 text-xs text-white"
                    />
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={draft.excludeSelf}
                      onChange={(e) => setDraft({ ...draft, excludeSelf: e.target.checked })}
                    />
                    Excluir al propio emisor (excludeSelf)
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={draft.onlyAttacking}
                      onChange={(e) => setDraft({ ...draft, onlyAttacking: e.target.checked })}
                    />
                    Solo atacando (onlyAttacking)
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={draft.onlyElite}
                      onChange={(e) => setDraft({ ...draft, onlyElite: e.target.checked })}
                    />
                    Solo élites (onlyElite)
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Modifiers */}
            <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4 shadow">
              <h4 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                3. Modificadores (Efectos sobre Objetivos)
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="text-[11px] text-slate-400">
                  Daño Instantáneo
                  <input
                    type="number"
                    min={0}
                    value={draft.damageInstant}
                    onChange={(e) => setDraft({ ...draft, damageInstant: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Daño Continuo (DOT /s)
                  <input
                    type="number"
                    min={0}
                    value={draft.dotDps}
                    onChange={(e) => setDraft({ ...draft, dotDps: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Cura (HP plano)
                  <input
                    type="number"
                    min={0}
                    value={draft.healAmount}
                    onChange={(e) => setDraft({ ...draft, healAmount: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Ralentización (0 – 0.9)
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={0.9}
                    value={draft.slowFactor}
                    onChange={(e) => setDraft({ ...draft, slowFactor: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Mult. Velocidad SCP
                  <input
                    type="number"
                    step={0.05}
                    min={0.1}
                    value={draft.speedMultiplier}
                    onChange={(e) =>
                      setDraft({ ...draft, speedMultiplier: Number(e.target.value) || 1 })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Mult. Cadencia Torre
                  <input
                    type="number"
                    step={0.05}
                    min={0.1}
                    value={draft.fireRateMultiplier}
                    onChange={(e) =>
                      setDraft({ ...draft, fireRateMultiplier: Number(e.target.value) || 1 })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Aturdimiento (s)
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    value={draft.stunSec}
                    onChange={(e) => setDraft({ ...draft, stunSec: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Retroceso (Casillas)
                  <input
                    type="number"
                    step={0.2}
                    value={draft.knockbackCols}
                    onChange={(e) => setDraft({ ...draft, knockbackCols: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Atracción / Teleport
                  <div className="mt-1 flex gap-1">
                    <input
                      type="number"
                      step={0.5}
                      value={draft.pullCells}
                      title="Atracción de celdas"
                      onChange={(e) => setDraft({ ...draft, pullCells: Number(e.target.value) || 0 })}
                      className="font-mono-num w-1/2 rounded-lg border border-slate-700 bg-[#0E1217] px-2 py-1.5 text-xs text-white"
                    />
                    <input
                      type="number"
                      step={1}
                      value={draft.teleportCells}
                      title="Teletransporte de celdas"
                      onChange={(e) => setDraft({ ...draft, teleportCells: Number(e.target.value) || 0 })}
                      className="font-mono-num w-1/2 rounded-lg border border-slate-700 bg-[#0E1217] px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </label>
                <label className="col-span-2 text-[11px] text-slate-400">
                  Invocar Tipo de SCP (spawnType)
                  <select
                    value={draft.spawnType}
                    onChange={(e) => setDraft({ ...draft, spawnType: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  >
                    <option value="">Ninguno</option>
                    {ENEMY_CATALOG.map((scp) => (
                      <option key={scp.type} value={scp.type}>
                        {scp.type} ({scp.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Cantidad Invocada
                  <input
                    type="number"
                    min={1}
                    value={draft.spawnCount}
                    onChange={(e) => setDraft({ ...draft, spawnCount: Math.max(1, Number(e.target.value) || 1) })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Escudo (shieldHp)
                  <input
                    type="number"
                    min={0}
                    value={draft.shieldHp}
                    onChange={(e) => setDraft({ ...draft, shieldHp: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Reducción Daño (0–0.9)
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={0.9}
                    value={draft.damageReduction}
                    onChange={(e) => setDraft({ ...draft, damageReduction: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Vulnerabilidad (Mult.)
                  <input
                    type="number"
                    step={0.1}
                    min={0.5}
                    value={draft.vulnerableMultiplier}
                    onChange={(e) =>
                      setDraft({ ...draft, vulnerableMultiplier: Number(e.target.value) || 1 })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Silencio SCP (s)
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    value={draft.silenceSec}
                    onChange={(e) => setDraft({ ...draft, silenceSec: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Robo de Vida (0–1)
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={1}
                    value={draft.lifestealRatio}
                    onChange={(e) => setDraft({ ...draft, lifestealRatio: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Espinas (thornsDps)
                  <input
                    type="number"
                    min={0}
                    value={draft.thornsDps}
                    onChange={(e) => setDraft({ ...draft, thornsDps: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Energía /s (energyPerSec)
                  <input
                    type="number"
                    min={0}
                    value={draft.energyPerSec}
                    onChange={(e) => setDraft({ ...draft, energyPerSec: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Cambio de Carril (laneShift)
                  <input
                    type="number"
                    step={1}
                    value={draft.laneShift}
                    onChange={(e) => setDraft({ ...draft, laneShift: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Vidas Extra (Reanimación)
                  <input
                    type="number"
                    min={0}
                    value={draft.extraLives}
                    onChange={(e) => setDraft({ ...draft, extraLives: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Ejecución bajo % HP (0–0.9)
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={0.95}
                    value={draft.executeBelowHpRatio}
                    onChange={(e) =>
                      setDraft({ ...draft, executeBelowHpRatio: Number(e.target.value) || 0 })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Reflejo de Daño (0–2)
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    value={draft.reflectDamagePercent}
                    onChange={(e) =>
                      setDraft({ ...draft, reflectDamagePercent: Number(e.target.value) || 0 })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Rebotes en Cadena (chainBounceCount)
                  <input
                    type="number"
                    min={0}
                    value={draft.chainBounceCount}
                    onChange={(e) =>
                      setDraft({ ...draft, chainBounceCount: Number(e.target.value) || 0 })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Transformar SCP en (transformToType)
                  <select
                    value={draft.transformToType}
                    onChange={(e) => setDraft({ ...draft, transformToType: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  >
                    <option value="">Ninguno</option>
                    {ENEMY_CATALOG.map((scp) => (
                      <option key={scp.type} value={scp.type}>
                        {scp.type} ({scp.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Dividir al Morir (splitOnDeathType)
                  <select
                    value={draft.splitOnDeathType}
                    onChange={(e) => setDraft({ ...draft, splitOnDeathType: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  >
                    <option value="">Ninguno</option>
                    {ENEMY_CATALOG.map((scp) => (
                      <option key={scp.type} value={scp.type}>
                        {scp.type} ({scp.code})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Desgaste Escudo /s
                  <input
                    type="number"
                    min={0}
                    value={draft.shieldDecayPerSec}
                    onChange={(e) =>
                      setDraft({ ...draft, shieldDecayPerSec: Number(e.target.value) || 0 })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
              </div>

              {/* Checkboxes & Immunities */}
              <div className="mt-3.5 flex flex-wrap gap-3.5 text-[11px] text-slate-300 border-t border-slate-800 pt-3">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={draft.disableTowerActions}
                    onChange={(e) => setDraft({ ...draft, disableTowerActions: e.target.checked })}
                  />
                  Inhabilitar torres (Supresión)
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={draft.hypnotizeTower}
                    onChange={(e) => setDraft({ ...draft, hypnotizeTower: e.target.checked })}
                  />
                  Hipnotizar torres (SCP-035)
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={draft.immuneToPsych}
                    onChange={(e) => setDraft({ ...draft, immuneToPsych: e.target.checked })}
                  />
                  Inmunidad psicológica
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={draft.instakill}
                    onChange={(e) => setDraft({ ...draft, instakill: e.target.checked })}
                  />
                  Eliminación instantánea (Instakill)
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={draft.disappearOnHit}
                    onChange={(e) => setDraft({ ...draft, disappearOnHit: e.target.checked })}
                  />
                  Desaparecer al impactar
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span>Otorgar Inmunidades a Objetivos:</span>
                {(['slow', 'burn', 'explosion', 'stun', 'all_effects'] as EnemyImmunity[]).map((imm) => (
                  <button
                    key={imm}
                    type="button"
                    onClick={() => toggleImmunity(imm)}
                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${
                      draft.immunityList.includes(imm)
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-700 bg-[#0E1217] text-slate-400'
                    }`}
                  >
                    {imm}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Visuals & Audio */}
            <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4 shadow">
              <h4 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                4. Efectos Visuales y Audio
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="text-[11px] text-slate-400">
                  Mostrar Zona en Tablero
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.showZone}
                      onChange={(e) => setDraft({ ...draft, showZone: e.target.checked })}
                    />
                    <span className="text-xs text-slate-200">Activo</span>
                  </div>
                </label>
                <label className="text-[11px] text-slate-400">
                  Onda Visual (waveKind)
                  <select
                    value={draft.waveKind}
                    onChange={(e) => setDraft({ ...draft, waveKind: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-2 text-xs text-white"
                  >
                    <option value="">Ninguna</option>
                    <option value="ring">ring (Onda expansiva)</option>
                    <option value="explosion">explosion</option>
                    <option value="stun_wave">stun_wave</option>
                    <option value="scream_wave_066">scream_wave_066</option>
                    <option value="heal_ring">heal_ring</option>
                    <option value="revive_ring">revive_ring</option>
                    <option value="cryo_hit">cryo_hit</option>
                    <option value="burn_hit">burn_hit</option>
                    <option value="pocket_portal">pocket_portal</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Sonido (effectSound)
                  <select
                    value={draft.sound}
                    onChange={(e) => setDraft({ ...draft, sound: e.target.value as '' | EffectSoundKey })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-2 text-xs text-white"
                  >
                    <option value="">Silencioso</option>
                    <option value="explosion">explosion</option>
                    <option value="heal">heal</option>
                    <option value="revive">revive</option>
                    <option value="stun">stun</option>
                    <option value="scream066">scream066</option>
                    <option value="pull">pull</option>
                    <option value="portal">portal</option>
                    <option value="tesla">tesla</option>
                    <option value="blink">blink</option>
                    <option value="place">place</option>
                    <option value="collect">collect</option>
                    <option value="door">door</option>
                    <option value="horde">horde</option>
                    <option value="alert">alert</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Forma Zona (zoneShape)
                  <select
                    value={draft.zoneShape}
                    onChange={(e) =>
                      setDraft({ ...draft, zoneShape: e.target.value as 'box' | 'circle' | 'cross' })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-2 text-xs text-white"
                  >
                    <option value="box">box (Rectangular)</option>
                    <option value="circle">circle (Circular)</option>
                    <option value="cross">cross (Cruz)</option>
                  </select>
                </label>
                <label className="text-[11px] text-slate-400">
                  Temblor Pantalla (px)
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={draft.screenShake}
                    onChange={(e) => setDraft({ ...draft, screenShake: Number(e.target.value) || 0 })}
                    className="font-mono-num mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
                <label className="text-[11px] text-slate-400">
                  Haz al Objetivo (beamToTarget)
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.beamToTarget}
                      onChange={(e) => setDraft({ ...draft, beamToTarget: e.target.checked })}
                    />
                    <span className="text-xs text-slate-200">Activo</span>
                  </div>
                </label>
                <label className="text-[11px] text-slate-400">
                  Texto Flotante
                  <input
                    type="text"
                    value={draft.floatingText}
                    onChange={(e) => setDraft({ ...draft, floatingText: e.target.value })}
                    placeholder="Ej. ¡IMPACTO!"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-xs text-white"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Preview Column */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4 shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-200">Vista Previa Interactiva</span>
                </div>
                {draft.badgeLabel.trim() && (
                  <span
                    className="font-mono-num rounded-lg border px-2.5 py-1 text-[10px] font-bold shadow"
                    style={{
                      borderColor: draft.color,
                      color: draft.badgeTextColor || draft.color,
                      backgroundColor: '#0E1217',
                    }}
                  >
                    {draft.badgeLabel.trim()}
                  </span>
                )}
              </div>
              <p className="mt-2 text-base font-bold text-white">{draft.name}</p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">{draft.description}</p>
              
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-[#0E1217] p-2.5 border border-slate-800">
                  <span className="text-slate-500 block">Disparador</span>
                  <span className="font-bold text-amber-300">{draft.trigger}</span>
                </div>
                <div className="rounded-lg bg-[#0E1217] p-2.5 border border-slate-800">
                  <span className="text-slate-500 block">Objetivo / Lado</span>
                  <span className="font-bold text-emerald-300">{draft.targetSide}</span>
                </div>
                <div className="rounded-lg bg-[#0E1217] p-2.5 border border-slate-800">
                  <span className="text-slate-500 block">Forma Geométrica</span>
                  <span className="font-bold text-cyan-300">
                    {draft.areaShape} {(draft.areaShape === 'square' || draft.areaShape === 'rect') && `(r=${draft.radiusCells})`}
                  </span>
                </div>
                <div className="rounded-lg bg-[#0E1217] p-2.5 border border-slate-800">
                  <span className="text-slate-500 block">Categoría</span>
                  <span className="font-bold text-purple-300">{draft.category}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col rounded-xl border border-slate-800 bg-[#0E1217] p-4 shadow">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <p className="text-xs font-bold text-white">JSON Resultante (Listo para effects.json)</p>
                  <p className="text-[11px] text-slate-400">
                    Copia este bloque e insértalo en <code className="text-amber-300">effects.json</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 shadow"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? '¡Copiado!' : 'Copiar JSON'}
                </button>
              </div>
              <pre className="font-mono-num mt-3 max-h-[400px] flex-1 overflow-auto text-[11px] leading-relaxed text-emerald-300">
                {generatedObject.jsonText}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        /* Raw JSON Editor Mode */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-slate-800 bg-[#0E1217] p-4 shadow">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400">Editor de Texto JSON</span>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(`{${rawJsonText}}`);
                    const firstKey = Object.keys(parsed)[0];
                    if (firstKey && parsed[firstKey]) {
                      setDraft(fromDefinition(parsed[firstKey]));
                      setJsonError(null);
                      setMode('visual');
                    }
                  } catch (err: any) {
                    setJsonError(err?.message || 'Error de sintaxis JSON');
                  }
                }}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Aplicar al Editor Visual
              </button>
            </div>
            {jsonError && (
              <div className="mt-2 rounded bg-rose-500/20 border border-rose-500 p-2 text-xs text-rose-300">
                {jsonError}
              </div>
            )}
            <textarea
              value={rawJsonText}
              onChange={(e) => setRawJsonText(e.target.value)}
              className="font-mono-num mt-3 h-[450px] w-full resize-none rounded-lg border border-slate-800 bg-[#141A23] p-3 text-xs text-emerald-300 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-col rounded-xl border border-slate-800 bg-[#1A212B] p-4 shadow">
            <h4 className="text-xs font-bold text-amber-400 uppercase">Guía Rápida de Propiedades JSON</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-300 list-disc list-inside">
              <li><code className="text-cyan-300">engineMode: &quot;declarative&quot;</code> — Obligatorio para efectos dinámicos.</li>
              <li><code className="text-cyan-300">trigger</code> — continuous_aura, periodic, on_hit, on_attack, on_spawn, on_hp_below, on_kill, on_death, passive.</li>
              <li><code className="text-cyan-300">targetSide</code> — opponents, allies, self, towers, enemies.</li>
              <li><code className="text-cyan-300">modifiers</code> — damageInstant, dotDps, healAmount, slowFactor, speedMultiplier, stunSec, instakill, etc.</li>
              <li><code className="text-cyan-300">visual</code> — showZone, waveKind, floatingText, sound, zoneRgb.</li>
            </ul>
            <div className="mt-auto pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? '¡Copiado!' : 'Copiar JSON'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
