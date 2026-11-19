import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FastForward,
  Flag,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Target,
  Trash2,
  UserCheck,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DESIGN_CATALOG,
  DIALOGUES_CATALOG,
  ENEMY_CATALOG,
  GAME_CONFIG,
  LEVEL_CATALOG,
  TOWER_CATALOG,
} from '../data/scpCatalog';
import { CustomBannerState } from '../engine/eventRunner';
import {
  BoundaryLineOverlay,
  getCanvasDimensions,
  pxToCell,
  renderBoard,
} from '../engine/renderer';
import {
  canPlaceTowerAt,
  collectEnergyDropInSim,
  createInitialSim,
  getEffectiveTowerCooldown,
  getEffectiveTowerCost,
  notifyDialogueCompletedInSim,
  placeTowerInSim,
  removeTowerInSim,
  SimState,
  stepSimulation,
} from '../engine/simulation';
import {
  DialogueDefinition,
  GameState,
  LevelConfig,
  ObjectiveProgressState,
  TowerType,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import { DialogueCompletionResult, DialogueOverlay } from './DialogueOverlay';

interface GameBoardProps {
  levelConfig: LevelConfig;
  activeDeck: TowerType[];
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onLevelComplete: (levelNumber: number) => void;
  onSelectNextLevel: () => void;
  onBackToMenu: () => void;
  onOpenDossier: () => void;
  dossierOpen: boolean;
}

export function GameBoard({
  levelConfig,
  activeDeck,
  isFullscreen,
  onToggleFullscreen,
  onLevelComplete,
  onSelectNextLevel,
  onBackToMenu,
  onOpenDossier,
  dossierOpen,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<SimState>(createInitialSim(levelConfig));
  const prevLevelRef = useRef<number>(levelConfig.level);
  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(
    levelConfig.gridRows,
    levelConfig.gridCols
  );

  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [muted, setMuted] = useState(soundEngine.muted);
  const [selectedTool, setSelectedTool] = useState<TowerType | 'remove' | null>(
    activeDeck.includes('guard') ? 'guard' : activeDeck[0] ?? null
  );
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<{
    def: DialogueDefinition;
    mode: 'intro' | 'mid' | 'victory' | 'defeat';
  } | null>(() => {
    const id = levelConfig.introDialogueId;
    if (!id) return null;
    const def = levelConfig.inlineDialogues?.[id] ?? DIALOGUES_CATALOG[id];
    return def ? { def, mode: 'intro' } : null;
  });

  const [hud, setHud] = useState<{
    energy: number;
    progress: number;
    kills: number;
    towersDeployed: number;
    announcement: string;
    flagBanner: string;
    customBanner: CustomBannerState | null;
    cooldowns: Record<string, number>;
    objectives: ObjectiveProgressState[];
    defeatReason?: string;
    endlessCycle: number;
  }>({
    energy: levelConfig.startingEnergy,
    progress: 0,
    kills: 0,
    towersDeployed: 0,
    announcement: `Nivel ${levelConfig.level}: ${levelConfig.title}.`,
    flagBanner: '',
    customBanner: null,
    cooldowns: { ...simRef.current.cooldowns },
    objectives: simRef.current.objectives.map((o) => ({ ...o })),
    defeatReason: undefined,
    endlessCycle: 0,
  });

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const speedMultiplierRef = useRef<1 | 2>(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;

  const dossierOpenRef = useRef<boolean>(dossierOpen);
  dossierOpenRef.current = dossierOpen;

  const selectedToolRef = useRef<TowerType | 'remove' | null>(selectedTool);
  selectedToolRef.current = selectedTool;

  const hoverCellRef = useRef<{ row: number; col: number } | null>(hoverCell);
  hoverCellRef.current = hoverCell;

  const levelConfigRef = useRef<LevelConfig>(levelConfig);
  levelConfigRef.current = levelConfig;

  const onLevelCompleteRef = useRef(onLevelComplete);
  onLevelCompleteRef.current = onLevelComplete;

  const activeDialogueRef = useRef(activeDialogue);
  activeDialogueRef.current = activeDialogue;

  const resolveDialogueDef = useCallback(
    (dialogueId?: string, inlineDialogue?: DialogueDefinition): DialogueDefinition | null => {
      if (inlineDialogue) return inlineDialogue;
      if (!dialogueId) return null;
      return levelConfigRef.current.inlineDialogues?.[dialogueId] ?? DIALOGUES_CATALOG[dialogueId] ?? null;
    },
    []
  );

  const syncHud = useCallback(() => {
    const s = simRef.current;
    const cfg = levelConfigRef.current;
    const vc = cfg.victoryCondition;
    const mode = vc?.mode ?? 'standard';
    let rawProgress = 0;

    const countVictoryKills = () => {
      const types = vc?.targetEnemyTypes;
      if (!types || types.length === 0) return s.kills;
      return types.reduce((acc, t) => acc + (s.killsByEnemyType[t] ?? 0), 0);
    };

    if (mode === 'survive_time') {
      const targetSec = vc?.targetSeconds ?? cfg.durationSeconds;
      rawProgress = targetSec > 0 ? Math.min(1, s.levelTimer / targetSec) : 0;
    } else if (mode === 'kill_count') {
      const targetKills = vc?.targetKills ?? 25;
      rawProgress = targetKills > 0 ? Math.min(1, countVictoryKills() / targetKills) : 0;
    } else if (mode === 'survive_and_kill') {
      const targetSec = vc?.targetSeconds ?? cfg.durationSeconds;
      const targetKills = vc?.targetKills ?? 25;
      const tProg = targetSec > 0 ? Math.min(1, s.levelTimer / targetSec) : 1;
      const kProg = targetKills > 0 ? Math.min(1, countVictoryKills() / targetKills) : 1;
      rawProgress = (tProg + kProg) / 2;
    } else if (mode === 'destroy_obstacles') {
      const kind = vc?.obstacleKind;
      const destroyed = kind
        ? s.obstaclesDestroyedByKind[kind] ?? 0
        : s.obstacleDestroyedCount;
      const remaining = s.obstacles.filter((o) => !kind || o.kind === kind).length;
      const total = vc?.targetObstacles ?? Math.max(1, destroyed + remaining);
      rawProgress = Math.min(1, destroyed / Math.max(1, total));
    } else if (mode === 'objectives_only') {
      const primaries = s.objectives.filter(
        (o) => o.category === 'primary' || o.def.requiredForVictory
      );
      if (primaries.length > 0) {
        const done = primaries.filter((o) => o.status === 'completed').length;
        rawProgress = Math.min(1, done / primaries.length);
      } else {
        rawProgress = Math.min(0.99, s.levelTimer / Math.max(1, cfg.durationSeconds));
      }
    } else if (mode === 'boss_hunt') {
      const bosses = vc?.targetEnemyTypes ?? [];
      if (bosses.length > 0) {
        const killedCount = bosses.filter((b) => (s.killsByEnemyType[b] ?? 0) > 0).length;
        rawProgress = Math.min(1, killedCount / bosses.length);
      } else {
        rawProgress = Math.min(0.99, s.levelTimer / Math.max(1, cfg.durationSeconds));
      }
    } else if (mode === 'endless') {
      const dur = Math.max(1, cfg.durationSeconds);
      rawProgress = (s.levelTimer % dur) / dur;
    } else {
      const allSpawned =
        s.spawnedIndices.size >= s.timeline.length && s.pendingStaggeredSpawns.length === 0;
      rawProgress =
        allSpawned && s.enemies.length === 0
          ? 1
          : Math.min(0.99, s.levelTimer / Math.max(1, cfg.durationSeconds));
    }

    setHud({
      energy: s.energy,
      progress: rawProgress,
      kills: s.kills,
      towersDeployed: s.towersDeployed,
      announcement: s.announcementTimer > 0 ? s.announcement : '',
      flagBanner: s.flagBannerTimer > 0 ? s.flagBanner : '',
      customBanner: s.customBanner && s.customBanner.remaining > 0 ? { ...s.customBanner } : null,
      cooldowns: { ...s.cooldowns },
      objectives: s.objectives.map((o) => ({ ...o })),
      defeatReason: s.defeatReason,
      endlessCycle: s.endlessCycle ?? 0,
    });
  }, []);

  const syncHudRef = useRef(syncHud);
  syncHudRef.current = syncHud;

  useEffect(() => {
    if (prevLevelRef.current !== levelConfig.level) {
      prevLevelRef.current = levelConfig.level;
      simRef.current = createInitialSim(levelConfig);
      setSelectedTool(activeDeck.includes('guard') ? 'guard' : activeDeck[0] ?? null);
      const introDef = resolveDialogueDef(levelConfig.introDialogueId);
      setActiveDialogue(introDef ? { def: introDef, mode: 'intro' } : null);
      setGameState('PLAYING');
      syncHudRef.current();
    }
  }, [levelConfig, activeDeck, resolveDialogueDef]);

  const handleRestart = useCallback(() => {
    simRef.current = createInitialSim(levelConfigRef.current);
    setSelectedTool(activeDeck.includes('guard') ? 'guard' : activeDeck[0] ?? null);
    const introDef = resolveDialogueDef(levelConfigRef.current.introDialogueId);
    setActiveDialogue(introDef ? { def: introDef, mode: 'intro' } : null);
    setGameState('PLAYING');
    syncHudRef.current();
  }, [activeDeck, resolveDialogueDef]);

  const handleDialogueLineTrigger = useCallback((triggerEventId?: string, energyDelta?: number) => {
    notifyDialogueCompletedInSim(simRef.current, undefined, triggerEventId, energyDelta);
    syncHudRef.current();
  }, []);

  const handleDialogueComplete = useCallback(
    (result?: DialogueCompletionResult) => {
      const current = activeDialogueRef.current;
      if (!current) return;
      notifyDialogueCompletedInSim(
        simRef.current,
        current.def.id,
        result?.triggerEventId,
        result?.energyDelta
      );
      if (result?.nextDialogueId) {
        const nextDef = resolveDialogueDef(result.nextDialogueId);
        if (nextDef) {
          setActiveDialogue({ def: nextDef, mode: current.mode });
          syncHudRef.current();
          return;
        }
      }
      setActiveDialogue(null);
      if (current.mode === 'victory') {
        gameStateRef.current = 'VICTORY';
        setGameState('VICTORY');
      } else if (current.mode === 'defeat') {
        gameStateRef.current = 'GAME_OVER';
        setGameState('GAME_OVER');
      }
      syncHudRef.current();
    },
    [resolveDialogueDef]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.muted = next;
      return next;
    });
  }, []);

  const deckDefs = TOWER_CATALOG.filter((t) => activeDeck.includes(t.type));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (dossierOpenRef.current || activeDialogueRef.current) return;
      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        if (deckDefs[idx]) {
          setSelectedTool(deckDefs[idx].type);
        }
      } else if (e.key === '0') {
        if (deckDefs[9]) {
          setSelectedTool(deckDefs[9].type);
        }
      } else if (e.key.toLowerCase() === 'x') {
        setSelectedTool('remove');
      } else if (e.key === 'Escape') {
        setSelectedTool(null);
      } else if (e.key === ' ') {
        e.preventDefault();
        setGameState((prev) =>
          prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deckDefs]);

  // Single persistent 60fps rAF loop decoupled from React re-renders
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const dialoguePaused =
        activeDialogueRef.current !== null && activeDialogueRef.current.def.pauseGame !== false;
      const isPlaying =
        gameStateRef.current === 'PLAYING' && !dossierOpenRef.current && !dialoguePaused;

      if (!activeDialogueRef.current && simRef.current.pendingDialogues.length > 0) {
        const nextEntry = simRef.current.pendingDialogues.shift()!;
        const def = resolveDialogueDef(nextEntry.dialogueId, nextEntry.inlineDialogue);
        if (def) {
          const nextDlg = { def, mode: 'mid' as const };
          activeDialogueRef.current = nextDlg;
          setActiveDialogue(nextDlg);
        }
      }

      if (isPlaying) {
        const mult = speedMultiplierRef.current;
        for (let i = 0; i < mult; i++) {
          if (gameStateRef.current !== 'PLAYING') break;
          if (activeDialogueRef.current && activeDialogueRef.current.def.pauseGame !== false) break;
          const outcome = stepSimulation(simRef.current, rawDt);
          if (!activeDialogueRef.current && simRef.current.pendingDialogues.length > 0) {
            const nextEntry = simRef.current.pendingDialogues.shift()!;
            const def = resolveDialogueDef(nextEntry.dialogueId, nextEntry.inlineDialogue);
            if (def) {
              const nextDlg = { def, mode: 'mid' as const };
              activeDialogueRef.current = nextDlg;
              setActiveDialogue(nextDlg);
              if (def.pauseGame !== false) {
                syncHudRef.current();
                break;
              }
            }
          }
          if (outcome === 'VICTORY') {
            onLevelCompleteRef.current(levelConfigRef.current.level);
            const vicDef = resolveDialogueDef(levelConfigRef.current.victoryDialogueId);
            if (vicDef) {
              const vicDlg = { def: vicDef, mode: 'victory' as const };
              activeDialogueRef.current = vicDlg;
              setActiveDialogue(vicDlg);
            } else {
              gameStateRef.current = 'VICTORY';
              setGameState('VICTORY');
            }
            syncHudRef.current();
            break;
          }
          if (outcome === 'GAME_OVER') {
            const defDef = resolveDialogueDef(levelConfigRef.current.defeatDialogueId);
            if (defDef) {
              const defDlg = { def: defDef, mode: 'defeat' as const };
              activeDialogueRef.current = defDlg;
              setActiveDialogue(defDlg);
            } else {
              gameStateRef.current = 'GAME_OVER';
              setGameState('GAME_OVER');
            }
            syncHudRef.current();
            break;
          }
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const s = simRef.current;
          const tool = selectedToolRef.current;
          const hover = hoverCellRef.current;
          const selectedDef =
            tool && tool !== 'remove' ? TOWER_CATALOG.find((t) => t.type === tool) : null;
          const selectedCost = selectedDef
            ? getEffectiveTowerCost(selectedDef.type, s.rules, s)
            : 0;
          const canAfford = selectedDef
            ? s.energy >= selectedCost &&
              (s.cooldowns[selectedDef.type] ?? 0) <= 0 &&
              (hover ? canPlaceTowerAt(s, selectedDef.type, hover.row, hover.col) : true)
            : false;
          const hasActive049 = s.enemies.some((e) => e.type === 'scp_049' && e.hp > 0);
          const boundaryLines: BoundaryLineOverlay[] = s.objectives
            .filter(
              (o) =>
                o.def.kind === 'no_enemy_past_col' &&
                o.def.showBoundaryLine !== false
            )
            .map((o) => ({
              col: o.def.col ?? 3,
              color: o.def.boundaryColor ?? o.def.color,
              label: o.def.boundaryLabel ?? `LÍMITE COL ${o.def.col ?? 3}`,
              rows: o.def.rows,
            }));

          renderBoard(ctx, {
            gridRows: s.gridRows,
            gridCols: s.gridCols,
            boardOverride: s.boardOverride,
            blockedCells: s.blockedCells,
            tileModifiers: s.tileModifiers,
            tileOverrides: s.tileOverrides,
            obstacles: s.obstacles,
            environment: s.environment,
            shakeIntensity: s.shakeIntensity,
            shakeTimer: s.shakeTimer,
            flashRgb: s.flashRgb,
            flashAlpha: s.flashAlpha,
            screenTints: s.activeScreenTints,
            weather: s.activeWeather,
            laneHighlights: s.activeLaneHighlights,
            boundaryLines,
            towers: s.towers,
            enemies: s.enemies,
            doors079: s.doors079,
            projectiles: s.projectiles,
            energyDrops: s.energyDrops,
            effects: s.effects,
            particleSystem: s.particleSystem,
            gates: s.gates,
            hoverCell: hover,
            selectedTool: tool,
            canAffordSelected: canAfford,
            time: s.elapsedTime,
            blinkAlpha: s.blinkAlpha,
            hasActive049,
          });
        }
      }

      hudSyncAccum += rawDt;
      if (hudSyncAccum >= 0.08) {
        hudSyncAccum = 0;
        syncHudRef.current();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const getLogicalCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { width, height } = getCanvasDimensions(
      simRef.current.gridRows,
      simRef.current.gridCols
    );
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    return { px, py };
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getLogicalCoords(e);
    if (!coords) {
      setHoverCell(null);
      return;
    }
    setHoverCell(
      pxToCell(coords.px, coords.py, simRef.current.gridRows, simRef.current.gridCols)
    );
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING' || dossierOpen || activeDialogue) return;
    const coords = getLogicalCoords(e);
    if (!coords) return;

    const s = simRef.current;

    if (collectEnergyDropInSim(s, coords.px, coords.py)) {
      syncHud();
      return;
    }

    const cell = pxToCell(coords.px, coords.py, s.gridRows, s.gridCols);
    if (!cell || !selectedTool) return;

    if (selectedTool === 'remove') {
      if (removeTowerInSim(s, cell.row, cell.col)) {
        syncHud();
      }
      return;
    }

    if (placeTowerInSim(s, selectedTool, cell.row, cell.col)) {
      syncHud();
    }
  };

  const personalCards = deckDefs.filter((t) => t.category === 'personal');
  const estructuraCards = deckDefs.filter((t) => t.category === 'estructura');
  const levelEnemyCodes = levelConfig.enemiesPresent
    .map((t) => ENEMY_CATALOG.find((e) => e.type === t)?.code ?? t)
    .join(' · ');

  const hudTheme = DESIGN_CATALOG.hudTheme;
  const currentCatalogIdx = LEVEL_CATALOG.findIndex((l) => l.level === levelConfig.level);
  const hasNextLevel = currentCatalogIdx >= 0 && currentCatalogIdx + 1 < LEVEL_CATALOG.length;

  let keyCounter = 0;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0E1217] text-slate-100">
      {/* Top HUD Bar */}
      <header
        className="shrink-0 border-b border-slate-800 bg-[#131820] px-4 py-2"
        style={{
          ...(hudTheme?.headerBg ? { backgroundColor: hudTheme.headerBg } : {}),
          ...(hudTheme?.panelBorder ? { borderColor: hudTheme.panelBorder } : {}),
        }}
      >
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onBackToMenu}
              className="font-display text-xl font-bold tracking-wide whitespace-nowrap text-white transition-colors hover:text-amber-400"
            >
              Sitio-19
            </button>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                <Zap className="h-4 w-4 fill-amber-400/20" />
                <span>Energía:</span>
                <span className="font-mono-num text-base font-bold text-white">{hud.energy}</span>
              </div>

              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>

              <div className="text-slate-300">
                <span>Nivel </span>
                <span className="font-mono-num font-bold text-white">
                  {levelConfig.level}/{LEVEL_CATALOG.length}
                </span>
                <span className="hidden text-slate-400 md:inline"> ({levelConfig.title})</span>
              </div>

              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>

              <div className="text-slate-300">
                <span>Contenidos: </span>
                <span className="font-mono-num font-bold text-white">{hud.kills}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : 1))}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                speedMultiplier === 2
                  ? 'border-amber-500 bg-amber-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
              }`}
              title="Alternar velocidad 1x / 2x"
            >
              <FastForward className="h-3.5 w-3.5" />
              {speedMultiplier}x
            </button>

            <button
              type="button"
              onClick={() =>
                setGameState((prev) =>
                  prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev
                )
              }
              disabled={gameState === 'VICTORY' || gameState === 'GAME_OVER'}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40"
            >
              {gameState === 'PAUSED' ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Reanudar
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pausar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenDossier}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-200 transition-colors hover:bg-slate-700"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Archivo
            </button>

            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
              title={muted ? 'Activar sonido' : 'Silenciar sonido'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-200 transition-colors hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reiniciar
            </button>
          </div>
        </div>
      </header>

      {/* Main Fullscreen Play Workspace */}
      <main className="mx-auto flex min-h-0 w-full max-w-[1360px] flex-1 flex-col gap-2 px-4 py-2">
        {/* Active Deck Toolbar */}
        <section
          aria-label="Mazo de Personal y Estructuras"
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#141A22] px-3 py-2"
          style={{
            ...(hudTheme?.panelBg ? { backgroundColor: hudTheme.panelBg } : {}),
            ...(hudTheme?.panelBorder ? { borderColor: hudTheme.panelBorder } : {}),
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {personalCards.length > 0 && (
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <div className="flex flex-wrap gap-1.5">
                  {personalCards.map((card) => {
                    keyCounter += 1;
                    const shortcut = keyCounter === 10 ? 0 : keyCounter;
                    const effectiveCost = getEffectiveTowerCost(
                      card.type,
                      levelConfig.rules,
                      simRef.current
                    );
                    const effectiveCd = getEffectiveTowerCooldown(card.type, levelConfig.rules);
                    const cd = hud.cooldowns[card.type] ?? 0;
                    const affordable = hud.energy >= effectiveCost;
                    const ready = affordable && cd <= 0;
                    const selected = selectedTool === card.type;
                    const cdPercent = Math.min(100, (cd / Math.max(0.1, effectiveCd)) * 100);

                    return (
                      <button
                        type="button"
                        key={card.type}
                        onClick={() => setSelectedTool(selected ? null : card.type)}
                        title={card.description}
                        className={`relative flex min-w-[96px] flex-col justify-between overflow-hidden rounded-lg border px-2 py-1 text-left transition-colors ${
                          selected
                            ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/70'
                            : ready
                            ? 'border-slate-700 bg-[#1A222D] hover:border-slate-500'
                            : 'border-slate-800 bg-[#12171E] opacity-55'
                        }`}
                      >
                        {cd > 0 && (
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/75"
                            style={{ height: `${cdPercent}%` }}
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between gap-1.5">
                          <span className="truncate text-[11px] font-bold text-slate-100">
                            {card.name}
                          </span>
                          <span className="font-mono-num text-[10px] text-slate-400">
                            {shortcut}
                          </span>
                        </div>
                        <div className="relative z-10 mt-0.5 flex items-center justify-between gap-1.5">
                          <span className="truncate text-[10px] text-slate-400">
                            {card.roleLabel}
                          </span>
                          <span
                            className={`font-mono-num text-[11px] font-bold ${
                              affordable ? 'text-amber-400' : 'text-red-400'
                            }`}
                          >
                            {cd > 0 ? `${cd.toFixed(1)}s` : effectiveCost}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {estructuraCards.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <div className="flex flex-wrap gap-1.5">
                  {estructuraCards.map((card) => {
                    keyCounter += 1;
                    const shortcut = keyCounter === 10 ? 0 : keyCounter;
                    const effectiveCost = getEffectiveTowerCost(
                      card.type,
                      levelConfig.rules,
                      simRef.current
                    );
                    const effectiveCd = getEffectiveTowerCooldown(card.type, levelConfig.rules);
                    const cd = hud.cooldowns[card.type] ?? 0;
                    const affordable = hud.energy >= effectiveCost;
                    const ready = affordable && cd <= 0;
                    const selected = selectedTool === card.type;
                    const cdPercent = Math.min(100, (cd / Math.max(0.1, effectiveCd)) * 100);

                    return (
                      <button
                        type="button"
                        key={card.type}
                        onClick={() => setSelectedTool(selected ? null : card.type)}
                        title={card.description}
                        className={`relative flex min-w-[96px] flex-col justify-between overflow-hidden rounded-lg border px-2 py-1 text-left transition-colors ${
                          selected
                            ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/70'
                            : ready
                            ? 'border-slate-700 bg-[#1A222D] hover:border-slate-500'
                            : 'border-slate-800 bg-[#12171E] opacity-55'
                        }`}
                      >
                        {cd > 0 && (
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/75"
                            style={{ height: `${cdPercent}%` }}
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between gap-1.5">
                          <span className="truncate text-[11px] font-bold text-slate-100">
                            {card.name}
                          </span>
                          <span className="font-mono-num text-[10px] text-slate-400">
                            {shortcut}
                          </span>
                        </div>
                        <div className="relative z-10 mt-0.5 flex items-center justify-between gap-1.5">
                          <span className="truncate text-[10px] text-slate-400">
                            {card.roleLabel}
                          </span>
                          <span
                            className={`font-mono-num text-[11px] font-bold ${
                              affordable ? 'text-amber-400' : 'text-red-400'
                            }`}
                          >
                            {cd > 0 ? `${cd.toFixed(1)}s` : effectiveCost}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedTool(selectedTool === 'remove' ? null : 'remove')}
            title="Retirar unidad desplegada (reembolsa 25% de energía). Tecla X."
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              selectedTool === 'remove'
                ? 'border-red-500 bg-red-500/20 text-red-200 ring-1 ring-red-400/70'
                : 'border-slate-700 bg-[#1A222D] text-slate-300 hover:border-red-500/60 hover:text-white'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
            <span>Retirar (X)</span>
          </button>
        </section>

        {/* Alert / Enemy Roster Strip */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 text-xs">
          <p className="font-medium text-amber-300">
            {hud.announcement ||
              `Recoge las celdas de energía (+${GAME_CONFIG.gameplay.energyDropAmount}) y defiende las ${levelConfig.gridRows} filas del Sector (${levelConfig.gridCols}x${levelConfig.gridRows}).`}
          </p>
          <span className="font-mono-num text-slate-400">
            {levelConfig.victoryCondition?.mode === 'endless' && hud.endlessCycle > 0
              ? `Ciclo ${hud.endlessCycle + 1} · `
              : ''}
            SCP del nivel: {levelEnemyCodes}
          </span>
        </div>

        {/* Live Level Objectives Tracker */}
        {hud.objectives.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-1">
            {hud.objectives.map((obj) => {
              const isDone = obj.status === 'completed';
              const isFail = obj.status === 'failed';
              const isConstraint =
                obj.category === 'fail_condition' || Boolean(obj.def.failOnViolate);
              return (
                <div
                  key={obj.def.id}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] ${
                    isFail
                      ? 'border-red-500/60 bg-red-950/50 text-red-200'
                      : isDone
                      ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200'
                      : isConstraint
                      ? 'border-amber-500/40 bg-[#141A22] text-slate-200'
                      : 'border-slate-700 bg-[#141A22] text-slate-200'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : isFail ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  ) : isConstraint ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Target className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  )}
                  <span className="font-medium">{obj.def.title ?? obj.def.description}</span>
                  {obj.progressText && (
                    <span className="font-mono-num font-bold text-amber-300">
                      {obj.progressText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fullscreen-Scaled Canvas Container */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              className="relative max-h-full max-w-full overflow-hidden rounded-xl border border-slate-800 bg-[#0B0F14] shadow-2xl"
              style={{
                aspectRatio: `${canvasWidth} / ${canvasHeight}`,
                ...(hudTheme?.canvasBorderColor
                  ? { borderColor: hudTheme.canvasBorderColor }
                  : {}),
              }}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                onMouseMove={handleCanvasMove}
                onMouseLeave={() => setHoverCell(null)}
                onClick={handleCanvasClick}
                className="block h-full w-full cursor-crosshair select-none"
              />

              {/* Gran Horda con Bandera Announcement Banner */}
              {hud.flagBanner && (
                <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
                  <div className="flex items-center gap-2.5 rounded-lg border border-red-500/80 bg-red-950/90 px-5 py-2 shadow-xl">
                    <Flag className="h-4 w-4 fill-red-400 text-red-400" />
                    <span className="font-display text-lg font-bold tracking-wide text-red-100">
                      {hud.flagBanner}
                    </span>
                  </div>
                </div>
              )}

              {/* Custom Scripted Event Banner */}
              {hud.customBanner && !hud.flagBanner && (
                <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
                  <div
                    className={`flex items-center gap-2.5 rounded-lg border px-5 py-2 shadow-xl ${
                      hud.customBanner.style === 'danger' || hud.customBanner.style === 'horde'
                        ? 'border-red-500/80 bg-red-950/90 text-red-100'
                        : hud.customBanner.style === 'warning'
                        ? 'border-amber-500/80 bg-amber-950/90 text-amber-100'
                        : 'border-sky-500/80 bg-slate-900/90 text-sky-100'
                    }`}
                    style={{
                      ...(hud.customBanner.borderColor
                        ? { borderColor: hud.customBanner.borderColor }
                        : {}),
                      ...(hud.customBanner.color ? { color: hud.customBanner.color } : {}),
                    }}
                  >
                    <span className="font-display text-lg font-bold tracking-wide">
                      {hud.customBanner.text}
                    </span>
                  </div>
                </div>
              )}

              {/* Visual Novel Dialogue Overlay */}
              {activeDialogue && !dossierOpen && (
                <DialogueOverlay
                  dialogue={activeDialogue.def}
                  onComplete={handleDialogueComplete}
                  onLineTrigger={handleDialogueLineTrigger}
                />
              )}

              {/* Pause Overlay */}
              {gameState === 'PAUSED' && !dossierOpen && !activeDialogue && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-xs">
                  <div className="rounded-xl border border-slate-700 bg-[#141A22] px-8 py-6 text-center shadow-2xl">
                    <h2 className="font-display text-3xl font-bold text-white">Partida en Pausa</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Nivel {levelConfig.level} · {hud.kills} SCP contenidos
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setGameState('PLAYING')}
                        className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
                      >
                        Reanudar
                      </button>
                      <button
                        type="button"
                        onClick={handleRestart}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                      >
                        Reiniciar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Victory / Game Over Modal */}
              {(gameState === 'VICTORY' || gameState === 'GAME_OVER') && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
                  <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#141A22] p-7 text-center shadow-2xl">
                    <p
                      className={`text-xs font-bold tracking-wider ${
                        gameState === 'VICTORY' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {gameState === 'VICTORY' ? 'Contención Restablecida' : 'Brecha en el Perímetro'}
                    </p>
                    <h2 className="font-display mt-2 text-4xl font-bold text-white">
                      {gameState === 'VICTORY'
                        ? levelConfig.victoryCondition?.victoryTitle ??
                          `Nivel ${levelConfig.level} Completado`
                        : 'Sitio-19 Comprometido'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      {gameState === 'VICTORY'
                        ? levelConfig.victoryCondition?.victorySubtitle ??
                          (levelConfig.rewardLabel || 'Sector asegurado sin brechas.')
                        : hud.defeatReason ||
                          'Un SCP cruzó una fila sin puerta Tesla de emergencia disponible.'}
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-800 py-4 text-center">
                      <div>
                        <div className="font-mono-num text-xl font-bold text-white">
                          {levelConfig.level}/{LEVEL_CATALOG.length}
                        </div>
                        <div className="text-xs text-slate-400">Nivel</div>
                      </div>
                      <div>
                        <div className="font-mono-num text-xl font-bold text-white">{hud.kills}</div>
                        <div className="text-xs text-slate-400">SCP Contenidos</div>
                      </div>
                      <div>
                        <div className="font-mono-num text-xl font-bold text-white">
                          {hud.towersDeployed}
                        </div>
                        <div className="text-xs text-slate-400">Despliegues</div>
                      </div>
                    </div>

                    {hud.objectives.length > 0 && (
                      <div className="mt-4 max-h-32 space-y-1.5 overflow-y-auto rounded-lg border border-slate-800 bg-[#0E1217] p-3 text-left text-xs">
                        {hud.objectives.map((obj) => (
                          <div key={obj.def.id} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-200">
                              {obj.status === 'completed' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                              )}
                              <span>{obj.def.description}</span>
                            </span>
                            <span
                              className={`font-mono-num shrink-0 font-bold ${
                                obj.status === 'completed' ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {obj.status === 'completed' ? 'OK' : 'FALLO'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      {gameState === 'VICTORY' && hasNextLevel && (
                        <button
                          type="button"
                          onClick={onSelectNextLevel}
                          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold whitespace-nowrap text-slate-950 transition-colors hover:bg-amber-400"
                        >
                          Siguiente Nivel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRestart}
                        className={`rounded-lg px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
                          gameState === 'VICTORY' && hasNextLevel
                            ? 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
                            : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        }`}
                      >
                        Jugar de Nuevo
                      </button>
                      <button
                        type="button"
                        onClick={onBackToMenu}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-slate-200 transition-colors hover:bg-slate-700"
                      >
                        Niveles
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom-Right Progress Bar with Flag Hordes */}
        <div className="flex shrink-0 items-center justify-between gap-4 pt-0.5">
          <div className="hidden text-[11px] text-slate-500 md:block">
            Mazo activo: {deckDefs.length} unidades · SCP-966 (3x3) · SCP-066 (5x5 / Radio)
          </div>

          <div
            className="ml-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-slate-800 bg-[#141A22] px-4 py-2 shadow-lg"
            style={{
              ...(hudTheme?.panelBg ? { backgroundColor: hudTheme.panelBg } : {}),
              ...(hudTheme?.panelBorder ? { borderColor: hudTheme.panelBorder } : {}),
            }}
          >
            <div className="shrink-0 text-right">
              <div className="text-[11px] font-semibold text-slate-300">
                {levelConfig.victoryCondition?.label ??
                  (levelConfig.victoryCondition?.mode === 'survive_time'
                    ? 'Supervivencia'
                    : levelConfig.victoryCondition?.mode === 'kill_count'
                    ? 'Eliminaciones'
                    : levelConfig.victoryCondition?.mode === 'survive_and_kill'
                    ? 'Supervivencia + Bajas'
                    : levelConfig.victoryCondition?.mode === 'destroy_obstacles'
                    ? 'Despejar Obstáculos'
                    : levelConfig.victoryCondition?.mode === 'boss_hunt'
                    ? 'Objetivo Prioritario'
                    : levelConfig.victoryCondition?.mode === 'objectives_only'
                    ? 'Objetivos'
                    : levelConfig.victoryCondition?.mode === 'endless'
                    ? `Ciclo ${hud.endlessCycle + 1}`
                    : 'Progreso')}
              </div>
              <div className="font-mono-num text-xs font-bold text-amber-400">
                {Math.round(hud.progress * 100)}%
              </div>
            </div>

            <div className="relative h-3.5 flex-1 rounded-full border border-slate-700 bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-[width] duration-150"
                style={{ width: `${Math.round(hud.progress * 100)}%` }}
              />

              {levelConfig.flagMarkers.map((marker, idx) => {
                const reached = hud.progress >= marker;
                return (
                  <div
                    key={idx}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${marker * 100}%` }}
                    title={`Gran Horda ${idx + 1}`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        reached
                          ? 'border-red-400 bg-red-600 text-white'
                          : 'border-slate-600 bg-slate-800 text-red-400'
                      }`}
                    >
                      <Flag className="h-3 w-3 fill-current" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
