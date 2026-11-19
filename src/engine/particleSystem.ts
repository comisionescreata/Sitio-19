import { PARTICLES_CATALOG } from '../data/scpCatalog';
import {
  ParticleBlendMode,
  ParticleEmitterConfig,
  ParticlePresetDefinition,
  ParticleShape,
} from '../types/game';

export interface SimParticle {
  id: string;
  row: number;
  col: number;
  vxPx: number;
  vyPx: number;
  gravityPx: number;
  drag: number;
  angleRad: number;
  spinRad: number;
  age: number;
  duration: number;
  shape: ParticleShape;
  sprite?: string;
  colorStart: string;
  colorEnd?: string;
  sizePx: number;
  sizeEndScale: number;
  alphaStart: number;
  alphaEnd: number;
  blendMode: ParticleBlendMode;
  glowColor?: string;
  glowBlur: number;
  strokeColor?: string;
  strokeWidth: number;
  ringExpandPx: number;
}

export interface ParticleEmitOptions {
  angleOffsetDeg?: number;
  scale?: number;
  colorOverride?: string;
  cellSize?: number;
}

export interface ParticleEmitMeta {
  screenFlashRgb?: string;
  screenFlashAlpha?: number;
  screenShake?: number;
  sound?: string;
}

interface PendingEmitterBurst {
  delay: number;
  emitter: ParticleEmitterConfig;
  row: number;
  col: number;
  opts?: ParticleEmitOptions;
}

function sampleRange(val: number | [number, number] | undefined, fallback: number): number {
  if (val === undefined) return fallback;
  if (Array.isArray(val)) {
    const min = Math.min(val[0], val[1]);
    const max = Math.max(val[0], val[1]);
    return min + Math.random() * (max - min);
  }
  return val;
}

function parseHexColor(hex: string): [number, number, number] | null {
  const cleaned = hex.trim();
  if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(cleaned)) return null;
  if (cleaned.length === 4) {
    const r = parseInt(cleaned[1] + cleaned[1], 16);
    const g = parseInt(cleaned[2] + cleaned[2], 16);
    const b = parseInt(cleaned[3] + cleaned[3], 16);
    return [r, g, b];
  }
  const r = parseInt(cleaned.slice(1, 3), 16);
  const g = parseInt(cleaned.slice(3, 5), 16);
  const b = parseInt(cleaned.slice(5, 7), 16);
  return [r, g, b];
}

