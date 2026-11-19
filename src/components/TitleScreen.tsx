import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  ENEMY_CATALOG,
  GAME_CONFIG,
  LEVEL_CATALOG,
  NEW_SCP_MILESTONES,
  SECTOR_BACKDROP_IMAGE,
  TOWER_CATALOG,
} from '../data/scpCatalog';
import { LevelConfig, TowerType } from '../types/game';

interface TitleScreenProps {
  completedLevels: number[];
  unlockedTowers: TowerType[];
  freePlayAllUnlocked: boolean;
  adminUnlockedUpTo: number | null;
  adminAuthenticated: boolean;
  initialSelectedLevel: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onStartLevel: (levelNumber: number) => void;
  onOpenDossier: () => void;
  onOpenAdmin: () => void;
}

const SECTORS = GAME_CONFIG.progression.sectors;
const { nodeSpacing: NODE_SPACING, trackHeight: TRACK_HEIGHT, waveAmplitude } = GAME_CONFIG.trackUi;
const CENTER_Y = TRACK_HEIGHT / 2;

function getNodeY(index: number): number {
  return CENTER_Y + Math.sin(index * 0.85) * waveAmplitude;
}

export function TitleScreen({
  completedLevels,
  unlockedTowers,
  freePlayAllUnlocked,
  adminUnlockedUpTo,
  adminAuthenticated,
  initialSelectedLevel,
  isFullscreen,
  onToggleFullscreen,
  onStartLevel,
  onOpenDossier,
  onOpenAdmin,
}: TitleScreenProps) {
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(initialSelectedLevel);
  const trackScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedLevelNum(initialSelectedLevel);
  }, [initialSelectedLevel]);

  const selectedLevel: LevelConfig =
    LEVEL_CATALOG.find((l) => l.level === selectedLevelNum) ?? LEVEL_CATALOG[0];

  const selectedIndex = Math.max(
    0,
    LEVEL_CATALOG.findIndex((l) => l.level === selectedLevel.level)
  );
  const totalLevels = LEVEL_CATALOG.length;
  const maxReachableCount = freePlayAllUnlocked
    ? totalLevels
    : Math.min(totalLevels, Math.max(completedLevels.length + 1, adminUnlockedUpTo ?? 0));
  const maxCompletedNum = completedLevels.length > 0 ? Math.max(...completedLevels) : 0;

  const isLevelUnlocked = (idx: number, lvlNum: number) =>
    freePlayAllUnlocked ||
    idx + 1 <= maxReachableCount ||
    lvlNum <= Math.max(maxCompletedNum + 1, adminUnlockedUpTo ?? 0) ||
    completedLevels.includes(lvlNum);

  const previewEnemies = selectedLevel.enemiesPresent
    .map((type) => ENEMY_CATALOG.find((e) => e.type === type))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const isSelectedUnlocked = isLevelUnlocked(selectedIndex, selectedLevel.level);

  const scrollToLevel = (lvlNum: number) => {
    setSelectedLevelNum(lvlNum);
    const el = trackScrollRef.current;
    if (!el) return;
    const foundIdx = LEVEL_CATALOG.findIndex((l) => l.level === lvlNum);
    const idx = foundIdx >= 0 ? foundIdx : 0;
    const targetX = Math.max(0, idx * NODE_SPACING + 90 - el.clientWidth / 2);
    el.scrollTo({ left: targetX, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = trackScrollRef.current;
    if (!el) return;
    const foundIdx = LEVEL_CATALOG.findIndex((l) => l.level === selectedLevelNum);
    const idx = foundIdx >= 0 ? foundIdx : 0;
    const targetX = Math.max(0, idx * NODE_SPACING + 90 - el.clientWidth / 2);
    el.scrollTo({ left: targetX });
  }, []);

  const trackWidth = totalLevels * NODE_SPACING + 120;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0E1217] text-slate-100">
      {/* Top Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-[#131820] px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl font-bold tracking-wide text-white">
            {GAME_CONFIG.app.title}
          </h1>
          <span className="hidden text-xs text-slate-400 sm:inline tabular-nums">
            {totalLevels} Niveles · {unlockedTowers.length}/{TOWER_CATALOG.length} Torres desbloqueadas
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              freePlayAllUnlocked || adminUnlockedUpTo !== null || adminAuthenticated
                ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            {freePlayAllUnlocked
              ? 'Admin · Todo Libre'
              : adminUnlockedUpTo !== null
              ? `Admin · Hasta Nv. ${adminUnlockedUpTo}`
              : 'Admin'}
          </button>

          <button
            type="button"
            onClick={onOpenDossier}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-200 transition-colors hover:bg-slate-700"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Archivo SCP
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-200 transition-colors hover:bg-slate-700"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isFullscreen ? 'Salir' : 'Pantalla Completa'}
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
        {/* Selected Level Hero Card */}
        <section className="mx-auto w-full max-w-6xl shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-[#141A22]">
          <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
            <div className="flex flex-col justify-between p-5 lg:col-span-7">
              <div>
                <p className="text-xs font-medium tracking-wider text-amber-400 tabular-nums">
                  Nivel {selectedLevel.level} de {totalLevels} ·{' '}
                  {selectedLevel.rules?.lockedDeck?.length
                    ? 'Mazo fijo táctico'
                    : selectedLevel.level <= GAME_CONFIG.progression.autoDeckMaxLevel
                    ? 'Mazo automático'
                    : `Elige hasta ${selectedLevel.maxDeckSlots} torres`}
                </p>
                <h2 className="font-display mt-1 text-3xl font-bold text-white">
                  {selectedLevel.level}. {selectedLevel.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-300">{selectedLevel.description}</p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400 tabular-nums">
                  <span>Energía inicial: {selectedLevel.startingEnergy}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Mapa: {selectedLevel.gridCols}x{selectedLevel.gridRows}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-red-300">
                    <Flag className="h-3.5 w-3.5 text-red-400" />
                    {selectedLevel.flagMarkers.length}{' '}
                    {selectedLevel.flagMarkers.length === 1 ? 'Gran Horda' : 'Grandes Hordas'}
                  </span>
                  {selectedLevel.disableTeslaGates && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-rose-300">Sin Tesla</span>
                    </>
                  )}
                  {selectedLevel.victoryCondition?.mode &&
                    selectedLevel.victoryCondition.mode !== 'standard' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-cyan-300">
                          {selectedLevel.victoryCondition.label ??
                            (selectedLevel.victoryCondition.mode === 'survive_time'
                              ? `Sobrevivir ${selectedLevel.victoryCondition.targetSeconds ?? selectedLevel.durationSeconds}s`
                              : selectedLevel.victoryCondition.mode === 'kill_count'
                              ? `Contener ${selectedLevel.victoryCondition.targetKills ?? 25} SCP`
                              : selectedLevel.victoryCondition.mode === 'survive_and_kill'
                              ? `Sobrevivir ${selectedLevel.victoryCondition.targetSeconds ?? selectedLevel.durationSeconds}s y contener ${selectedLevel.victoryCondition.targetKills ?? 25}`
                              : selectedLevel.victoryCondition.mode === 'destroy_obstacles'
                              ? 'Despejar obstáculos objetivo'
                              : selectedLevel.victoryCondition.mode === 'boss_hunt'
                              ? 'Cacería de objetivo prioritario'
                              : selectedLevel.victoryCondition.mode === 'objectives_only'
                              ? 'Victoria por objetivos'
                              : selectedLevel.victoryCondition.mode === 'endless'
                              ? 'Modo Infinito'
                              : 'Estándar')}
                        </span>
                      </>
                    )}
                  {selectedLevel.rewardLabel && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-300">{selectedLevel.rewardLabel}</span>
                    </>
                  )}
                </div>

                {/* Level Objectives Summary */}
                {selectedLevel.objectives && selectedLevel.objectives.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-800 bg-[#11161D] p-2.5">
                    <div className="mb-1.5 text-[11px] font-bold tracking-wide text-amber-300">
                      Objetivos de la Misión ({selectedLevel.objectives.length})
                    </div>
                    <ul className="space-y-1">
                      {selectedLevel.objectives.map((obj) => (
                        <li
                          key={obj.id}
                          className="flex items-start justify-between gap-2 text-xs text-slate-300"
                        >
                          <span className="min-w-0">
                            <span
                              className={`mr-1.5 font-mono-num text-[10px] font-bold ${
                                obj.category === 'fail_condition' || obj.failOnViolate
                                  ? 'text-red-400'
                                  : obj.category === 'primary' || obj.requiredForVictory
                                  ? 'text-amber-400'
                                  : 'text-sky-400'
                              }`}
                            >
                              [
                              {obj.category === 'fail_condition' || obj.failOnViolate
                                ? 'LÍMITE'
                                : obj.category === 'primary' || obj.requiredForVictory
                                ? 'PRIMARIO'
                                : obj.category === 'bonus'
                                ? 'BONUS'
                                : 'SECUNDARIO'}
                              ]
                            </span>
                            {obj.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Incoming SCPs Preview */}
                <div className="mt-4 border-t border-slate-800 pt-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <span>SCP en este nivel ({previewEnemies.length}):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {previewEnemies.map((enemy) => (
                      <div
                        key={enemy.type}
                        className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#1A212B] p-1.5"
                      >
                        <img
                          src={enemy.portrait}
                          alt={enemy.code}
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 shrink-0 rounded-md border border-slate-700 object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white">{enemy.code}</div>
                          <div className="truncate text-[10px] text-slate-400">{enemy.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStartLevel(selectedLevel.level)}
                  disabled={!isSelectedUnlocked}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-40"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {isSelectedUnlocked
                    ? `Jugar Nivel ${selectedLevel.level}`
                    : `Nivel ${selectedLevel.level} Bloqueado`}
                </button>
              </div>
            </div>

            <div className="relative min-h-[220px] bg-slate-900 lg:col-span-5">
              <img
                src={selectedLevel.coverImage || SECTOR_BACKDROP_IMAGE}
                alt={`Portada Nivel ${selectedLevel.level}: ${selectedLevel.title}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141A22] via-transparent to-transparent lg:via-[#141A22]/25" />
              <div className="absolute right-3 bottom-3 rounded-md border border-slate-700/80 bg-[#0E1217]/85 px-2.5 py-1 text-[11px] font-semibold text-slate-200 backdrop-blur-xs">
                Sector {selectedLevel.level} · {selectedLevel.gridCols}x{selectedLevel.gridRows}
              </div>
            </div>
          </div>
        </section>

        {/* PvZ2-Style Winding Horizontal Progression Line */}
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center pb-2">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wide text-white">
                Ruta de Contención ({totalLevels} Niveles)
              </h2>
              <p className="text-xs text-slate-400 tabular-nums">
                Completados: {completedLevels.length}/{totalLevels} · Avanza por la línea táctica del Sitio-19
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {SECTORS.map((sec) => {
                const activeSector =
                  selectedLevelNum >= sec.start && selectedLevelNum <= sec.end;
                return (
                  <button
                    type="button"
                    key={sec.id}
                    onClick={() => scrollToLevel(sec.start)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeSector
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700 bg-[#141A22] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  trackScrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' })
                }
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-[#141A22] text-slate-300 hover:bg-slate-800"
                aria-label="Desplazar ruta a la izquierda"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  trackScrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' })
                }
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-[#141A22] text-slate-300 hover:bg-slate-800"
                aria-label="Desplazar ruta a la derecha"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={trackScrollRef}
            className="relative w-full overflow-x-auto rounded-xl border border-slate-800 bg-[#12171F] py-2 shadow-inner"
          >
            <div className="relative" style={{ width: `${trackWidth}px`, height: `${TRACK_HEIGHT}px` }}>
              {/* SVG Winding Path Segments */}
              <svg
                width={trackWidth}
                height={TRACK_HEIGHT}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                {LEVEL_CATALOG.slice(0, -1).map((lvl, idx) => {
                  const x1 = 76 + idx * NODE_SPACING;
                  const y1 = getNodeY(idx);
                  const x2 = 76 + (idx + 1) * NODE_SPACING;
                  const y2 = getNodeY(idx + 1);
                  const mx = (x1 + x2) / 2;
                  const pathD = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;

                  const nextLvl = LEVEL_CATALOG[idx + 1];
                  const isPathDone = completedLevels.includes(lvl.level);
                  const isPathReachable = nextLvl ? isLevelUnlocked(idx + 1, nextLvl.level) : false;

                  return (
                    <path
                      key={lvl.level}
                      d={pathD}
                      fill="none"
                      stroke={
                        isPathDone ? '#10B981' : isPathReachable ? '#F59E0B' : '#334155'
                      }
                      strokeWidth={isPathDone || isPathReachable ? 5 : 3}
                      strokeDasharray={isPathDone || isPathReachable ? undefined : '7 7'}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Level Nodes along the PvZ2 Winding Line */}
              {LEVEL_CATALOG.map((lvl, idx) => {
                const x = 76 + idx * NODE_SPACING;
                const y = getNodeY(idx);
                const isSelected = lvl.level === selectedLevelNum;
                const isCompleted = completedLevels.includes(lvl.level);
                const isUnlocked = isLevelUnlocked(idx, lvl.level);
                const isMilestone = NEW_SCP_MILESTONES.has(lvl.level);
                const labelBelow = idx % 2 === 0;
                const shortReward = lvl.rewardLabel
                  ? lvl.rewardLabel.replace('Desbloquea: ', '')
                  : null;

                return (
                  <div
                    key={lvl.level}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${x}px`, top: `${y}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedLevelNum(lvl.level)}
                      className={`group relative flex h-13 w-13 items-center justify-center rounded-full border-2 font-mono-num text-base font-bold shadow-lg transition-transform hover:scale-105 ${
                        isSelected
                          ? 'border-amber-300 bg-amber-500 text-slate-950 ring-4 ring-amber-400/35'
                          : isCompleted
                          ? 'border-emerald-400 bg-emerald-950 text-emerald-200'
                          : isUnlocked
                          ? 'border-amber-500/80 bg-[#1B232F] text-white'
                          : 'border-slate-700 bg-[#0F131A] text-slate-500'
                      }`}
                      title={`Nivel ${lvl.level}: ${lvl.title}`}
                    >
                      {lvl.level}
                      {isCompleted && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-600 text-white">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {!isCompleted && !isUnlocked && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-400">
                          <Lock className="h-3 w-3" />
                        </span>
                      )}
                    </button>

                    {/* Alternating Callout Tag above/below the winding track */}
                    <div
                      className={`pointer-events-none absolute left-1/2 w-[132px] -translate-x-1/2 text-center ${
                        labelBelow ? 'top-15' : 'bottom-15'
                      }`}
                    >
                      <div
                        className={`truncate text-[11px] font-bold ${
                          isSelected ? 'text-amber-300' : isUnlocked ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {lvl.title}
                      </div>
                      {shortReward && (
                        <div className="truncate text-[10px] text-emerald-400/90">
                          {shortReward}
                        </div>
                      )}
                      {isMilestone && (
                        <div className="text-[10px] font-bold text-red-400">Nuevo SCP</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
