import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  CHARACTERS_CATALOG,
  DIALOGUES_CATALOG,
  EFFECTS_CATALOG,
  ENEMY_CATALOG,
  EVENTS_CATALOG,
  GAME_CONFIG,
  LEVEL_CATALOG,
  OBJECTIVES_CATALOG,
  PARTICLES_CATALOG,
  TOWER_CATALOG,
} from '../data/scpCatalog';

const ADMIN_SECRET = GAME_CONFIG.admin.secret;

interface AdminModalProps {
  isAuthenticated: boolean;
  onAuthenticate: () => void;
  onLogout: () => void;
  freePlayAllUnlocked: boolean;
  onToggleFreePlay: () => void;
  adminUnlockedUpTo: number | null;
  onSetUnlockedUpTo: (levelNumber: number | null) => void;
  adminUnlockAllTowers: boolean;
  onToggleAllTowers: () => void;
  completedLevels: number[];
  onCompleteUpToLevel: (levelNumber: number) => void;
  onCompleteAllLevels: () => void;
  onResetProgress: () => void;
  onJumpToLevel: (levelNumber: number) => void;
  onClose: () => void;
}

export function AdminModal({
  isAuthenticated,
  onAuthenticate,
  onLogout,
  freePlayAllUnlocked,
  onToggleFreePlay,
  adminUnlockedUpTo,
  onSetUnlockedUpTo,
  adminUnlockAllTowers,
  onToggleAllTowers,
  completedLevels,
  onCompleteUpToLevel,
  onCompleteAllLevels,
  onResetProgress,
  onJumpToLevel,
  onClose,
}: AdminModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [targetUnlockLevel, setTargetUnlockLevel] = useState(
    adminUnlockedUpTo ?? Math.min(LEVEL_CATALOG.length, Math.max(1, completedLevels.length + 1))
  );
  const [jumpLevel, setJumpLevel] = useState(1);

  const selectedLevelInfo =
    LEVEL_CATALOG.find((l) => l.level === targetUnlockLevel) ?? LEVEL_CATALOG[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_SECRET) {
      setError('');
      setPassword('');
      onAuthenticate();
    } else {
      setError('Contraseña incorrecta. Acceso denegado.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Panel de Administrador"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#141A22] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wide text-slate-100">
                Panel de Administrador
              </h2>
              <p className="text-xs text-slate-400">
                Control granular de desbloqueos, progreso y acceso directo del Sitio-19
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Cerrar panel de administrador"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {!isAuthenticated ? (
            <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 py-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h3 className="font-display mt-3 text-xl font-bold text-white">
                  Autenticación Requerida
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Introduce la contraseña de administrador para gestionar niveles y desbloqueos.
                </p>
              </div>

              <div>
                <label
                  htmlFor="admin-password-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-300"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Introduce la contraseña..."
                    autoFocus
                    className="w-full rounded-lg border border-slate-700 bg-[#0E1217] py-2.5 pr-10 pl-3.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                >
                  Entrar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Unlock up to chosen level */}
              <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
                      <Layers className="h-4 w-4 text-amber-400" />
                      Desbloqueo Personalizado por Nivel
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Elige hasta qué nivel quieres desbloquear (1 al {LEVEL_CATALOG.length}) sin necesidad de liberar toda la campaña.
                    </p>
                  </div>
                  {adminUnlockedUpTo !== null && !freePlayAllUnlocked && (
                    <span className="font-mono-num rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                      Activo hasta Nv. {adminUnlockedUpTo}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={LEVEL_CATALOG.length}
                    value={targetUnlockLevel}
                    onChange={(e) => setTargetUnlockLevel(Number(e.target.value))}
                    className="h-2 flex-1 min-w-[140px] cursor-pointer accent-amber-500"
                    aria-label="Seleccionar nivel máximo a desbloquear"
                  />
                  <input
                    type="number"
                    min={1}
                    max={LEVEL_CATALOG.length}
                    value={targetUnlockLevel}
                    onChange={(e) =>
                      setTargetUnlockLevel(
                        Math.max(1, Math.min(LEVEL_CATALOG.length, Number(e.target.value) || 1))
                      )
                    }
                    className="font-mono-num w-20 rounded-lg border border-slate-700 bg-[#0E1217] px-2.5 py-1.5 text-center text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {selectedLevelInfo && (
                  <p className="mt-2 text-[11px] text-slate-300">
                    <span className="font-semibold text-amber-300">
                      Nivel {selectedLevelInfo.level}: {selectedLevelInfo.title}
                    </span>
                    {selectedLevelInfo.rewardLabel ? ` · ${selectedLevelInfo.rewardLabel}` : ''}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSetUnlockedUpTo(targetUnlockLevel)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    Desbloquear hasta Nivel {targetUnlockLevel}
                  </button>

                  <button
                    type="button"
                    onClick={() => onCompleteUpToLevel(targetUnlockLevel)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completar Niveles 1–{targetUnlockLevel}
                  </button>

                  {(adminUnlockedUpTo !== null || freePlayAllUnlocked) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (freePlayAllUnlocked) onToggleFreePlay();
                        onSetUnlockedUpTo(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Restaurar bloqueo normal
                    </button>
                  )}
                </div>
              </div>

              {/* Global Toggles & Progress Actions */}
              <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Modo Libre y Desbloqueo Rápido
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Libera los {LEVEL_CATALOG.length} niveles o habilita todas las{' '}
                      {TOWER_CATALOG.length} torres de forma independiente.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onToggleAllTowers}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                        adminUnlockAllTowers || freePlayAllUnlocked
                          ? 'border-sky-400 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      {adminUnlockAllTowers || freePlayAllUnlocked
                        ? 'Todas las Torres: ON'
                        : 'Desbloquear Torres'}
                    </button>

                    <button
                      type="button"
                      onClick={onToggleFreePlay}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                        freePlayAllUnlocked
                          ? 'border-emerald-500 bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'border-amber-500 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                      }`}
                    >
                      {freePlayAllUnlocked ? (
                        <>
                          <Unlock className="h-3.5 w-3.5" />
                          Todo Desbloqueado (Activo)
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Desbloquear Todo
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                  <button
                    type="button"
                    onClick={onCompleteAllLevels}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Marcar {LEVEL_CATALOG.length}/{LEVEL_CATALOG.length} Completados
                  </button>

                  <button
                    type="button"
                    onClick={onResetProgress}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reiniciar Progreso ({completedLevels.length}/{LEVEL_CATALOG.length})
                  </button>
                </div>
              </div>

              {/* Direct Level Launcher */}
              <div className="rounded-xl border border-slate-800 bg-[#1A212B] p-4">
                <h3 className="text-sm font-bold text-white">Salto Directo a Nivel</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Desbloquea hasta el nivel elegido e inicia la partida para probar SCPs, torres o eventos.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={LEVEL_CATALOG.length}
                    value={jumpLevel}
                    onChange={(e) =>
                      setJumpLevel(
                        Math.max(1, Math.min(LEVEL_CATALOG.length, Number(e.target.value) || 1))
                      )
                    }
                    className="font-mono-num w-24 rounded-lg border border-slate-700 bg-[#0E1217] px-3 py-1.5 text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToLevel(jumpLevel);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Ir al Nivel {jumpLevel}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {GAME_CONFIG.admin.quickJumpLevels
                    .filter((lvl) => lvl >= 1 && lvl <= LEVEL_CATALOG.length)
                    .map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => {
                          onJumpToLevel(lvl);
                          onClose();
                        }}
                        className="font-mono-num rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-400 hover:text-amber-300"
                      >
                        Nv. {lvl}
                      </button>
                    ))}
                </div>
              </div>

              {/* JSON Catalog Summary */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {LEVEL_CATALOG.length}
                  </div>
                  <div className="text-[11px] text-slate-400">Niveles JSON</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {TOWER_CATALOG.length}
                  </div>
                  <div className="text-[11px] text-slate-400">Torres JSON</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {ENEMY_CATALOG.length}
                  </div>
                  <div className="text-[11px] text-slate-400">SCP JSON</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {Object.keys(EFFECTS_CATALOG).length}
                  </div>
                  <div className="text-[11px] text-slate-400">Efectos JSON</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {Object.keys(OBJECTIVES_CATALOG).length}
                  </div>
                  <div className="text-[11px] text-slate-400">Objetivos</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {Object.keys(PARTICLES_CATALOG).length}
                  </div>
                  <div className="text-[11px] text-slate-400">Partículas</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {Object.keys(EVENTS_CATALOG).length}
                  </div>
                  <div className="text-[11px] text-slate-400">Eventos JSON</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {Object.keys(CHARACTERS_CATALOG).length}
                  </div>
                  <div className="text-[11px] text-slate-400">Personajes</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-3 text-center">
                  <div className="font-mono-num text-lg font-bold text-white">
                    {Object.keys(DIALOGUES_CATALOG).length}
                  </div>
                  <div className="text-[11px] text-slate-400">Diálogos JSON</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              Cerrar sesión Admin
            </button>
          ) : (
            <span className="text-xs text-slate-500">Acceso restringido Sitio-19</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