function lerpHexColor(c1: string, c2: string | undefined, t: number): string {
  if (!c2) return c1;
  const a = parseHexColor(c1);
  const b = parseHexColor(c2);
  if (!a || !b) return t < 0.5 ? c1 : c2;
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export class ParticleSystem {
  public particles: SimParticle[] = [];
  public pendingBursts: PendingEmitterBurst[] = [];
  public maxParticles: number;
  private uid = 1;

  constructor(maxParticles = 450) {
    this.maxParticles = maxParticles;
  }

  private nextId(): string {
    return `ps_${this.uid++}`;
  }

  public clear() {
    this.particles = [];
    this.pendingBursts = [];
  }

  public emitPreset(
    presetOrId: string | ParticlePresetDefinition | undefined,
    row: number,
    col: number,
    opts?: ParticleEmitOptions
  ): ParticleEmitMeta | null {
    if (!presetOrId) return null;
    const preset =
      typeof presetOrId === 'string' ? PARTICLES_CATALOG[presetOrId] : presetOrId;
    if (!preset || !Array.isArray(preset.emitters)) return null;

    for (const emitter of preset.emitters) {
      if (emitter.delaySec && emitter.delaySec > 0) {
        this.pendingBursts.push({
          delay: emitter.delaySec,
          emitter,
          row,
          col,
          opts,
        });
      } else {
        this.emitEmitter(emitter, row, col, opts);
      }
    }

    return {
      screenFlashRgb: preset.screenFlashRgb,
      screenFlashAlpha: preset.screenFlashAlpha,
      screenShake: preset.screenShake,
      sound: preset.sound,
    };
  }

  public emitEmitter(
    emitter: ParticleEmitterConfig,
    row: number,
    col: number,
    opts?: ParticleEmitOptions
  ) {
    const cellSize = opts?.cellSize ?? 84;
    const scale = opts?.scale ?? 1;
    const rawCount = Math.round(sampleRange(emitter.count, 8));
    const count = Math.max(1, Math.min(60, rawCount));
    const spreadRad = ((emitter.spreadDeg ?? 360) * Math.PI) / 180;
    const baseAngleRad =
      (((emitter.angleDeg ?? 0) + (opts?.angleOffsetDeg ?? 0)) * Math.PI) / 180;
    const offsetCol = (emitter.offsetX ?? 0) / cellSize;
    const offsetRow = (emitter.offsetY ?? 0) / cellSize;
    const spawnRad = emitter.spawnRadiusPx ?? 0;

    const colors =
      emitter.colors && emitter.colors.length > 0 ? emitter.colors : ['#F59E0B'];

    for (let i = 0; i < count; i++) {
      const jitterAngle = (Math.random() - 0.5) * spreadRad;
      const dirAngle =
        spreadRad >= Math.PI * 1.99
          ? (Math.PI * 2 * i) / count + (Math.random() - 0.5) * (Math.PI * 2 / Math.max(4, count))
          : baseAngleRad + jitterAngle;

      const speed = sampleRange(emitter.speedPx, 65) * scale;
      const dist = spawnRad > 0 ? Math.random() * spawnRad : 0;
      const spawnTheta = Math.random() * Math.PI * 2;
      const pCol = col + offsetCol + (Math.cos(spawnTheta) * dist) / cellSize;
      const pRow = row + offsetRow + (Math.sin(spawnTheta) * dist) / cellSize;

      const colorStart =
        opts?.colorOverride ?? colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        id: this.nextId(),
        row: pRow,
        col: pCol,
        vxPx: Math.cos(dirAngle) * speed,
        vyPx: Math.sin(dirAngle) * speed,
        gravityPx: emitter.gravityPx ?? 0,
        drag: emitter.drag ?? 0,
        angleRad: emitter.shape === 'spark' ? dirAngle : Math.random() * Math.PI * 2,
        spinRad: (sampleRange(emitter.spinDegPerSec, 0) * Math.PI) / 180,
        age: 0,
        duration: Math.max(0.04, sampleRange(emitter.durationSec, 0.4)),
        shape: emitter.shape ?? 'circle',
        sprite: emitter.sprite,
        colorStart,
        colorEnd: emitter.colorEnd,
        sizePx: Math.max(0.8, sampleRange(emitter.sizePx, 3.5) * scale),
        sizeEndScale: emitter.sizeEndScale ?? (emitter.shape === 'smoke' ? 1.8 : 0.2),
        alphaStart: emitter.alphaStart ?? 1,
        alphaEnd: emitter.alphaEnd ?? 0,
        blendMode: emitter.blendMode ?? 'source-over',
        glowColor: emitter.glowColor,
        glowBlur: emitter.glowBlur ?? 0,
        strokeColor: emitter.strokeColor,
        strokeWidth: emitter.strokeWidth ?? 2,
        ringExpandPx: (emitter.ringExpandPx ?? 48) * scale,
      });
    }

    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
  }

  public step(dt: number, cellSize = 84) {
    if (this.pendingBursts.length > 0) {
      const remaining: PendingEmitterBurst[] = [];
      for (const b of this.pendingBursts) {
        b.delay -= dt;
        if (b.delay <= 0) {
          this.emitEmitter(b.emitter, b.row, b.col, b.opts);
        } else {
          remaining.push(b);
        }
      }
      this.pendingBursts = remaining;
    }

    if (this.particles.length === 0) return;

    const alive: SimParticle[] = [];
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.duration) continue;

      if (p.drag > 0) {
        const factor = Math.max(0, 1 - p.drag * dt);
        p.vxPx *= factor;
        p.vyPx *= factor;
      }
      if (p.gravityPx !== 0) {
        p.vyPx += p.gravityPx * dt;
      }

      p.col += (p.vxPx * dt) / cellSize;
      p.row += (p.vyPx * dt) / cellSize;

      if (p.shape === 'spark' && (Math.abs(p.vxPx) > 1 || Math.abs(p.vyPx) > 1)) {
        p.angleRad = Math.atan2(p.vyPx, p.vxPx);
      } else if (p.spinRad !== 0) {
        p.angleRad += p.spinRad * dt;
      }

      alive.push(p);
    }
    this.particles = alive;
  }
}

