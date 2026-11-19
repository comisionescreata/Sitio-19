import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  ParticleEmitMeta,
  ParticleEmitOptions,
  ParticleSystem as ParticleEngine,
  renderParticleSystem,
} from '../engine/particleSystem';
import { ParticleEmitterConfig, ParticlePresetDefinition } from '../types/game';

export interface ParticleEmitRequest {
  id: string | number;
  presetId: string;
  row: number;
  col: number;
  angleOffsetDeg?: number;
  scale?: number;
  colorOverride?: string;
}

export interface ParticleSystemHandle {
  emitPreset: (
    presetOrId: string | ParticlePresetDefinition,
    row: number,
    col: number,
    opts?: ParticleEmitOptions
  ) => ParticleEmitMeta | null;
  emitCustom: (
    emitter: ParticleEmitterConfig,
    row: number,
    col: number,
    opts?: ParticleEmitOptions
  ) => void;
  clear: () => void;
  getActiveCount: () => number;
}

interface ParticleSystemProps {
  width: number;
  height: number;
  cellSize?: number;
  gateWidth?: number;
  padTop?: number;
  maxParticles?: number;
  paused?: boolean;
  emitRequests?: ParticleEmitRequest[];
  autoLoopPresetId?: string;
  autoLoopIntervalSec?: number;
  autoLoopRow?: number;
  autoLoopCol?: number;
  interactive?: boolean;
  showGridGuides?: boolean;
  gridRows?: number;
  gridCols?: number;
  onCanvasClickCell?: (row: number, col: number) => void;
  className?: string;
  ariaLabel?: string;
}

const spriteCache = new Map<string, { img: HTMLImageElement; ok: boolean }>();

function resolveSpriteImage(src?: string): HTMLImageElement | null {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  let entry = spriteCache.get(trimmed);
  if (!entry) {
    const img = new Image();
    const record = { img, ok: false };
    img.onload = () => {
      record.ok = img.naturalWidth > 0;
    };
    img.onerror = () => {
      record.ok = false;
    };
    img.src = trimmed;
    spriteCache.set(trimmed, record);
    entry = record;
  }
  return entry.ok && entry.img.complete ? entry.img : null;
}

export const ParticleSystem = forwardRef<ParticleSystemHandle, ParticleSystemProps>(
  function ParticleSystem(
    {
      width,
      height,
      cellSize = 84,
      gateWidth = 0,
      padTop = 0,
      maxParticles = 400,
      paused = false,
      emitRequests,
      autoLoopPresetId,
      autoLoopIntervalSec = 1.15,
      autoLoopRow = 1,
      autoLoopCol = 2,
      interactive = false,
      showGridGuides = false,
      gridRows = 3,
      gridCols = 5,
      onCanvasClickCell,
      className = '',
      ariaLabel = 'Escenario de partículas',
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<ParticleEngine>(new ParticleEngine(maxParticles));
    const processedReqIdsRef = useRef<Set<string | number>>(new Set());

    useEffect(() => {
      engineRef.current.maxParticles = maxParticles;
    }, [maxParticles]);

    useImperativeHandle(
      ref,
      () => ({
        emitPreset(presetOrId, row, col, opts) {
          return engineRef.current.emitPreset(presetOrId, row, col, {
            cellSize,
            ...opts,
          });
        },
        emitCustom(emitter, row, col, opts) {
          engineRef.current.emitEmitter(emitter, row, col, {
            cellSize,
            ...opts,
          });
        },
        clear() {
          engineRef.current.clear();
        },
        getActiveCount() {
          return engineRef.current.particles.length;
        },
      }),
      [cellSize]
    );

    useEffect(() => {
      if (!emitRequests || emitRequests.length === 0) return;
      for (const req of emitRequests) {
        if (processedReqIdsRef.current.has(req.id)) continue;
        processedReqIdsRef.current.add(req.id);
        engineRef.current.emitPreset(req.presetId, req.row, req.col, {
          cellSize,
          angleOffsetDeg: req.angleOffsetDeg,
          scale: req.scale,
          colorOverride: req.colorOverride,
        });
      }
      if (processedReqIdsRef.current.size > 300) {
        const keep = new Set(emitRequests.map((r) => r.id));
        processedReqIdsRef.current = keep;
      }
    }, [emitRequests, cellSize]);

    useEffect(() => {
      if (!autoLoopPresetId || paused) return;
      engineRef.current.clear();
      engineRef.current.emitPreset(autoLoopPresetId, autoLoopRow, autoLoopCol, { cellSize });
      const timer = window.setInterval(() => {
        engineRef.current.emitPreset(autoLoopPresetId, autoLoopRow, autoLoopCol, { cellSize });
      }, Math.max(250, autoLoopIntervalSec * 1000));
      return () => window.clearInterval(timer);
    }, [autoLoopPresetId, autoLoopIntervalSec, autoLoopRow, autoLoopCol, cellSize, paused]);

    useEffect(() => {
      let rafId = 0;
      let last = performance.now();

      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;

        if (!paused) {
          engineRef.current.step(dt, cellSize);
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width, height);

            if (showGridGuides) {
              ctx.save();
              ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
              ctx.lineWidth = 1;
              for (let r = 0; r < gridRows; r++) {
                for (let c = 0; c < gridCols; c++) {
                  const gx = gateWidth + c * cellSize;
                  const gy = padTop + r * cellSize;
                  ctx.strokeRect(gx + 0.5, gy + 0.5, cellSize - 1, cellSize - 1);
                }
              }
              ctx.restore();
            }

            renderParticleSystem(
              ctx,
              engineRef.current,
              { gateWidth, padTop, cellSize },
              resolveSpriteImage
            );
          }
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, [width, height, cellSize, gateWidth, padTop, paused, showGridGuides, gridRows, gridCols]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * width;
      const py = ((e.clientY - rect.top) / rect.height) * height;
      const col = (px - gateWidth) / cellSize - 0.5;
      const row = (py - padTop) / cellSize - 0.5;
      if (autoLoopPresetId) {
        engineRef.current.emitPreset(autoLoopPresetId, row, col, { cellSize });
      }
      onCanvasClickCell?.(row, col);
    };

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        aria-label={ariaLabel}
        className={`${interactive ? 'cursor-crosshair' : 'pointer-events-none'} ${className}`}
      />
    );
  }
);
