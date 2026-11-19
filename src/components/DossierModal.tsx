import { Play, SlidersHorizontal, Sparkles, User, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  CHARACTERS_CATALOG,
  DIALOGUES_CATALOG,
  EFFECTS_CATALOG,
  ENEMY_CATALOG,
  EVENTS_CATALOG,
  GRID_COLS,
  GRID_ROWS,
  OBJECTIVES_CATALOG,
  PARTICLES_CATALOG,
  TOWER_CATALOG,
} from '../data/scpCatalog';
import { EffectJsonEditor } from './EffectJsonEditor';
import { ParticleSystem, ParticleSystemHandle } from './ParticleSystem';

interface DossierModalProps {
  onClose: () => void;
}

export function DossierModal({ onClose }: DossierModalProps) {
  const [tab, setTab] = useState<
    | 'enemies'
    | 'towers'
    | 'effects'
    | 'objectives'
    | 'particles'
    | 'events'
    | 'characters'
    | 'dialogues'
  >('enemies');
  const [effectEditorOpen, setEffectEditorOpen] = useState(false);
  const [brokenCharPortraits, setBrokenCharPortraits] = useState<Record<string, boolean>>({});

  const personalTowers = TOWER_CATALOG.filter((t) => t.category === 'personal');
  const estructuraTowers = TOWER_CATALOG.filter((t) => t.category === 'estructura');
  const effectsList = Object.values(EFFECTS_CATALOG).filter((fx) => !fx.isTemplate);
  const objectivesList = Object.values(OBJECTIVES_CATALOG);
  const particlesList = Object.values(PARTICLES_CATALOG);
  const eventsList = Object.values(EVENTS_CATALOG);
  const charactersList = Object.values(CHARACTERS_CATALOG);
  const dialoguesList = Object.values(DIALOGUES_CATALOG);

  const [selectedParticleId, setSelectedParticleId] = useState<string>(
    particlesList[0]?.id ?? 'explosion_grenade'
  );
  const [particleLoop, setParticleLoop] = useState(true);
  const particlePreviewRef = useRef<ParticleSystemHandle | null>(null);
  const selectedParticlePreset =
    PARTICLES_CATALOG[selectedParticleId] ?? particlesList[0] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Archivo Táctico SCP"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-[#141A22] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wide text-slate-100">
              Archivo Táctico de Contención
            </h2>
            <p className="text-xs text-slate-400">
              Tablero {GRID_COLS}x{GRID_ROWS} · {TOWER_CATALOG.length} Torres (Personal y Estructuras) ·{' '}
              {ENEMY_CATALOG.length} Entidades SCP
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-400"
            aria-label="Cerrar archivo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-6 py-3">
          <button
            onClick={() => setTab('enemies')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'enemies'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Amenazas SCP ({ENEMY_CATALOG.length})
          </button>
          <button
            onClick={() => setTab('towers')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'towers'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Personal y Estructuras ({TOWER_CATALOG.length})
          </button>
          <button
            onClick={() => setTab('effects')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'effects'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Efectos ({effectsList.length})
          </button>
          <button
            onClick={() => setTab('objectives')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'objectives'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Objetivos ({objectivesList.length})
          </button>
          <button
            onClick={() => setTab('particles')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'particles'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Partículas ({particlesList.length})
          </button>
          <button
            onClick={() => setTab('events')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'events'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Eventos ({eventsList.length})
          </button>
          <button
            onClick={() => setTab('characters')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'characters'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Personajes ({charactersList.length})
          </button>
          <button
            onClick={() => setTab('dialogues')}
            className={`rounded-md px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === 'dialogues'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Diálogos ({dialoguesList.length})
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {tab === 'enemies' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ENEMY_CATALOG.map((enemy) => {
                const traits: string[] = [];
                if (enemy.behavior?.initialShieldHp) {
                  traits.push(`Escudo ${enemy.behavior.initialShieldHp}`);
                }
                if (enemy.behavior?.damageReduction) {
                  traits.push(`Armadura ${Math.round(enemy.behavior.damageReduction * 100)}%`);
                }
                if (enemy.behavior?.regenHpPerSec) {
                  traits.push(`Regen ${enemy.behavior.regenHpPerSec}/s`);
                }
                if (enemy.behavior?.untargetableUntilCol !== undefined) {
                  traits.push(`Sigilo col > ${enemy.behavior.untargetableUntilCol}`);
                }
                if (enemy.behavior?.rangedAttack) {
                  traits.push(`Distancia ${enemy.behavior.rangedAttack.rangeCols}c`);
                }
                if (enemy.behavior?.onDeathSplit) {
                  traits.push(`Divide x${enemy.behavior.onDeathSplit.count}`);
                }
                if (enemy.behavior?.onDeathExplosion) {
                  traits.push(`Explota ${enemy.behavior.onDeathExplosion.damage} dmg`);
                }

                return (
                  <article
                    key={enemy.type}
                    className="flex gap-4 rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                      <img
                        src={enemy.portrait}
                        alt={`${enemy.code} ${enemy.name}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-bold text-slate-100">
                        {enemy.code} · {enemy.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-amber-400/90 tabular-nums">
                        {enemy.classification} · Salud {enemy.hp} · Vel {enemy.speed} · Daño {enemy.dps}/s
                      </p>
                      {traits.length > 0 && (
                        <p className="font-mono-num mt-1 text-[11px] text-sky-300">
                          {traits.join(' · ')}
                        </p>
                      )}
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">{enemy.summary}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        <strong className="font-semibold text-slate-200">Táctica:</strong>{' '}
                        {enemy.tacticalNote}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {tab === 'towers' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold tracking-wide text-slate-200">
                  Personal de Contención ({personalTowers.length})
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {personalTowers.map((tower) => {
                    const stats: string[] = [
                      tower.roleLabel,
                      `Salud ${tower.maxHp}`,
                      tower.unlockLevel === 0 ? 'Inicial' : `Nivel ${tower.unlockLevel}`,
                    ];
                    if (tower.damage) {
                      stats.push(`Daño ${tower.damage}${tower.damageType ? ` (${tower.damageType})` : ''}`);
                    }
                    if (tower.shieldOnDeploy) {
                      stats.push(`Escudo ${tower.shieldOnDeploy}`);
                    }
                    if (tower.pierceCount) {
                      stats.push(`Perfora ${tower.pierceCount}`);
                    }
                    if (tower.chainBounceCount) {
                      stats.push(`Cadena x${tower.chainBounceCount}`);
                    }

                    return (
                      <div
                        key={tower.type}
                        className="rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-semibold text-slate-100">{tower.name}</h4>
                          <span className="font-mono-num text-xs font-semibold text-amber-400">
                            {tower.cost} Energía
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 tabular-nums">
                          {stats.join(' · ')}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {tower.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold tracking-wide text-slate-200">
                  Estructuras Defensivas ({estructuraTowers.length})
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {estructuraTowers.map((tower) => {
                    const stats: string[] = [
                      tower.roleLabel,
                      `Salud ${tower.maxHp}`,
                      tower.unlockLevel === 0 ? 'Inicial' : `Nivel ${tower.unlockLevel}`,
                    ];
                    if (tower.damage) {
                      stats.push(`Daño ${tower.damage}${tower.damageType ? ` (${tower.damageType})` : ''}`);
                    }
                    if (tower.shieldOnDeploy) {
                      stats.push(`Escudo ${tower.shieldOnDeploy}`);
                    }
                    if (tower.thornsDps) {
                      stats.push(`Espinas ${tower.thornsDps}/s`);
                    }
                    if (tower.energyAmount) {
                      stats.push(`+${tower.energyAmount} Energía`);
                    }

                    return (
                      <div
                        key={tower.type}
                        className="rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-semibold text-slate-100">{tower.name}</h4>
                          <span className="font-mono-num text-xs font-semibold text-amber-400">
                            {tower.cost} Energía
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 tabular-nums">
                          {stats.join(' · ')}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {tower.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'effects' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#1A212B] px-4 py-2.5">
                <p className="text-xs text-slate-300">
                  {effectEditorOpen
                    ? 'Configura cualquier efecto declarativo nuevo y copia el JSON listo para src/data/json/effects/.'
                    : 'Todos los efectos cargados desde src/data/json/effects/ y effects.json.'}
                </p>
                <button
                  type="button"
                  onClick={() => setEffectEditorOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                    effectEditorOpen
                      ? 'border-amber-500 bg-amber-500 text-slate-950'
                      : 'border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {effectEditorOpen ? 'Ver Catálogo de Efectos' : 'Editor / Constructor JSON'}
                </button>
              </div>

              {effectEditorOpen ? (
                <EffectJsonEditor />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {effectsList.map((fx) => (
                    <div
                      key={fx.id}
                      className="rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="truncate font-semibold text-slate-100">{fx.name}</h4>
                          <p className="font-mono-num text-[10px] text-slate-400">
                            id: {fx.id}
                            {fx.category ? ` · ${fx.category}` : ''}
                            {fx.trigger ? ` · ${fx.trigger}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {fx.badgeLabel && (
                            <span
                              className="font-mono-num rounded border px-1.5 py-0.5 text-[10px] font-bold"
                              style={{
                                borderColor: fx.color,
                                color: fx.color,
                                backgroundColor: '#0E1217',
                              }}
                            >
                              {fx.badgeLabel}
                            </span>
                          )}
                          <span
                            className="h-3 w-3 shrink-0 rounded-xs"
                            style={{ backgroundColor: fx.color }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">{fx.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'particles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[440px_minmax(0,1fr)]">
                {/* Interactive ParticleSystem Preview Stage */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#0E1217] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-100">
                        <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                        {selectedParticlePreset?.name ?? selectedParticleId}
                      </h3>
                      <p className="font-mono-num truncate text-[11px] text-slate-400">
                        id: {selectedParticleId}
                        {selectedParticlePreset?.category
                          ? ` · ${selectedParticlePreset.category}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        particlePreviewRef.current?.emitPreset(selectedParticleId, 1, 2)
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Emitir Ahora
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#080B0F]">
                    <ParticleSystem
                      ref={particlePreviewRef}
                      width={400}
                      height={240}
                      cellSize={80}
                      gridRows={3}
                      gridCols={5}
                      autoLoopPresetId={particleLoop ? selectedParticleId : undefined}
                      autoLoopIntervalSec={1.35}
                      autoLoopRow={1}
                      autoLoopCol={2}
                      interactive
                      showGridGuides
                      className="block h-auto w-full cursor-crosshair"
                      ariaLabel="Vista previa interactiva del sistema de partículas"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span>Haz clic en cualquier celda del visor para emitir allí.</span>
                    <button
                      type="button"
                      onClick={() => setParticleLoop((prev) => !prev)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        particleLoop
                          ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300'
                      }`}
                    >
                      Bucle automático: {particleLoop ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {selectedParticlePreset?.description && (
                    <p className="rounded-lg border border-slate-800 bg-[#141A22] px-3 py-2 text-xs text-slate-300">
                      {selectedParticlePreset.description}
                    </p>
                  )}
                </div>

                {/* Preset Catalog Grid */}
                <div className="grid max-h-[390px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {particlesList.map((preset) => {
                    const isSelected = preset.id === selectedParticleId;
                    const paletteColors = Array.from(
                      new Set(preset.emitters.flatMap((em) => em.colors))
                    ).slice(0, 6);

                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => {
                          setSelectedParticleId(preset.id);
                          particlePreviewRef.current?.emitPreset(preset.id, 1, 2);
                        }}
                        className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/12'
                            : 'border-slate-800 bg-[#1A212B] hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-slate-100">
                              {preset.name ?? preset.id}
                            </span>
                            <span className="font-mono-num shrink-0 text-[10px] text-amber-400">
                              {preset.emitters.length} em.
                            </span>
                          </div>
                          <p className="font-mono-num mt-0.5 truncate text-[10px] text-slate-400">
                            {preset.id}
                            {preset.category ? ` · ${preset.category}` : ''}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {paletteColors.map((col, idx) => (
                            <span
                              key={`${preset.id}-c-${idx}`}
                              className="h-2.5 w-2.5 rounded-xs border border-black/40"
                              style={{ backgroundColor: col }}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-4">
              {eventsList.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-6 text-center">
                  <p className="text-sm font-semibold text-slate-200">
                    No hay eventos personalizados definidos todavía
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Edita <code className="text-amber-300">src/data/json/events.json</code> para definir eventos con lógica y visuales reutilizables desde <code className="text-amber-300">levels.json</code>. Consulta <code className="text-amber-300">JSON_DOCUMENTATION.md</code> para ver los ejemplos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {eventsList.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate font-semibold text-slate-100">
                          {ev.name ?? ev.id}
                        </h4>
                        <span className="font-mono-num text-[11px] font-semibold text-amber-400">
                          {ev.trigger ?? 'manual'}
                        </span>
                      </div>
                      <p className="font-mono-num mt-0.5 text-[10px] text-slate-400">
                        id: {ev.id}
                      </p>
                      {ev.description && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'characters' && (
            <div className="space-y-4">
              {charactersList.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-6 text-center">
                  <p className="text-sm font-semibold text-slate-200">
                    No hay personajes definidos todavía
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Añade personajes en <code className="text-amber-300">src/data/json/characters.json</code> con retratos PNG y múltiples expresiones (<code className="text-amber-300">expressions</code>). Consulta <code className="text-amber-300">JSON_DOCUMENTATION.md</code>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {charactersList.map((ch) => {
                    const exprKeys = Object.keys(ch.expressions ?? {});
                    const previewSrc =
                      ch.expressions?.[ch.defaultExpression ?? 'neutral'] ?? ch.defaultPortrait;
                    return (
                      <article
                        key={ch.id}
                        className="flex gap-4 rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                      >
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                          {previewSrc && !brokenCharPortraits[ch.id] ? (
                            <img
                              src={previewSrc}
                              alt={ch.name}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setBrokenCharPortraits((prev) => ({ ...prev, [ch.id]: true }))
                              }
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <User className="h-8 w-8 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            className="font-display text-lg font-bold"
                            style={{ color: ch.accentColor ?? '#F8FAFC' }}
                          >
                            {ch.name}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {[ch.title ?? ch.role, ch.faction].filter(Boolean).join(' · ') || `id: ${ch.id}`}
                          </p>
                          {ch.description && (
                            <p className="mt-1.5 text-xs text-slate-300">{ch.description}</p>
                          )}
                          {exprKeys.length > 0 && (
                            <p className="mt-1.5 text-[11px] text-amber-300/90">
                              Expresiones: {exprKeys.join(' · ')}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'dialogues' && (
            <div className="space-y-4">
              {dialoguesList.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-6 text-center">
                  <p className="text-sm font-semibold text-slate-200">
                    No hay diálogos definidos todavía
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Define conversaciones en <code className="text-amber-300">src/data/json/dialogues.json</code> o usa <code className="text-amber-300">inlineDialogues</code> en <code className="text-amber-300">levels.json</code> y eventos. Consulta <code className="text-amber-300">JSON_DOCUMENTATION.md</code>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {dialoguesList.map((dlg) => (
                    <div
                      key={dlg.id}
                      className="rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate font-semibold text-slate-100">
                          {dlg.title ?? dlg.id}
                        </h4>
                        <span className="font-mono-num text-[11px] font-semibold text-amber-400">
                          {dlg.lines.length} líneas
                        </span>
                      </div>
                      <p className="font-mono-num mt-0.5 text-[10px] text-slate-400">
                        id: {dlg.id}
                      </p>
                      {dlg.description && (
                        <p className="mt-2 text-xs text-slate-300">{dlg.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'objectives' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-800 bg-[#1A212B] px-4 py-2.5 text-xs text-slate-300">
                Presets cargados desde <code className="text-amber-300">src/data/json/objectives/</code> y{' '}
                <code className="text-amber-300">objectives.json</code> /{' '}
                <code className="text-amber-300">objetives.json</code>. Úsalos por ID o inline en{' '}
                <code className="text-amber-300">levels/&lt;n&gt;.json</code>.
              </div>
              {objectivesList.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-[#1A212B] p-6 text-center text-sm text-slate-300">
                  No hay presets de objetivos registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {objectivesList.map((obj) => {
                    const metaParts: string[] = [
                      `kind: ${obj.kind}`,
                      obj.category ?? (obj.failOnViolate ? 'fail_condition' : 'secondary'),
                    ];
                    if (obj.col !== undefined) metaParts.push(`col <= ${obj.col}`);
                    if (obj.targetCount !== undefined) metaParts.push(`meta: ${obj.targetCount}`);
                    if (obj.maxCount !== undefined) metaParts.push(`máx: ${obj.maxCount}`);
                    if (obj.minEnergy !== undefined) metaParts.push(`minEN: ${obj.minEnergy}`);
                    if (obj.rewardEnergy) metaParts.push(`+${obj.rewardEnergy} EN`);

                    return (
                      <div
                        key={obj.id}
                        className="rounded-lg border border-slate-800 bg-[#1A212B] p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate font-semibold text-slate-100">
                            {obj.title ?? obj.id}
                          </h4>
                          <span
                            className="font-mono-num shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              borderColor: obj.color ?? '#F59E0B',
                              color: obj.color ?? '#F59E0B',
                              backgroundColor: '#0E1217',
                            }}
                          >
                            {obj.failOnViolate || obj.category === 'fail_condition'
                              ? 'RESTRICCIÓN'
                              : obj.category === 'primary' || obj.requiredForVictory
                              ? 'PRIMARIO'
                              : obj.category === 'bonus'
                              ? 'BONUS'
                              : 'SECUNDARIO'}
                          </span>
                        </div>
                        <p className="font-mono-num mt-0.5 text-[10px] text-slate-400">
                          id: {obj.id} · {metaParts.join(' · ')}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {obj.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-800 px-6 py-3">
          <button
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