export function renderParticleSystem(
  ctx: CanvasRenderingContext2D,
  ps: ParticleSystem,
  layout: { gateWidth: number; padTop: number; cellSize: number },
  getImage?: (src?: string) => HTMLImageElement | null
) {
  if (!ps || ps.particles.length === 0) return;
  const { gateWidth, padTop, cellSize } = layout;

  for (const p of ps.particles) {
    const progress = Math.min(1, Math.max(0, p.age / p.duration));
    const alpha = Math.max(0, Math.min(1, p.alphaStart + (p.alphaEnd - p.alphaStart) * progress));
    if (alpha <= 0.01) continue;

    const x = gateWidth + p.col * cellSize + cellSize / 2;
    const y = padTop + p.row * cellSize + cellSize / 2;
    const size = Math.max(0.5, p.sizePx * (1 + (p.sizeEndScale - 1) * progress));
    const color = lerpHexColor(p.colorStart, p.colorEnd, progress);

    ctx.save();
    ctx.globalAlpha *= alpha;
    if (p.blendMode !== 'source-over') {
      ctx.globalCompositeOperation = p.blendMode;
    }
    if (p.glowColor && p.glowBlur > 0) {
      ctx.shadowColor = p.glowColor;
      ctx.shadowBlur = p.glowBlur;
    }

    if (p.shape === 'ring') {
      const r = Math.max(2, p.sizePx + p.ringExpandPx * progress);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, p.strokeWidth * (1 - progress * 0.65));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === 'sprite' && getImage) {
      const img = getImage(p.sprite);
      if (img) {
        ctx.translate(x, y);
        if (p.angleRad !== 0) ctx.rotate(p.angleRad);
        const dim = size * 2.4;
        ctx.drawImage(img, -dim / 2, -dim / 2, dim, dim);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.shape === 'spark') {
      const speedMag = Math.hypot(p.vxPx, p.vyPx);
      const tailLen = Math.max(size * 2.2, Math.min(size * 6, speedMag * 0.065));
      ctx.translate(x, y);
      ctx.rotate(p.angleRad);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, size * 0.72);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-tailLen, 0);
      ctx.lineTo(tailLen * 0.35, 0);
      ctx.stroke();
    } else if (p.shape === 'square') {
      ctx.translate(x, y);
      if (p.angleRad !== 0) ctx.rotate(p.angleRad);
      ctx.fillStyle = color;
      ctx.fillRect(-size, -size, size * 2, size * 2);
      if (p.strokeColor) {
        ctx.strokeStyle = p.strokeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(-size, -size, size * 2, size * 2);
      }
    } else if (p.shape === 'shard') {
      ctx.translate(x, y);
      if (p.angleRad !== 0) ctx.rotate(p.angleRad);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.45);
      ctx.lineTo(size * 0.9, size * 0.55);
      ctx.lineTo(-size * 0.85, size * 0.95);
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === 'star') {
      ctx.translate(x, y);
      if (p.angleRad !== 0) ctx.rotate(p.angleRad);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? size * 1.5 : size * 0.55;
        const a = (Math.PI / 4) * i;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else if (p.shape === 'cross') {
      ctx.translate(x, y);
      ctx.fillStyle = color;
      const thick = Math.max(1.5, size * 0.55);
      ctx.fillRect(-size, -thick / 2, size * 2, thick);
      ctx.fillRect(-thick / 2, -size, thick, size * 2);
    } else if (p.shape === 'smoke') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
