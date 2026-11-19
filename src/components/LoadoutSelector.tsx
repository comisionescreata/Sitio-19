import { ArrowLeft, Maximize2, Minimize2, Play, Shield, ShieldAlert, Target, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { ENEMY_CATALOG, GAME_CONFIG, SECTOR_BACKDROP_IMAGE, TOWER_CATALOG } from '../data/scpCatalog';
import { getEffectiveTowerCost } from '../engine/simulation';
import { LevelConfig, TowerType } from '../types/game';

interface LoadoutSelectorProps {
  levelConfig: LevelConfig;
  unlockedTowers: TowerType[];
  maxSlots: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onBack: () => void;
  onConfirmDeck: (deck: TowerType[]) => void;
}

export function LoadoutSelector({
  levelConfig,
  unlockedTowers,
  maxSlots,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  onConfirmDeck,
}: LoadoutSelectorProps) {
  const bannedSet = new Set(levelConfig.rules?.bannedTowers ?? []);

  // Default pre-selected loadout up to maxSlots, ensuring researcher + guard + key counters if unlocked & allowed
  const buildDefaultDeck = (): TowerType[] => {
    const picked: TowerType[] = [];
    for (const t of GAME_CONFIG.progression.defaultDeckPriority) {
      if (unlockedTowers.includes(t) && !bannedSet.has(t) && picked.length < maxSlots) {
        picked.push(t);
      }
    }
    if (picked.length === 0) {
      for (const t of unlockedTowers) {
        if (!bannedSet.has(t) && picked.length < maxSlots) {
          picked.push(t);
        }
      }
    }
    return picked;
  };

  const [selectedDeck, setSelectedDeck] = useState<TowerType[]>(buildDefaultDeck);

  const toggleTower = (type: TowerType) => {
    if (bannedSet.has(type)) return;
    setSelectedDeck((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      }
      if (prev.length >= maxSlots) return prev;
      return [...prev, type];
    });
  };

  const incomingEnemies = levelConfig.enemiesPresent
    .map((t) => ENEMY_CATALOG.find((e) => e.type === t))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const personalList = TOWER_CATALOG.filter((t) => t.category === 'personal');
  const estructuraList = TOWER_CATALOG.filter((t) => t.category === 'estructura');

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0E1217] text-slate-100">
      {/* Top Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-[#131820] px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Niveles
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wide text-white">
              Nivel {levelConfig.level}: {levelConfig.title}
            </h1>
            <p className="text-xs text-slate-400">
              Inspecciona los SCP entrantes y elige hasta {maxSlots} torres para tu mazo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isFullscreen ? 'Salir' : 'Pantalla Completa'}
          </button>

          <button
            onClick={() => onConfirmDeck(selectedDeck)}
            disabled={selectedDeck.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-40"
          >
            <Play className="h-4 w-4 fill-current" />
            Iniciar Nivel ({selectedDeck.length}/{maxSlots})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 lg:grid-cols-12">
        {/* Left: Level Cover, Objectives & Incoming SCPs */}
        <aside className="flex flex-col rounded-xl border border-slate-800 bg-[#141A22] p-4 lg:col-span-4">
          <div className="relative mb-3 h-28 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            <img
              src={levelConfig.coverImage || SECTOR_BACKDROP_IMAGE}
              alt={`Portada Nivel ${levelConfig.level}`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141A22] via-[#141A22]/30 to-transparent" />
            <div className="absolute right-2.5 bottom-2 left-2.5 flex items-end justify-between gap-2">
              <span className="truncate text-xs font-bold text-white">{levelConfig.title}</span>
              <span className="font-mono-num shrink-0 text-[10px] font-semibold text-amber-300">
                {levelConfig.gridCols}x{levelConfig.gridRows}
              </span>
            </div>
          </div>

          {levelConfig.objectives && levelConfig.objectives.length > 0 && (
            <div className="mb-3 shrink-0 rounded-lg border border-slate-800 bg-[#10151C] p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Target className="h-3.5 w-3.5" />
                <span>Objetivos del Nivel</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {levelConfig.objectives.map((obj) => (
                  <li key={obj.id} className="leading-snug">
                    <span
                      className={`mr-1 font-mono-num text-[10px] font-bold ${
                        obj.category === 'fail_condition' || obj.failOnViolate
                          ? 'text-red-400'
                          : 'text-amber-400'
                      }`}
                    >
                      •
                    </span>
                    {obj.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h2 className="font-display text-xl font-bold text-white">
              SCP en este Nivel ({incomingEnemies.length})
            </h2>
          </div>

          <div className="mt-3 space-y-3 overflow-y-auto pr-1">
            {incomingEnemies.map((enemy) => (
              <div
                key={enemy.type}
                className="flex gap-3 rounded-lg border border-slate-800 bg-[#1A212B] p-3"
              >
                <img
                  src={enemy.portrait}
                  alt={enemy.code}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 shrink-0 rounded-md border border-slate-700 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-bold text-white">
                    {enemy.code} · {enemy.name}
                  </div>
                  <div className="text-[11px] text-amber-400 tabular-nums">
                    Salud {enemy.hp} · Daño {enemy.dps}/s
                  </div>
                  <p className="mt-1 text-xs leading-snug text-slate-300">{enemy.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: Tower Loadout Picker */}
        <section className="flex flex-col rounded-xl border border-slate-800 bg-[#141A22] p-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Selecciona tus Torres ({selectedDeck.length}/{maxSlots} máximo)
              </h2>
              <p className="text-xs text-slate-400">
                Haz clic para añadir o quitar unidades de Personal y Estructuras.
              </p>
            </div>
            <div className="font-mono-num text-xs font-semibold text-amber-400">
              Espacios disponibles: {maxSlots - selectedDeck.length}
            </div>
          </div>

          <div className="mt-4 space-y-5 overflow-y-auto pr-1">
            {/* Personal */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                <UserCheck className="h-4 w-4" />
                <span>Personal</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {personalList.map((tower) => {
                  const unlocked = unlockedTowers.includes(tower.type);
                  const banned = bannedSet.has(tower.type);
                  const chosen = selectedDeck.includes(tower.type);
                  const full = selectedDeck.length >= maxSlots && !chosen;
                  const effectiveCost = getEffectiveTowerCost(tower.type, levelConfig.rules);

                  return (
                    <button
                      key={tower.type}
                      disabled={!unlocked || banned || full}
                      onClick={() => toggleTower(tower.type)}
                      className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-colors ${
                        !unlocked || banned
                          ? 'border-slate-800/70 bg-[#10141B] opacity-45'
                          : chosen
                          ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/70'
                          : full
                          ? 'border-slate-800 bg-[#171E27] opacity-55'
                          : 'border-slate-700 bg-[#1A222D] hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{tower.name}</span>
                          <span className="font-mono-num text-xs font-bold text-amber-400">
                            {effectiveCost}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {banned
                            ? 'Vetada en este nivel'
                            : unlocked
                            ? tower.roleLabel
                            : `Desbloqueo: Nivel ${tower.unlockLevel}`}
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-slate-300">
                        {tower.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estructuras */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Shield className="h-4 w-4" />
                <span>Estructuras</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {estructuraList.map((tower) => {
                  const unlocked = unlockedTowers.includes(tower.type);
                  const banned = bannedSet.has(tower.type);
                  const chosen = selectedDeck.includes(tower.type);
                  const full = selectedDeck.length >= maxSlots && !chosen;
                  const effectiveCost = getEffectiveTowerCost(tower.type, levelConfig.rules);

                  return (
                    <button
                      key={tower.type}
                      disabled={!unlocked || banned || full}
                      onClick={() => toggleTower(tower.type)}
                      className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-colors ${
                        !unlocked || banned
                          ? 'border-slate-800/70 bg-[#10141B] opacity-45'
                          : chosen
                          ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/70'
                          : full
                          ? 'border-slate-800 bg-[#171E27] opacity-55'
                          : 'border-slate-700 bg-[#1A222D] hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{tower.name}</span>
                          <span className="font-mono-num text-xs font-bold text-amber-400">
                            {effectiveCost}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {banned
                            ? 'Vetada en este nivel'
                            : unlocked
                            ? tower.roleLabel
                            : `Desbloqueo: Nivel ${tower.unlockLevel}`}
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-slate-300">
                        {tower.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
