import {
  DESIGN_CATALOG,
  EFFECTS_CATALOG,
  ENEMY_CATALOG,
  GAME_CONFIG,
  GRID_COLS,
  GRID_ROWS,
  TOWER_CATALOG,
} from '../data/scpCatalog';
import { getDeclarativeEffects } from './effectRunner';
import {
  BoardDesignConfig,
  CustomShapeCondition,
  CustomShapeLayer,
  Door079,
  EmergencyGate,
  Enemy,
  EnemyDesignConfig,
  EnergyDrop,
  Projectile,
  ProjectileDesignConfig,
  SpriteRenderMode,
  Tower,
  TowerDesignConfig,
  TowerType,
  VisualEffect,
} from '../types/game';

const FALLBACK_TOWER_DESIGN: TowerDesignConfig = {
  shape: 'guard',
  body: '#334155',
  stroke: '#0F172A',
  strokeWidth: 2,
  headOrTop: '#1E293B',
  accent: '#38BDF8',
  weaponOrDetail: '#94A3B8',
};

const FALLBACK_ENEMY_DESIGN: EnemyDesignConfig = {
  shape: 'zombie',
  body: '#4D7C0F',
  stroke: '#1A2E05',
  strokeWidth: 2,
  head: '#65A30D',
  accent: '#EF4444',
  hpBar: '#EF4444',
  barWidth: 38,
  codeLabel: 'SCP',
};

const FALLBACK_PROJECTILE_DESIGN: ProjectileDesignConfig = {
  shape: 'circle',
  color: '#38BDF8',
  coreColor: '#E0F2FE',
  radius: 4.5,
};

function getTowerDesign(type: string): TowerDesignConfig {
  return (
    DESIGN_CATALOG.towers[type] ?? {
      ...FALLBACK_TOWER_DESIGN,
      ...(DESIGN_CATALOG.defaultTower ?? {}),
    }
  );
}

function getEnemyDesign(type: string): EnemyDesignConfig {
  if (DESIGN_CATALOG.enemies[type]) {
    return DESIGN_CATALOG.enemies[type];
  }
  const autoLabel = type.replace(/^scp_/i, '').toUpperCase().slice(0, 6) || 'SCP';
  return {
    ...FALLBACK_ENEMY_DESIGN,
    ...(DESIGN_CATALOG.defaultEnemy ?? {}),
    codeLabel: DESIGN_CATALOG.defaultEnemy?.codeLabel || autoLabel,
  };
}

function getProjectileDesign(kind: string): ProjectileDesignConfig {
  return (
    DESIGN_CATALOG.projectiles[kind] ?? {
      ...FALLBACK_PROJECTILE_DESIGN,
      ...(DESIGN_CATALOG.defaultProjectile ?? {}),
    }
  );
}

export interface RenderState {
  gridRows?: number;
  gridCols?: number;
  boardOverride?: Partial<BoardDesignConfig>;
  towers: Tower[];
  enemies: Enemy[];
  doors079: Door079[];
  projectiles: Projectile[];
  energyDrops: EnergyDrop[];
  effects: VisualEffect[];
  gates: EmergencyGate[];
  hoverCell: { row: number; col: number } | null;
  selectedTool: TowerType | 'remove' | null;
  canAffordSelected: boolean;
  time: number;
  blinkAlpha: number;
  hasActive049: boolean;
}

export const BOARD_LAYOUT = GAME_CONFIG.boardLayout;

export function getCanvasDimensions(gridRows = GRID_ROWS, gridCols = GRID_COLS) {
  return {
    width: BOARD_LAYOUT.gateWidth + gridCols * BOARD_LAYOUT.cellSize + BOARD_LAYOUT.breachMargin,
    height: BOARD_LAYOUT.padTop + gridRows * BOARD_LAYOUT.cellSize + BOARD_LAYOUT.padBottom,
  };
}

export const CANVAS_WIDTH =
  BOARD_LAYOUT.gateWidth + GRID_COLS * BOARD_LAYOUT.cellSize + BOARD_LAYOUT.breachMargin;
export const CANVAS_HEIGHT =
  BOARD_LAYOUT.padTop + GRID_ROWS * BOARD_LAYOUT.cellSize + BOARD_LAYOUT.padBottom;

interface CachedImageEntry {
  img: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
}

const imageCache = new Map<string, CachedImageEntry>();

function getCachedImage(src?: string): HTMLImageElement | null {
  if (!src || typeof src !== 'string') return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  let entry = imageCache.get(trimmed);
  if (!entry) {
    const img = new Image();
    const newEntry: CachedImageEntry = { img, loaded: false, failed: false };
    img.onload = () => {
      newEntry.loaded = img.naturalWidth > 0 && img.naturalHeight > 0;
      newEntry.failed = !newEntry.loaded;
    };
    img.onerror = () => {
      newEntry.failed = true;
      newEntry.loaded = false;
    };
    img.src = trimmed;
    imageCache.set(trimmed, newEntry);
    entry = newEntry;
  }

  if (entry.loaded && !entry.failed && entry.img.complete && entry.img.naturalWidth > 0) {
    return entry.img;
  }
  return null;
}

function drawSpriteAt(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  width: number,
  height: number,
  opts?: {
    offsetX?: number;
    offsetY?: number;
    flipX?: boolean;
    opacity?: number;
  }
) {
  ctx.save();
  if (opts?.opacity !== undefined && opts.opacity < 1) {
    ctx.globalAlpha *= Math.max(0, opts.opacity);
  }
  const drawCx = cx + (opts?.offsetX ?? 0);
  const drawCy = cy + (opts?.offsetY ?? 0);
  ctx.translate(drawCx, drawCy);
  if (opts?.flipX) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function resolvePulseColor(colorOrRgb: string | undefined, alpha: number, fallbackRgb: string): string {
  if (!colorOrRgb) return `rgba(${fallbackRgb}, ${alpha})`;
  const trimmed = colorOrRgb.trim();
  if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(trimmed)) {
    return `rgba(${trimmed}, ${alpha})`;
  }
  return trimmed;
}

interface CustomLayerContext {
  time: number;
  bob?: number;
  recoilOffset?: number;
  shakeX?: number;
  tokens: Record<string, string | undefined>;
  conditions: Set<CustomShapeCondition>;
}

function resolveCustomShapeLayers(
  inlineLayers: CustomShapeLayer[] | undefined,
  shapeName: string | undefined
): CustomShapeLayer[] | null {
  if (inlineLayers && inlineLayers.length > 0) {
    return inlineLayers;
  }
  if (!shapeName || !DESIGN_CATALOG.customShapes) return null;
  const entry = DESIGN_CATALOG.customShapes[shapeName];
  if (!entry) return null;
  if (Array.isArray(entry)) {
    return entry.length > 0 ? entry : null;
  }
  return entry.layers && entry.layers.length > 0 ? entry.layers : null;
}

function resolveLayerColor(
  rawColor: string | undefined,
  tokens: Record<string, string | undefined>,
  alpha = 1
): string | undefined {
  if (!rawColor) return undefined;
  let resolved = rawColor.trim();
  if (resolved.startsWith('$')) {
    const key = resolved.slice(1);
    resolved = tokens[key] ?? '';
    if (!resolved) return undefined;
  }
  if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(resolved)) {
    return `rgba(${resolved}, ${alpha})`;
  }
  return resolved;
}

function drawCustomLayers(
  ctx: CanvasRenderingContext2D,
  layers: CustomShapeLayer[],
  cx: number,
  cy: number,
  layerCtx: CustomLayerContext
) {
  for (const layer of layers) {
    const cond = layer.condition ?? 'always';
    if (cond !== 'always' && !layerCtx.conditions.has(cond)) {
      continue;
    }

    const pulseAlpha =
      layer.pulseSpeed !== undefined
        ? (layer.pulseMinAlpha ?? 0.45) +
          ((layer.pulseMaxAlpha ?? 1) - (layer.pulseMinAlpha ?? 0.45)) *
            (0.5 + 0.5 * Math.sin(layerCtx.time * layer.pulseSpeed))
        : 1;

    const fill = resolveLayerColor(layer.fill, layerCtx.tokens, pulseAlpha);
    const stroke = resolveLayerColor(layer.stroke, layerCtx.tokens, pulseAlpha);

    const lx =
      cx +
      (layer.x ?? 0) -
      (layer.applyRecoil ?? 0) * (layerCtx.recoilOffset ?? 0) +
      (layer.applyShake ? layerCtx.shakeX ?? 0 : 0);
    const ly = cy + (layer.y ?? 0) + (layer.applyBob ? layerCtx.bob ?? 0 : 0);

    ctx.save();
    const effectiveOpacity = (layer.opacity ?? 1) * pulseAlpha;
    if (effectiveOpacity < 1) {
      ctx.globalAlpha *= Math.max(0, effectiveOpacity);
    }

    if (layer.rotationDeg) {
      ctx.translate(lx, ly);
      ctx.rotate((layer.rotationDeg * Math.PI) / 180);
      ctx.translate(-lx, -ly);
    }

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = layer.lineWidth ?? 2;
    }
    if (fill) {
      ctx.fillStyle = fill;
    }

    switch (layer.type) {
      case 'rect': {
        const w = layer.w ?? 20;
        const h = layer.h ?? 20;
        if (fill) ctx.fillRect(lx, ly, w, h);
        if (stroke) ctx.strokeRect(lx, ly, w, h);
        break;
      }

      case 'roundRect': {
        const w = layer.w ?? 20;
        const h = layer.h ?? 20;
        const r = layer.r ?? 4;
        roundRect(ctx, lx, ly, w, h, r);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        break;
      }

      case 'circle': {
        const r = layer.r ?? 10;
        ctx.beginPath();
        ctx.arc(lx, ly, r, 0, Math.PI * 2);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        break;
      }

      case 'ellipse': {
        const rx = layer.rx ?? 14;
        const ry = layer.ry ?? 10;
        ctx.beginPath();
        ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        break;
      }

      case 'arc': {
        const r = layer.r ?? 12;
        const startRad = ((layer.startDeg ?? 0) * Math.PI) / 180;
        const endRad = ((layer.endDeg ?? 360) * Math.PI) / 180;
        ctx.beginPath();
        ctx.arc(lx, ly, r, startRad, endRad);
        if (layer.closed) ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
        break;
      }

      case 'line': {
        const x2 =
          cx +
          (layer.x2 ?? 10) -
          (layer.applyRecoil ?? 0) * (layerCtx.recoilOffset ?? 0) +
          (layer.applyShake ? layerCtx.shakeX ?? 0 : 0);
        const y2 = cy + (layer.y2 ?? 0) + (layer.applyBob ? layerCtx.bob ?? 0 : 0);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(x2, y2);
        if (stroke) ctx.stroke();
        break;
      }

      case 'polygon': {
        const pts = layer.points;
        if (pts && pts.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(lx + pts[0][0], ly + pts[0][1]);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(lx + pts[i][0], ly + pts[i][1]);
          }
          if (layer.closed ?? true) ctx.closePath();
          if (fill) ctx.fill();
          if (stroke) ctx.stroke();
        }
        break;
      }

      case 'text': {
        if (layer.text) {
          ctx.font = layer.font ?? DESIGN_CATALOG.fonts?.enemyLabel ?? 'bold 10px "JetBrains Mono", monospace';
          ctx.textAlign = layer.textAlign ?? 'center';
          ctx.textBaseline = 'middle';
          if (fill) ctx.fillText(layer.text, lx, ly);
          if (stroke) ctx.strokeText(layer.text, lx, ly);
        }
        break;
      }
    }

    ctx.restore();
  }
}

export function cellToPx(row: number, col: number) {
  return {
    x: BOARD_LAYOUT.gateWidth + col * BOARD_LAYOUT.cellSize,
    y: BOARD_LAYOUT.padTop + row * BOARD_LAYOUT.cellSize,
  };
}

export function pxToCell(
  px: number,
  py: number,
  gridRows = GRID_ROWS,
  gridCols = GRID_COLS
): { row: number; col: number } | null {
  const col = Math.floor((px - BOARD_LAYOUT.gateWidth) / BOARD_LAYOUT.cellSize);
  const row = Math.floor((py - BOARD_LAYOUT.padTop) / BOARD_LAYOUT.cellSize);
  if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
    return { row, col };
  }
  return null;
}

export function renderBoard(ctx: CanvasRenderingContext2D, state: RenderState) {
  const gridRows = state.gridRows ?? GRID_ROWS;
  const gridCols = state.gridCols ?? GRID_COLS;
  const { width: canvasW, height: canvasH } = getCanvasDimensions(gridRows, gridCols);
  const { cellSize, gateWidth, padTop, breachMargin } = BOARD_LAYOUT;
  const boardW = gridCols * cellSize;
  const boardH = gridRows * cellSize;
  const board = state.boardOverride
    ? { ...DESIGN_CATALOG.board, ...state.boardOverride }
    : DESIGN_CATALOG.board;
  const { zones } = DESIGN_CATALOG;

  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = board.canvasBg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const bgImg = getCachedImage(board.bgImage);
  if (bgImg) {
    ctx.save();
    ctx.globalAlpha = board.bgImageOpacity ?? 0.2;
    ctx.drawImage(bgImg, gateWidth, padTop, boardW, boardH);
    ctx.restore();
  }

  ctx.fillStyle = board.gateBg;
  ctx.fillRect(0, padTop, gateWidth, boardH);

  ctx.fillStyle = board.breachBg;
  ctx.fillRect(gateWidth + boardW, padTop, breachMargin, boardH);

  const baseArrowCols = board.arrowColumns ?? [0, 4, 8];
  const arrowCols =
    gridCols !== GRID_COLS && (board.adaptArrowsToGrid ?? true)
      ? new Set([0, Math.floor(gridCols / 2), Math.max(0, gridCols - 1)])
      : new Set(baseArrowCols.filter((c) => c >= 0 && c < gridCols));
  const tileSpriteEven = getCachedImage(board.tileSpriteEven);
  const tileSpriteOdd = getCachedImage(board.tileSpriteOdd);

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const { x, y } = cellToPx(r, c);
      const isEven = (r + c) % 2 === 0;
      const tileSprite = isEven ? tileSpriteEven : tileSpriteOdd;
      if (tileSprite) {
        ctx.drawImage(tileSprite, x, y, cellSize, cellSize);
      } else {
        ctx.fillStyle = isEven ? board.tileEven : board.tileOdd;
        ctx.fillRect(x, y, cellSize, cellSize);
      }

      ctx.strokeStyle = board.tileStroke;
      ctx.lineWidth = board.tileStrokeWidth ?? 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

      if (arrowCols.has(c)) {
        ctx.fillStyle = board.arrowFill;
        ctx.beginPath();
        ctx.moveTo(x + cellSize * 0.62, y + cellSize * 0.42);
        ctx.lineTo(x + cellSize * 0.48, y + cellSize * 0.5);
        ctx.lineTo(x + cellSize * 0.62, y + cellSize * 0.58);
        ctx.lineTo(x + cellSize * 0.56, y + cellSize * 0.58);
        ctx.lineTo(x + cellSize * 0.42, y + cellSize * 0.5);
        ctx.lineTo(x + cellSize * 0.56, y + cellSize * 0.42);
        ctx.closePath();
        ctx.fill();
      }
    }

    const laneY = padTop + r * cellSize;
    ctx.strokeStyle = board.laneStroke;
    ctx.lineWidth = board.laneStrokeWidth ?? 2;
    ctx.beginPath();
    ctx.moveTo(gateWidth, laneY);
    ctx.lineTo(gateWidth + boardW, laneY);
    ctx.stroke();
  }

  const breachX = gateWidth + boardW;
  const stripeW = board.breachStripeWidth ?? 5;
  const stripeH = board.breachStripeHeight ?? 9;
  ctx.fillStyle = board.breachStripeDark;
  ctx.fillRect(breachX, padTop, stripeW, boardH);
  for (let y = padTop; y < padTop + boardH; y += stripeH * 2) {
    ctx.fillStyle = board.breachStripeAmber;
    ctx.fillRect(breachX, y, stripeW, stripeH);
  }

  // Radio Anti-Hypnosis & Anti-066 Aura
  const radioRadius = EFFECTS_CATALOG.radio_3x3?.radiusCells ?? 1;
  for (const tower of state.towers) {
    if (tower.type !== 'radio' || tower.suppressed || tower.stunTimer > 0 || tower.deafTimer > 0) {
      continue;
    }
    drawRadiusZone(ctx, tower.row, tower.col, radioRadius, zones.radioFill, zones.radioStroke, gridRows, gridCols);
  }

  // Declarative Tower Zones
  for (const tower of state.towers) {
    if (tower.suppressed || tower.stunTimer > 0 || tower.deafTimer > 0 || tower.customDisabled) continue;
    const tDef = TOWER_CATALOG.find((t) => t.type === tower.type);
    for (const fx of getDeclarativeEffects(tDef?.effects)) {
      if (!fx.visual?.showZone) continue;
      const rad = fx.radiusCells ?? 1;
      const pulse = 0.12 + 0.05 * Math.sin(state.time * (fx.visual.zonePulseSpeed ?? 4.5));
      const fill = fx.visual.zoneRgb ? `rgba(${fx.visual.zoneRgb}, ${pulse})` : zones.medicFill;
      const stroke = fx.visual.zoneStroke ?? fx.color;
      drawRadiusZone(ctx, tower.row, tower.col, rad, fill, stroke, gridRows, gridCols);
    }
  }

  // Hover highlight
  if (state.hoverCell && state.selectedTool) {
    const { row, col } = state.hoverCell;
    const { x, y } = cellToPx(row, col);
    const existing = state.towers.find((t) => t.row === row && t.col === col);
    const hoverInset = zones.hoverInset ?? 2;
    const hoverLineW = zones.hoverLineWidth ?? 2;

    if (state.selectedTool === 'remove') {
      ctx.fillStyle = existing ? zones.hoverRemoveActiveFill : zones.hoverRemoveIdleFill;
      ctx.fillRect(x + hoverInset, y + hoverInset, cellSize - hoverInset * 2, cellSize - hoverInset * 2);
      ctx.strokeStyle = existing ? zones.hoverRemoveActiveStroke : zones.hoverRemoveIdleStroke;
      ctx.lineWidth = hoverLineW;
      ctx.strokeRect(x + hoverInset, y + hoverInset, cellSize - hoverInset * 2, cellSize - hoverInset * 2);
    } else {
      if (
        (state.selectedTool === 'radio' ||
          state.selectedTool === 'medic' ||
          state.selectedTool === 'engineer' ||
          state.selectedTool === 'tesla_coil') &&
        !existing
      ) {
        const hoverRad =
          state.selectedTool === 'radio'
            ? radioRadius
            : state.selectedTool === 'medic' || state.selectedTool === 'engineer'
            ? EFFECTS_CATALOG.heal_pulse?.radiusCells ?? 1
            : 1;
        drawRadiusZone(
          ctx,
          row,
          col,
          hoverRad,
          state.selectedTool === 'tesla_coil' ? zones.teslaFill : zones.medicFill,
          state.selectedTool === 'tesla_coil' ? zones.teslaStroke : zones.medicStroke,
          gridRows,
          gridCols
        );
      }

      const valid = !existing && state.canAffordSelected;
      ctx.fillStyle = valid ? zones.hoverValidFill : zones.hoverInvalidFill;
      ctx.fillRect(x + hoverInset, y + hoverInset, cellSize - hoverInset * 2, cellSize - hoverInset * 2);
      ctx.strokeStyle = valid ? zones.hoverValidStroke : zones.hoverInvalidStroke;
      ctx.lineWidth = hoverLineW;
      ctx.strokeRect(x + hoverInset, y + hoverInset, cellSize - hoverInset * 2, cellSize - hoverInset * 2);
    }
  }

  // SCP-966 Suppression Zone Aura
  const sleepRadius = EFFECTS_CATALOG.sleep_3x3?.radiusCells ?? 1;
  for (const enemy of state.enemies) {
    if (enemy.type !== 'scp_966') continue;
    const centerCol = Math.min(gridCols - 1, Math.max(0, Math.round(enemy.col)));
    const pulse =
      (zones.scp966AlphaBase ?? 0.14) +
      (zones.scp966AlphaAmp ?? 0.06) * Math.sin(state.time * (zones.scp966PulseSpeed ?? 4.5));
    drawRadiusZone(ctx, enemy.row, centerCol, sleepRadius, `rgba(${zones.scp966Rgb}, ${pulse})`, zones.scp966Stroke, gridRows, gridCols);
  }

  // SCP-066 Warning Zone when close to screaming
  const screamRad066 = EFFECTS_CATALOG.scream_066?.radiusCells ?? 2;
  const screamWarn066 = EFFECTS_CATALOG.scream_066?.visual?.warnBeforeSec ?? zones.scp066WarnSec ?? 1.8;
  for (const enemy of state.enemies) {
    if (enemy.type !== 'scp_066') continue;
    if (enemy.screamTimer066 <= screamWarn066) {
      const centerCol = Math.min(gridCols - 1, Math.max(0, Math.round(enemy.col)));
      const pulse =
        (zones.scp066AlphaBase ?? 0.1) +
        (zones.scp066AlphaAmp ?? 0.08) * Math.sin(state.time * (zones.scp066PulseSpeed ?? 9));
      drawRadiusZone(ctx, enemy.row, centerCol, screamRad066, `rgba(${zones.scp066Rgb}, ${pulse})`, zones.scp066Stroke, gridRows, gridCols);
    }
  }

  // Declarative Enemy Aura Zones
  for (const enemy of state.enemies) {
    if (enemy.skyOffsetRows > 0.3 || (enemy.stunTimer ?? 0) > 0) continue;
    const eDef = ENEMY_CATALOG.find((e) => e.type === enemy.type);
    const mergedEffects = [...(eDef?.effects ?? []), ...(enemy.extraEffects ?? [])];
    for (const fx of getDeclarativeEffects(mergedEffects)) {
      if (!fx.visual?.showZone) continue;
      if (fx.trigger === 'periodic' && fx.visual.warnBeforeSec !== undefined) {
        const rem = enemy.effectTimers?.[fx.id] ?? 99;
        if (rem > fx.visual.warnBeforeSec) continue;
      }
      const centerCol = Math.min(gridCols - 1, Math.max(0, Math.round(enemy.col)));
      const rad = fx.radiusCells ?? 1;
      const pulse = 0.13 + 0.06 * Math.sin(state.time * (fx.visual.zonePulseSpeed ?? 5));
      const fill = fx.visual.zoneRgb ? `rgba(${fx.visual.zoneRgb}, ${pulse})` : 'rgba(163, 230, 53, 0.14)';
      const stroke = fx.visual.zoneStroke ?? fx.color;
      drawRadiusZone(ctx, enemy.row, centerCol, rad, fill, stroke, gridRows, gridCols);
    }
  }

  for (const gate of state.gates) {
    drawEmergencyGate(ctx, gate, state.time);
  }

  // SCP-079 Containment Doors
  for (const door of state.doors079) {
    drawDoor079(ctx, door, state.time);
  }

  for (const tower of state.towers) {
    if (tower.type === 'laser_trap') {
      drawTower(ctx, tower, state.time);
    }
  }

  for (const tower of state.towers) {
    if (tower.type !== 'laser_trap') {
      drawTower(ctx, tower, state.time);
    }
  }

  const sortedEnemies = [...state.enemies].sort((a, b) => a.row - b.row || b.col - a.col);
  for (const enemy of sortedEnemies) {
    drawEnemy(ctx, enemy, state.time, state.hasActive049);
  }

  for (const proj of state.projectiles) {
    drawProjectile(ctx, proj);
  }

  for (const fx of state.effects) {
    drawEffect(ctx, fx);
  }

  for (const drop of state.energyDrops) {
    drawEnergyDrop(ctx, drop, state.time);
  }

  if (state.blinkAlpha > 0.01) {
    ctx.save();
    ctx.fillStyle = `rgba(${board.blinkOverlayRgb}, ${Math.min(board.blinkMaxAlpha ?? 0.92, state.blinkAlpha)})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }
}

function drawRadiusZone(
  ctx: CanvasRenderingContext2D,
  centerRow: number,
  centerCol: number,
  radius: number,
  fillStyle: string,
  strokeStyle: string,
  gridRows: number,
  gridCols: number
) {
  const { cellSize } = BOARD_LAYOUT;
  const zones = DESIGN_CATALOG.zones;
  const minR = Math.max(0, centerRow - radius);
  const maxR = Math.min(gridRows - 1, centerRow + radius);
  const minC = Math.max(0, centerCol - radius);
  const maxC = Math.min(gridCols - 1, centerCol + radius);

  const topLeft = cellToPx(minR, minC);
  const zoneW = (maxC - minC + 1) * cellSize;
  const zoneH = (maxR - minR + 1) * cellSize;

  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.fillRect(topLeft.x + 1, topLeft.y + 1, zoneW - 2, zoneH - 2);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = zones.lineWidth ?? 2;
  ctx.setLineDash(zones.dashPattern ?? [6, 4]);
  ctx.strokeRect(topLeft.x + 2, topLeft.y + 2, zoneW - 4, zoneH - 4);
  ctx.restore();
}

function drawDoor079(ctx: CanvasRenderingContext2D, door: Door079, time: number) {
  const { cellSize } = BOARD_LAYOUT;
  const { x, y } = cellToPx(door.row, door.col);
  const d = DESIGN_CATALOG.doors079;
  const doorFont = DESIGN_CATALOG.fonts?.doorLabel ?? 'bold 8px "JetBrains Mono", monospace';

  ctx.save();
  if (door.isOpen) {
    const sprite = getCachedImage(d.spriteOpen);
    if (sprite) {
      drawSpriteAt(ctx, sprite, x + cellSize / 2, y + cellSize / 2, cellSize - 12, cellSize - 12);
    } else {
      ctx.fillStyle = d.openFill;
      ctx.fillRect(x + 8, y + 6, cellSize - 16, cellSize - 12);
      ctx.strokeStyle = d.openStroke;
      ctx.lineWidth = 2;
      ctx.setLineDash(d.openDash ?? [4, 4]);
      ctx.strokeRect(x + 8, y + 6, cellSize - 16, cellSize - 12);
      ctx.setLineDash([]);

      ctx.fillStyle = d.openAccent;
      ctx.fillRect(x + 10, y + 8, 8, cellSize - 16);
      ctx.fillRect(x + cellSize - 18, y + 8, 8, cellSize - 16);
    }

    ctx.fillStyle = d.openTextColor ?? d.openAccent;
    ctx.font = doorFont;
    ctx.textAlign = 'center';
    ctx.fillText(d.openLabel ?? 'ABIERTA', x + cellSize / 2, y + 16);
  } else {
    const sprite = getCachedImage(d.spriteClosed);
    if (sprite) {
      drawSpriteAt(ctx, sprite, x + cellSize / 2, y + cellSize / 2, cellSize - 12, cellSize - 12);
    } else {
      ctx.fillStyle = d.closedFill;
      roundRect(ctx, x + 10, y + 6, cellSize - 20, cellSize - 12, 4);
      ctx.fill();
      ctx.strokeStyle = d.closedStroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.strokeStyle = d.closedAccent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + cellSize / 2, y + 10);
      ctx.lineTo(x + cellSize / 2, y + cellSize - 10);
      ctx.stroke();

      const blink = Math.sin(time * (d.blinkSpeed ?? 8)) > 0;
      ctx.fillStyle = blink ? (d.ledOnColor ?? '#22C55E') : (d.ledOffColor ?? '#166534');
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = d.closedTextColor ?? '#DCFCE7';
    ctx.font = doorFont;
    ctx.textAlign = 'center';
    ctx.fillText(d.closedLabel ?? '079 CERRADA', x + cellSize / 2, y + cellSize - 12);
  }
  ctx.restore();
}

function drawEmergencyGate(ctx: CanvasRenderingContext2D, gate: EmergencyGate, time: number) {
  const { cellSize, padTop, gateWidth } = BOARD_LAYOUT;
  const y = padTop + gate.row * cellSize;
  const cx = gateWidth / 2;
  const cy = y + cellSize / 2;
  const g = DESIGN_CATALOG.gates;

  if (gate.firingTimer > 0) {
    const beamX = gateWidth + gate.sweepCol * cellSize;
    ctx.save();
    ctx.fillStyle = g.beamColor;
    ctx.shadowColor = g.beamColor;
    ctx.shadowBlur = g.beamShadowBlur ?? 14;
    ctx.beginPath();
    ctx.arc(beamX, cy, g.beamRadius ?? 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.beamCore;
    ctx.lineWidth = g.beamCoreWidth ?? 3;
    ctx.beginPath();
    ctx.moveTo(gateWidth, cy);
    ctx.lineTo(beamX, cy);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  const cornerR = g.cornerRadius ?? 8;
  if (gate.available) {
    const activeSprite = getCachedImage(g.spriteActive);
    if (activeSprite) {
      drawSpriteAt(ctx, activeSprite, cx, cy, gateWidth - 12, cellSize - 24);
    } else {
      ctx.fillStyle = g.activeFill;
      ctx.strokeStyle = g.activeStroke;
      ctx.lineWidth = 2;
      roundRect(ctx, 8, y + 16, gateWidth - 16, cellSize - 32, cornerR);
      ctx.fill();
      ctx.stroke();

      const glow = 0.65 + 0.35 * Math.sin(time * (g.pulseSpeed ?? 3) + gate.row);
      ctx.fillStyle = resolvePulseColor(g.readyGlowRgb, glow, '56, 189, 248');
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = g.activeCore;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const spentSprite = getCachedImage(g.spriteSpent);
    if (spentSprite) {
      drawSpriteAt(ctx, spentSprite, cx, cy, gateWidth - 12, cellSize - 24);
    } else {
      ctx.fillStyle = g.spentFill;
      ctx.strokeStyle = g.spentStroke;
      ctx.lineWidth = 1.5;
      roundRect(ctx, 8, y + 16, gateWidth - 16, cellSize - 32, cornerR);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = g.spentCross;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 7);
      ctx.lineTo(cx + 7, cy + 7);
      ctx.moveTo(cx + 7, cy - 7);
      ctx.lineTo(cx - 7, cy + 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, time: number) {
  const { cellSize } = BOARD_LAYOUT;
  const { x, y } = cellToPx(tower.row, tower.col);
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const recoilOffset = tower.recoil * 5;
  const td = getTowerDesign(tower.type);
  const statuses = DESIGN_CATALOG.statuses;

  ctx.save();

  const showShadow = td.shadow ?? tower.type !== 'laser_trap';
  if (showShadow) {
    ctx.fillStyle = td.shadowColor ?? statuses?.towerShadow ?? 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(
      cx + (td.offsetX ?? 0),
      cy + (td.shadowOffsetY ?? 25) + (td.offsetY ?? 0),
      td.shadowRadiusX ?? 24,
      td.shadowRadiusY ?? 9,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  if (tower.immuneToPsych) {
    ctx.strokeStyle = statuses?.immunePsychRingColor ?? 'rgba(52, 211, 153, 0.7)';
    ctx.lineWidth = statuses?.immunePsychRingWidth ?? 2;
    ctx.beginPath();
    ctx.arc(cx, cy, statuses?.immunePsychRingRadius ?? 29, 0, Math.PI * 2);
    ctx.stroke();
  }

  const disabled = tower.suppressed || tower.hypnotized || tower.stunTimer > 0 || tower.deafTimer > 0;
  if (disabled) {
    ctx.globalAlpha = statuses?.disabledAlpha ?? 0.62;
  }

  const scale = td.scale ?? 1;
  const offsetX = td.offsetX ?? 0;
  const offsetY =
    (td.offsetY ?? 0) +
    (td.bobAmount && td.bobSpeed ? Math.sin(time * td.bobSpeed) * td.bobAmount : 0);
  const rotRad = ((td.rotationDeg ?? 0) * Math.PI) / 180;

  if (scale !== 1 || offsetX !== 0 || offsetY !== 0 || rotRad !== 0) {
    ctx.translate(cx + offsetX, cy + offsetY);
    if (rotRad !== 0) ctx.rotate(rotRad);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  if (td.glowColor) {
    ctx.shadowColor = td.glowColor;
    ctx.shadowBlur = td.glowBlur ?? 10;
  }

  const spriteImg = getCachedImage(td.sprite);
  const spriteMode: SpriteRenderMode = td.spriteMode ?? 'replace';
  const spriteW = td.spriteWidth ?? cellSize * 0.82;
  const spriteH = td.spriteHeight ?? cellSize * 0.82;

  if (spriteImg && spriteMode === 'under') {
    drawSpriteAt(ctx, spriteImg, cx - recoilOffset * 0.3, cy, spriteW, spriteH, {
      offsetX: td.spriteOffsetX,
      offsetY: td.spriteOffsetY,
      flipX: td.spriteFlipX,
      opacity: td.spriteOpacity,
    });
  }

  if (!spriteImg || spriteMode !== 'replace') {
    drawTowerVectorShape(ctx, tower, td, cx, cy, x, y, cellSize, recoilOffset, disabled, time);
  }

  if (spriteImg && (spriteMode === 'replace' || spriteMode === 'over')) {
    drawSpriteAt(ctx, spriteImg, cx - recoilOffset * 0.3, cy, spriteW, spriteH, {
      offsetX: td.spriteOffsetX,
      offsetY: td.spriteOffsetY,
      flipX: td.spriteFlipX,
      opacity: td.spriteOpacity,
    });
  }

  if (tower.hitFlash > 0) {
    const hitRgb = statuses?.towerHitFlashRgb ?? '239, 68, 68';
    ctx.fillStyle = `rgba(${hitRgb}, ${tower.hitFlash * 0.45})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  const ui = DESIGN_CATALOG.ui;
  const showHp = td.showHpBar ?? true;
  if (showHp && tower.hp < tower.maxHp) {
    const barW = td.hpBarWidth ?? ui.towerHpBarWidth ?? 48;
    const barH = td.hpBarHeight ?? ui.towerHpBarHeight ?? 5;
    const barOffY = td.hpBarOffsetY ?? ui.towerHpBarOffsetY ?? 6;
    const ratio = Math.max(0, tower.hp / tower.maxHp);
    ctx.fillStyle = ui.hpBarBg;
    ctx.fillRect(cx - barW / 2, y + barOffY, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? ui.hpBarHigh : ratio > 0.25 ? ui.hpBarMid : ui.hpBarLow;
    ctx.fillRect(cx - barW / 2, y + barOffY, barW * ratio, barH);
  }

  if (tower.customTintColor) {
    ctx.save();
    ctx.strokeStyle = tower.customTintColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const badges = DESIGN_CATALOG.badges;
  const tagY = y + cellSize - (ui.tagOffsetBottom ?? 13);
  if (tower.customBadge) {
    drawTowerTag(
      ctx,
      cx,
      tagY,
      tower.customBadge.label,
      tower.customBadge.color,
      tower.customBadge.textColor ?? tower.customBadge.color
    );
  } else if (tower.suppressed) {
    drawTowerTag(ctx, cx, tagY, badges.suppressed.label, badges.suppressed.border, badges.suppressed.text);
  } else if (tower.hypnotized) {
    drawTowerTag(ctx, cx, tagY, badges.hypnotized.label, badges.hypnotized.border, badges.hypnotized.text);
  } else if (tower.stunTimer > 0) {
    drawTowerTag(ctx, cx, tagY, badges.stunned.label, badges.stunned.border, badges.stunned.text);
  } else if (tower.deafTimer > 0) {
    drawTowerTag(ctx, cx, tagY, badges.deafened.label, badges.deafened.border, badges.deafened.text);
  } else if (tower.immuneToPsych) {
    drawTowerTag(ctx, cx, tagY, badges.immune.label, badges.immune.border, badges.immune.text);
  }
}

function drawTowerVectorShape(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  td: TowerDesignConfig,
  cx: number,
  cy: number,
  x: number,
  y: number,
  cellSize: number,
  recoilOffset: number,
  disabled: boolean,
  time: number
) {
  const shape = td.shape ?? tower.type;
  const statuses = DESIGN_CATALOG.statuses;
  const strokeW = td.strokeWidth ?? 2;

  const customLayers = resolveCustomShapeLayers(td.layers, shape);
  if (customLayers) {
    const conditions = new Set<CustomShapeCondition>();
    conditions.add(disabled ? 'disabled' : 'enabled');
    conditions.add(tower.isArmed ? 'armed' : 'unarmed');
    if (tower.hp < tower.maxHp * 0.5) conditions.add('damaged');

    drawCustomLayers(ctx, customLayers, cx, cy, {
      time,
      recoilOffset,
      conditions,
      tokens: {
        body: disabled ? (td.disabledBody ?? td.body) : td.body,
        stroke: disabled ? (td.disabledStroke ?? statuses?.disabledStroke ?? td.stroke) : td.stroke,
        headOrTop: td.headOrTop,
        head: td.headOrTop,
        accent: disabled ? (td.disabledAccent ?? statuses?.disabledAccent ?? td.accent) : td.accent,
        weaponOrDetail: td.weaponOrDetail,
        weapon: td.weaponOrDetail,
        secondary: td.secondary,
        detail: td.detail,
        glow: td.glow ?? td.glowColor ?? td.pulseRgb,
        aura: td.glow ?? td.pulseRgb,
      },
    });
    return;
  }

  switch (shape) {
    case 'researcher': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 14, cy - 6, 28, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx - 2, cy - 2, 4, 15);

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx, cy - 16, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const pulse = disabled ? 0.3 : 0.75 + 0.25 * Math.sin(time * (td.pulseSpeed ?? 4));
      ctx.fillStyle = resolvePulseColor(td.pulseRgb, pulse, '245, 158, 11');
      ctx.beginPath();
      ctx.arc(cx + 15, cy + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = td.glow ?? '#FEF3C7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'guard': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 15 - recoilOffset * 0.4, cy - 6, 30, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx + 2 - recoilOffset * 0.3, cy - 20, 9, 5);

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 4 - recoilOffset, cy + 1, 24, 5);
      ctx.fillStyle = td.body;
      ctx.fillRect(cx - 2 - recoilOffset, cy + 1, 10, 8);
      break;
    }

    case 'medic': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 14, cy - 6, 28, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx - 6, cy + 4, 12, 4);
      ctx.fillRect(cx - 2, cy, 4, 12);

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx, cy - 16, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = td.weaponOrDetail;
      ctx.stroke();
      break;
    }

    case 'engineer': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 15, cy - 6, 30, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.fillRect(cx - 12, cy + 2, 24, 5);

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx, cy - 16, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = td.secondary ?? '#FDBA74';
      ctx.beginPath();
      ctx.arc(cx, cy - 14, 9, 0, Math.PI);
      ctx.fill();

      ctx.strokeStyle = td.weaponOrDetail;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy + 12);
      ctx.lineTo(cx + 22, cy - 4);
      ctx.stroke();
      break;
    }

    case 'shotgunner': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 16 - recoilOffset * 0.5, cy - 6, 32, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = td.secondary ?? '#0F172A';
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx + 2 - recoilOffset * 0.3, cy - 19, 8, 4);

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 3 - recoilOffset, cy, 22, 8);
      ctx.fillStyle = td.detail ?? '#78350F';
      ctx.fillRect(cx - 3 - recoilOffset, cy + 1, 10, 7);
      break;
    }

    case 'cryo': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 15 - recoilOffset * 0.4, cy - 6, 30, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = td.strokeWidth ?? 1.8;
      ctx.stroke();

      ctx.fillStyle = td.secondary ?? '#67E8F9';
      roundRect(ctx, cx - 22 - recoilOffset * 0.4, cy - 6, 7, 20, 3);
      ctx.fill();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = td.accent;
      ctx.fillRect(cx + 1 - recoilOffset * 0.3, cy - 20, 9, 6);

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 5 - recoilOffset, cy, 22, 7);
      break;
    }

    case 'pyro': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 15 - recoilOffset * 0.4, cy - 6, 30, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.secondary ?? '#EA580C';
      roundRect(ctx, cx - 22 - recoilOffset * 0.4, cy - 5, 7, 19, 3);
      ctx.fill();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = td.accent;
      ctx.fillRect(cx + 1 - recoilOffset * 0.3, cy - 20, 9, 6);

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 5 - recoilOffset, cy, 24, 7);
      break;
    }

    case 'mtf': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 16 - recoilOffset * 0.5, cy - 7, 32, 30, 7);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = td.strokeWidth ?? 1.8;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 17, 12.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = td.secondary ?? '#475569';
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx + 1 - recoilOffset * 0.3, cy - 20, 10, 5);

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 6 - recoilOffset, cy - 2, 24, 4);
      ctx.fillRect(cx + 6 - recoilOffset, cy + 4, 24, 4);
      break;
    }

    case 'heavy_gunner': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 18 - recoilOffset * 0.5, cy - 8, 36, 32, 7);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = td.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx + 1 - recoilOffset * 0.3, cy - 21, 10, 5);

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 6 - recoilOffset, cy - 3, 28, 3);
      ctx.fillRect(cx + 6 - recoilOffset, cy + 2, 28, 3);
      ctx.fillRect(cx + 6 - recoilOffset, cy + 7, 28, 3);
      break;
    }

    case 'grenadier': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 16 - recoilOffset * 0.4, cy - 7, 32, 30, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 17, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx + 1 - recoilOffset * 0.3, cy - 20, 9, 5);

      ctx.fillStyle = td.weaponOrDetail;
      roundRect(ctx, cx + 2 - recoilOffset, cy - 2, 26, 11, 3);
      ctx.fill();
      break;
    }

    case 'psionic': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 14 - recoilOffset * 0.3, cy - 7, 28, 30, 8);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx, cy - 17, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const orb = 0.65 + 0.35 * Math.sin(time * (td.pulseSpeed ?? 6));
      ctx.fillStyle = resolvePulseColor(td.pulseRgb, orb, '129, 140, 248');
      ctx.beginPath();
      ctx.arc(cx + 18, cy - 2, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = td.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'sniper': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 15 - recoilOffset * 0.5, cy - 6, 30, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = td.strokeWidth ?? 1.8;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.beginPath();
      ctx.arc(cx + 5 - recoilOffset * 0.3, cy - 17, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 4 - recoilOffset, cy, 32, 4);
      ctx.fillStyle = td.secondary ?? '#10B981';
      ctx.fillRect(cx + 10 - recoilOffset, cy - 4, 10, 3);
      break;
    }

    case 'barricade': {
      ctx.fillStyle = disabled ? (td.disabledBody ?? td.headOrTop) : td.body;
      roundRect(ctx, cx - 22, cy - 24, 44, 48, 6);
      ctx.fill();
      ctx.strokeStyle = disabled ? (td.disabledStroke ?? statuses?.disabledStroke ?? '#A78BFA') : td.stroke;
      ctx.lineWidth = td.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.fillStyle = disabled ? (td.disabledAccent ?? '#6D28D9') : td.accent;
      ctx.fillRect(cx - 18, cy - 6, 36, 12);

      const hpRatio = tower.hp / tower.maxHp;
      if (hpRatio < 0.68) {
        ctx.strokeStyle = td.weaponOrDetail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 20);
        ctx.lineTo(cx - 2, cy - 8);
        ctx.lineTo(cx - 8, cy + 4);
        ctx.stroke();
      }
      if (hpRatio < 0.35) {
        ctx.beginPath();
        ctx.moveTo(cx + 12, cy - 18);
        ctx.lineTo(cx + 4, cy + 2);
        ctx.lineTo(cx + 14, cy + 16);
        ctx.stroke();
      }
      break;
    }

    case 'bunker': {
      ctx.fillStyle = disabled ? (td.disabledBody ?? statuses?.disabledBody ?? '#3B3455') : td.body;
      roundRect(ctx, cx - 24, cy - 26, 48, 52, 8);
      ctx.fill();
      ctx.strokeStyle = disabled ? (td.disabledStroke ?? statuses?.disabledStroke ?? '#A78BFA') : td.stroke;
      ctx.lineWidth = td.strokeWidth ?? 3;
      ctx.stroke();

      ctx.fillStyle = td.weaponOrDetail;
      for (let sy = -14; sy <= 14; sy += 14) {
        ctx.beginPath();
        ctx.moveTo(cx + 24, cy + sy - 4);
        ctx.lineTo(cx + 32, cy + sy);
        ctx.lineTo(cx + 24, cy + sy + 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = td.headOrTop;
      ctx.fillRect(cx - 14, cy - 8, 28, 16);
      ctx.fillStyle = td.accent;
      ctx.fillRect(cx - 10, cy - 2, 20, 4);
      break;
    }

    case 'mine': {
      ctx.fillStyle = td.body;
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 17, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.fillRect(cx - 19, cy + 10, 38, 7);

      if (tower.isArmed && !disabled) {
        const blink = Math.sin(time * (td.pulseSpeed ?? 8)) > 0;
        ctx.fillStyle = blink ? td.accent : (td.secondary ?? '#991B1B');
        ctx.beginPath();
        ctx.arc(cx, cy + 1, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = disabled ? (td.disabledAccent ?? statuses?.disabledAccent ?? '#8B5CF6') : td.weaponOrDetail;
        ctx.beginPath();
        ctx.arc(cx, cy + 4, 4, 0, Math.PI * 2);
        ctx.fill();

        if (!tower.isArmed) {
          ctx.fillStyle = DESIGN_CATALOG.ui.hpBarBg;
          ctx.fillRect(cx - 16, cy + 20, 32, 4);
          ctx.fillStyle = td.weaponOrDetail;
          ctx.fillRect(cx - 16, cy + 20, 32 * tower.armProgress, 4);
        }
      }
      break;
    }

    case 'generator': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 20, cy - 20, 40, 42, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = td.strokeWidth ?? 2.5;
      ctx.stroke();

      const glow = disabled ? 0.25 : 0.65 + 0.35 * Math.sin(time * (td.pulseSpeed ?? 5));
      ctx.fillStyle = resolvePulseColor(td.pulseRgb, glow, '251, 191, 36');
      roundRect(ctx, cx - 10, cy - 12, 20, 24, 4);
      ctx.fill();
      break;
    }

    case 'laser_trap': {
      ctx.fillStyle = td.body;
      roundRect(ctx, x + 12, y + 18, cellSize - 24, cellSize - 36, 6);
      ctx.fill();
      ctx.strokeStyle = disabled ? td.headOrTop : td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      if (!disabled) {
        const pulse = 0.45 + 0.45 * Math.sin(time * (td.pulseSpeed ?? 8));
        ctx.strokeStyle = resolvePulseColor(td.pulseRgb, pulse, '239, 68, 68');
        ctx.lineWidth = 2.5;
        for (let offset = -14; offset <= 14; offset += 14) {
          ctx.beginPath();
          ctx.moveTo(x + 16, cy + offset);
          ctx.lineTo(x + cellSize - 16, cy + offset);
          ctx.stroke();
        }
      }
      break;
    }

    case 'tesla_coil': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 18, cy + 4, 36, 18, 4);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx - 5, cy - 16, 10, 20);

      const orbGlow = disabled ? 0.3 : 0.75 + 0.25 * Math.sin(time * (td.pulseSpeed ?? 7));
      ctx.fillStyle = resolvePulseColor(td.pulseRgb, orbGlow, '56, 189, 248');
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = td.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }

    case 'radio': {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 18, cy + 2, 36, 20, 4);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.strokeStyle = td.headOrTop;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 2);
      ctx.lineTo(cx, cy - 22);
      ctx.stroke();

      const wavePhase = (time * (td.pulseSpeed ?? 2.5)) % 1;
      ctx.strokeStyle = resolvePulseColor(td.pulseRgb, 1 - wavePhase, '52, 211, 153');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 22, 6 + wavePhase * 14, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      ctx.fillStyle = disabled ? (td.disabledAccent ?? statuses?.disabledAccent ?? '#8B5CF6') : td.weaponOrDetail;
      ctx.beginPath();
      ctx.arc(cx, cy - 22, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'turret': {
      ctx.strokeStyle = td.headOrTop;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + 22);
      ctx.lineTo(cx, cy + 4);
      ctx.lineTo(cx + 18, cy + 22);
      ctx.stroke();

      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 18 - recoilOffset * 0.4, cy - 16, 36, 26, 5);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 12 - recoilOffset, cy - 8, 24, 9);
      ctx.fillStyle = td.accent;
      ctx.fillRect(cx - 10 - recoilOffset * 0.4, cy - 10, 10, 6);
      break;
    }

    default: {
      ctx.fillStyle = td.body;
      roundRect(ctx, cx - 15 - recoilOffset * 0.4, cy - 6, 30, 28, 6);
      ctx.fill();
      ctx.strokeStyle = td.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = td.headOrTop;
      ctx.beginPath();
      ctx.arc(cx - recoilOffset * 0.3, cy - 16, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = td.accent;
      ctx.fillRect(cx - 4 - recoilOffset * 0.4, cy - 18, 12, 5);
      ctx.fillStyle = td.weaponOrDetail;
      ctx.fillRect(cx + 8 - recoilOffset, cy + 2, 18, 5);
      break;
    }
  }
}

function drawTowerTag(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: string,
  borderColor: string,
  textColor: string
) {
  const ui = DESIGN_CATALOG.ui;
  const tagW = ui.tagWidth ?? 68;
  const tagH = ui.tagHeight ?? 14;
  const tagR = ui.tagRadius ?? 3;
  ctx.save();
  ctx.fillStyle = ui.tagBg;
  roundRect(ctx, cx - tagW / 2, cy - tagH / 2, tagW, tagH, tagR);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = DESIGN_CATALOG.fonts?.towerTag ?? 'bold 8.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  time: number,
  hasActive049: boolean
) {
  const { cellSize, gateWidth, padTop } = BOARD_LAYOUT;
  const ed = getEnemyDesign(enemy.type);
  const statuses = DESIGN_CATALOG.statuses;
  const shape = ed.shape ?? enemy.type;
  const spanRows = enemy.occupiedRows.length > 0 ? enemy.occupiedRows : [enemy.row];
  const avgRow = spanRows.reduce((acc, r) => acc + r, 0) / spanRows.length;
  const isMultiRow = spanRows.length > 1 || Boolean(ed.multiRow);

  const cx = gateWidth + enemy.col * cellSize + cellSize / 2;
  const cy = padTop + (avgRow - enemy.skyOffsetRows) * cellSize + cellSize / 2;
  const shakeX =
    enemy.type === 'scp_096' && enemy.phase096 === 'convulsing'
      ? Math.sin(time * (ed.convulseShakeSpeed ?? 55)) * (ed.convulseShakeAmount ?? 4)
      : 0;

  const defaultBobSpeed =
    shape === 'sculpture' || shape === 'vase' || shape === 'parchment' || shape === 'crt_ai' || shape === 'bounce_ball'
      ? 0
      : shape === 'heart_beast'
      ? 13
      : 6;
  const bobSpeed =
    enemy.phase096 === 'enraged' ? 14 : (ed.bobSpeed ?? defaultBobSpeed);
  const bobAmount = ed.bobAmount ?? (bobSpeed > 0 ? 2.5 : 0);
  const bob = bobSpeed > 0 && bobAmount !== 0 ? Math.sin(enemy.animPhase * bobSpeed) * bobAmount : 0;

  const isSlowed = enemy.slowTimer > 0;
  const isBurning = enemy.burnTimer > 0;

  ctx.save();

  if (isMultiRow) {
    const minRow = Math.min(...spanRows);
    const maxRow = Math.max(...spanRows);
    const spanH = (maxRow - minRow + 1) * cellSize;
    const spanTop = padTop + minRow * cellSize;
    ctx.fillStyle = statuses?.multiRowFill ?? 'rgba(132, 204, 22, 0.08)';
    ctx.strokeStyle = statuses?.multiRowStroke ?? 'rgba(132, 204, 22, 0.35)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - 34, spanTop + 6, 68, spanH - 12, 12);
    ctx.fill();
    ctx.stroke();

    if (ed.shadow ?? true) {
      ctx.fillStyle = ed.shadowColor ?? statuses?.multiRowShadow ?? 'rgba(0,0,0,0.48)';
      ctx.beginPath();
      ctx.ellipse(cx, spanTop + spanH - 16, ed.shadowRadiusX ?? 34, ed.shadowRadiusY ?? 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ed.shadow ?? true) {
    ctx.fillStyle = ed.shadowColor ?? statuses?.enemyShadow ?? 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(
      cx + (ed.offsetX ?? 0),
      padTop + avgRow * cellSize + cellSize / 2 + (ed.shadowOffsetY ?? 26) + (ed.offsetY ?? 0),
      ed.shadowRadiusX ?? 20,
      ed.shadowRadiusY ?? 8,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  if (enemy.type === 'scp_008' && hasActive049) {
    ctx.strokeStyle = statuses?.plague049RingColor ?? 'rgba(34, 197, 94, 0.7)';
    ctx.lineWidth = statuses?.plague049RingWidth ?? 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 24, 22, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const scale = ed.scale ?? 1;
  const offsetX = ed.offsetX ?? 0;
  const offsetY = ed.offsetY ?? 0;
  const rotRad = ((ed.rotationDeg ?? 0) * Math.PI) / 180;
  if (scale !== 1 || offsetX !== 0 || offsetY !== 0 || rotRad !== 0) {
    ctx.translate(cx + offsetX, cy + offsetY);
    if (rotRad !== 0) ctx.rotate(rotRad);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  if (ed.glowColor) {
    ctx.shadowColor = ed.glowColor;
    ctx.shadowBlur = ed.glowBlur ?? 10;
  }

  const spriteImg = getCachedImage(ed.sprite);
  const spriteMode: SpriteRenderMode = ed.spriteMode ?? 'replace';
  const defaultSpanW = isMultiRow ? cellSize * 0.95 : cellSize * 0.82;
  const defaultSpanH = isMultiRow ? spanRows.length * cellSize * 0.85 : cellSize * 0.82;
  const spriteW = ed.spriteWidth ?? defaultSpanW;
  const spriteH = ed.spriteHeight ?? defaultSpanH;

  if (spriteImg && spriteMode === 'under') {
    drawSpriteAt(ctx, spriteImg, cx + shakeX, cy + bob * 0.5, spriteW, spriteH, {
      offsetX: ed.spriteOffsetX,
      offsetY: ed.spriteOffsetY,
      flipX: ed.spriteFlipX,
      opacity: ed.spriteOpacity,
    });
  }

  if (!spriteImg || spriteMode !== 'replace') {
    drawEnemyVectorShape(ctx, enemy, ed, shape, cx, cy, bob, shakeX, isSlowed, time);
  }

  if (spriteImg && (spriteMode === 'replace' || spriteMode === 'over')) {
    drawSpriteAt(ctx, spriteImg, cx + shakeX, cy + bob * 0.5, spriteW, spriteH, {
      offsetX: ed.spriteOffsetX,
      offsetY: ed.spriteOffsetY,
      flipX: ed.spriteFlipX,
      opacity: ed.spriteOpacity,
    });
  }

  if (isBurning) {
    ctx.strokeStyle = statuses?.burnRingColor ?? 'rgba(249, 115, 22, 0.85)';
    ctx.lineWidth = statuses?.burnRingWidth ?? 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (enemy.customTintColor) {
    ctx.strokeStyle = enemy.customTintColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 23, 0, Math.PI * 2);
    ctx.stroke();
  }

  if ((enemy.stunTimer ?? 0) > 0) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (enemy.hitFlash > 0) {
    const hitRgb = statuses?.enemyHitFlashRgb ?? '255, 255, 255';
    ctx.fillStyle = `rgba(${hitRgb}, ${enemy.hitFlash * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  const ui = DESIGN_CATALOG.ui;
  const topY = BOARD_LAYOUT.padTop + (Math.min(...spanRows) - enemy.skyOffsetRows) * BOARD_LAYOUT.cellSize;

  if (ed.showHpBar ?? true) {
    const barW = ed.barWidth;
    const barH = ed.hpBarHeight ?? ui.enemyHpBarHeight ?? 5;
    const barOffY = ed.hpBarOffsetY ?? ui.enemyHpBarOffsetY ?? 5;
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = ui.hpBarBg;
    ctx.fillRect(cx - barW / 2, topY + barOffY, barW, barH);
    ctx.fillStyle = ed.hpBar;
    ctx.fillRect(cx - barW / 2, topY + barOffY, barW * hpRatio, barH);
  }

  if (ed.showCodeLabel ?? true) {
    ctx.fillStyle = ed.labelColor ?? ui.labelText;
    ctx.font = DESIGN_CATALOG.fonts?.enemyLabel ?? '600 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const codeLabel =
      enemy.type === 'scp_008' && enemy.hasRevived
        ? (ed.revivedLabel ?? '008*')
        : enemy.type === 'scp_096' && enemy.phase096 === 'enraged'
        ? (ed.enragedLabel ?? '096!')
        : ed.codeLabel;
    ctx.fillText(codeLabel, cx, topY + (ed.labelOffsetY ?? ui.enemyLabelOffsetY ?? 18));
  }

  if ((enemy.stunTimer ?? 0) > 0) {
    drawTowerTag(ctx, cx, topY + BOARD_LAYOUT.cellSize - 11, 'ATURD.', '#38BDF8', '#BAE6FD');
  } else if (enemy.customBadge) {
    drawTowerTag(
      ctx,
      cx,
      topY + BOARD_LAYOUT.cellSize - 11,
      enemy.customBadge.label,
      enemy.customBadge.color,
      enemy.customBadge.textColor ?? enemy.customBadge.color
    );
  }
}

function drawEnemyVectorShape(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  ed: EnemyDesignConfig,
  shape: string,
  cx: number,
  cy: number,
  bob: number,
  shakeX: number,
  isSlowed: boolean,
  time: number
) {
  const statuses = DESIGN_CATALOG.statuses;
  const strokeW = ed.strokeWidth ?? 2;
  const defaultSlowBody = statuses?.defaultSlowBody ?? '#67E8F9';
  const defaultSlowHead = statuses?.defaultSlowHead ?? '#A5F3FC';

  const customLayers = resolveCustomShapeLayers(ed.layers, shape);
  if (customLayers) {
    const enraged = enemy.phase096 === 'enraged';
    const convulsing = enemy.phase096 === 'convulsing';
    const conditions = new Set<CustomShapeCondition>();
    conditions.add(isSlowed ? 'slowed' : 'notSlowed');
    if (enraged) conditions.add('enraged');
    if (convulsing) conditions.add('convulsing');
    if (enemy.burnTimer > 0) conditions.add('burning');
    if (enemy.hp < enemy.maxHp * 0.5) conditions.add('damaged');

    drawCustomLayers(ctx, customLayers, cx, cy, {
      time,
      bob,
      shakeX,
      conditions,
      tokens: {
        body: isSlowed
          ? (ed.slowBody ?? defaultSlowBody)
          : enemy.hasRevived
          ? (ed.revivedBody ?? ed.body)
          : ed.body,
        stroke: enraged
          ? (ed.enragedStroke ?? ed.stroke)
          : enemy.hasRevived
          ? (ed.revivedStroke ?? ed.stroke)
          : ed.stroke,
        head: isSlowed ? (ed.slowHead ?? defaultSlowHead) : ed.head,
        headOrTop: isSlowed ? (ed.slowHead ?? defaultSlowHead) : ed.head,
        accent: enemy.hasRevived ? (ed.revivedAccent ?? ed.accent) : ed.accent,
        secondary: isSlowed ? (ed.slowDetail ?? ed.secondary) : ed.secondary,
        detail: ed.detail,
        aura: ed.aura ?? ed.glowColor,
        glow: ed.glowColor ?? ed.aura,
        slowBody: ed.slowBody ?? defaultSlowBody,
        slowHead: ed.slowHead ?? defaultSlowHead,
      },
    });
    return;
  }

  switch (shape) {
    case 'zombie': {
      const is049_2 = enemy.type === 'scp_049_2';
      ctx.fillStyle = isSlowed
        ? (ed.slowBody ?? defaultSlowBody)
        : enemy.hasRevived
        ? (ed.revivedBody ?? '#86EFAC')
        : ed.body;
      roundRect(ctx, cx - 13, cy - 6 + bob, 26, 28, 5);
      ctx.fill();
      ctx.strokeStyle = is049_2 || enemy.hasRevived ? (ed.revivedStroke ?? '#15803D') : ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = ed.detail ?? (is049_2 ? '#14532D' : '#991B1B');
      ctx.fillRect(cx - 8, cy + 2 + bob, 6, 8);

      ctx.fillStyle = isSlowed ? (ed.slowHead ?? defaultSlowHead) : ed.head;
      ctx.beginPath();
      ctx.arc(cx - 1, cy - 16 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = enemy.hasRevived ? (ed.revivedAccent ?? '#22C55E') : ed.accent;
      ctx.fillRect(cx - 8, cy - 18 + bob, 4, 3);
      break;
    }

    case 'wraith': {
      const auraR = (ed.auraRadius ?? 26) + Math.sin(time * (ed.auraPulseSpeed ?? 5)) * 3;
      ctx.fillStyle = ed.aura ?? 'rgba(139, 92, 246, 0.22)';
      ctx.beginPath();
      ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#7DD3FC') : ed.body;
      roundRect(ctx, cx - 10, cy - 9 + bob, 20, 32, 8);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = isSlowed ? (ed.slowHead ?? '#BAE6FD') : ed.head;
      ctx.beginPath();
      ctx.ellipse(cx - 2, cy - 19 + bob, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 20 + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'quadruped': {
      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#67E8F9') : ed.body;
      roundRect(ctx, cx - 22, cy - 2 + bob, 40, 20, 9);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = ed.accent;
      for (let i = -12; i <= 10; i += 8) {
        ctx.beginPath();
        ctx.moveTo(cx + i, cy - 2 + bob);
        ctx.lineTo(cx + i + 4, cy - 10 + bob);
        ctx.lineTo(cx + i + 8, cy - 2 + bob);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = isSlowed ? (ed.slowHead ?? '#38BDF8') : ed.head;
      ctx.beginPath();
      ctx.arc(cx - 20, cy + 3 + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ed.detail ?? '#F8FAFC';
      ctx.fillRect(cx - 28, cy + 4 + bob, 8, 3);
      break;
    }

    case 'sculpture': {
      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#93C5FD') : ed.body;
      roundRect(ctx, cx - 17, cy - 11, 34, 35, 7);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = ed.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.strokeStyle = ed.detail ?? '#78350F';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 17, cy - 4);
      ctx.lineTo(cx - 25, cy - 10);
      ctx.moveTo(cx + 17, cy - 4);
      ctx.lineTo(cx + 25, cy - 10);
      ctx.stroke();

      ctx.fillStyle = isSlowed ? (ed.slowHead ?? '#BFDBFE') : ed.head;
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.stroke();

      ctx.fillStyle = ed.accent;
      ctx.fillRect(cx - 8, cy - 24, 4, 5);
      ctx.fillRect(cx - 2, cy - 24, 4, 5);
      ctx.fillRect(cx - 6, cy - 16, 7, 3);
      break;
    }

    case 'plague_doc': {
      ctx.fillStyle = ed.aura ?? 'rgba(34, 197, 94, 0.16)';
      ctx.beginPath();
      ctx.arc(cx, cy, (ed.auraRadius ?? 26) + Math.sin(time * (ed.auraPulseSpeed ?? 4)) * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#0E7490') : ed.body;
      roundRect(ctx, cx - 14, cy - 8 + bob, 28, 32, 7);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = ed.head;
      ctx.beginPath();
      ctx.arc(cx, cy - 17 + bob, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.moveTo(cx - 19, cy - 15 + bob);
      ctx.lineTo(cx - 2, cy - 22 + bob);
      ctx.lineTo(cx - 2, cy - 11 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = ed.detail ?? '#4ADE80';
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 18 + bob, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'masked': {
      const auraAlpha = 0.45 + 0.3 * Math.sin(time * (ed.auraPulseSpeed ?? 5));
      ctx.strokeStyle = resolvePulseColor(ed.aura, auraAlpha, '236, 72, 153');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 4, (ed.auraRadius ?? 24) + Math.sin(time * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#155E75') : ed.body;
      roundRect(ctx, cx - 13, cy - 6 + bob, 26, 28, 6);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = ed.head;
      ctx.beginPath();
      ctx.ellipse(cx - 1, cy - 16 + bob, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ed.detail ?? '#09090B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = ed.detail ?? '#09090B';
      ctx.fillRect(cx - 7, cy - 20 + bob, 4, 4);
      ctx.fillRect(cx + 1, cy - 20 + bob, 4, 4);
      ctx.fillRect(cx - 5, cy - 12 + bob, 7, 3);
      break;
    }

    case 'parchment': {
      const floatY = bob !== 0 ? bob : Math.sin(time * 4) * 3;
      ctx.fillStyle = ed.aura ?? 'rgba(220, 38, 38, 0.22)';
      ctx.beginPath();
      ctx.arc(cx, cy + floatY, ed.auraRadius ?? 27, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ed.body;
      roundRect(ctx, cx - 16, cy - 20 + floatY, 32, 40, 4);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = ed.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.strokeStyle = ed.head;
      ctx.lineWidth = 1.5;
      for (let sy = -10; sy <= 10; sy += 7) {
        ctx.beginPath();
        ctx.moveTo(cx - 11, cy + sy + floatY);
        ctx.lineTo(cx + 11, cy + sy + floatY);
        ctx.stroke();
      }
      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 3 + floatY, 3, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy + 4 + floatY, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'shy_guy': {
      const enraged = enemy.phase096 === 'enraged';
      const convulsing = enemy.phase096 === 'convulsing';

      if (enraged || convulsing) {
        ctx.fillStyle = ed.aura ?? 'rgba(239, 68, 68, 0.24)';
        ctx.beginPath();
        ctx.arc(cx + shakeX, cy, ed.auraRadius ?? 29, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#BAE6FD') : ed.body;
      roundRect(ctx, cx - 11 + shakeX, cy - 12 + bob, 22, 34, 7);
      ctx.fill();
      ctx.strokeStyle = enraged ? (ed.enragedStroke ?? '#DC2626') : ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.strokeStyle = isSlowed ? (ed.slowDetail ?? '#BAE6FD') : (ed.secondary ?? '#E2E8F0');
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 11 + shakeX, cy - 4 + bob);
      ctx.lineTo(cx - 24 + shakeX, cy + 16 + bob);
      ctx.moveTo(cx + 11 + shakeX, cy - 4 + bob);
      ctx.lineTo(cx + 22 + shakeX, cy + 16 + bob);
      ctx.stroke();

      ctx.fillStyle = isSlowed ? (ed.slowHead ?? '#E0F2FE') : ed.head;
      ctx.beginPath();
      ctx.arc(cx + shakeX, cy - 21 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = enraged ? (ed.enragedStroke ?? '#DC2626') : ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      if (convulsing || enraged) {
        ctx.fillStyle = ed.enragedMouth ?? '#7F1D1D';
        ctx.fillRect(cx - 5 + shakeX, cy - 20 + bob, 8, 9);
        ctx.fillStyle = ed.accent;
        ctx.fillRect(cx - 6 + shakeX, cy - 25 + bob, 3, 3);
      } else {
        ctx.fillStyle = ed.detail ?? '#1E293B';
        ctx.fillRect(cx - 6, cy - 23 + bob, 4, 2);
      }
      break;
    }

    case 'vase': {
      ctx.fillStyle = ed.body;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 20, 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = ed.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.fillStyle = ed.head;
      roundRect(ctx, cx - 14, cy - 23, 28, 9, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx - 6, cy, 3, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'spawnling': {
      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#38BDF8') : ed.body;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6 + bob, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx - 7, cy + 4 + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'corrosive': {
      ctx.fillStyle = ed.aura ?? 'rgba(20, 12, 8, 0.65)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 22, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#334155') : ed.body;
      roundRect(ctx, cx - 14, cy - 10 + bob, 28, 33, 6);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = ed.head;
      ctx.beginPath();
      ctx.arc(cx, cy - 20 + bob, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ed.accent;
      ctx.fillRect(cx - 7, cy - 23 + bob, 4, 3);
      ctx.fillRect(cx + 1, cy - 23 + bob, 4, 3);
      break;
    }

    case 'yarn_eyes': {
      ctx.fillStyle = ed.aura ?? 'rgba(225, 29, 72, 0.24)';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, (ed.auraRadius ?? 27) + Math.sin(time * (ed.auraPulseSpeed ?? 5)) * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#38BDF8') : ed.body;
      ctx.beginPath();
      ctx.arc(cx, cy + 2 + bob, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = ed.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.strokeStyle = ed.head;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + 2 + bob, 13, 0.3, Math.PI * 1.4);
      ctx.stroke();

      const eyes = [
        [-8, -4],
        [6, -6],
        [-2, 5],
        [9, 6],
        [-10, 8],
      ];
      for (const [ex, ey] of eyes) {
        ctx.fillStyle = ed.accent;
        ctx.beginPath();
        ctx.arc(cx + ex, cy + ey + bob, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ed.detail ?? '#09090B';
        ctx.beginPath();
        ctx.arc(cx + ex, cy + ey + bob, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'crt_ai': {
      ctx.fillStyle = ed.aura ?? 'rgba(34, 197, 94, 0.20)';
      ctx.beginPath();
      ctx.arc(cx, cy, ed.auraRadius ?? 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ed.body;
      roundRect(ctx, cx - 22, cy + 10, 44, 14, 3);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = ed.body;
      roundRect(ctx, cx - 20, cy - 24, 40, 34, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ed.head;
      roundRect(ctx, cx - 15, cy - 19, 30, 24, 2);
      ctx.fill();

      ctx.fillStyle = ed.accent;
      ctx.fillRect(cx - 9, cy - 13, 5, 5);
      ctx.fillRect(cx + 4, cy - 13, 5, 5);
      ctx.fillRect(cx - 8, cy - 3, 16, 3);
      break;
    }

    case 'bounce_ball': {
      const speedNorm = Math.min(1, enemy.currentSpeed / 3.0);
      const bounceAmp = ed.bobAmount ?? 24;
      const bounceY = Math.abs(Math.sin(enemy.animPhase * (4.5 + speedNorm * 7))) * bounceAmp;

      ctx.strokeStyle = ed.secondary ?? 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 3;
      for (let t = 0; t < 3; t++) {
        ctx.beginPath();
        ctx.moveTo(cx + 12 + t * 5, cy - bounceY - 5 + t * 5);
        ctx.lineTo(cx + 26 + t * 8, cy - bounceY - 5 + t * 5);
        ctx.stroke();
      }

      ctx.fillStyle = ed.aura ?? 'rgba(239, 68, 68, 0.28)';
      ctx.beginPath();
      ctx.arc(cx, cy - bounceY, ed.auraRadius ?? 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ed.body;
      ctx.beginPath();
      ctx.arc(cx, cy - bounceY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = ed.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.fillStyle = ed.head;
      ctx.beginPath();
      ctx.arc(cx - 4, cy - bounceY - 4, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx + 4, cy - bounceY + 3, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'heart_beast': {
      const beat = 1 + Math.sin(time * (ed.auraPulseSpeed ?? 12)) * 0.08;
      ctx.fillStyle = ed.aura ?? 'rgba(225, 29, 72, 0.26)';
      ctx.beginPath();
      ctx.arc(cx, cy, (ed.auraRadius ?? 24) * beat, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = 3;
      for (let lx = -12; lx <= 12; lx += 8) {
        const legShift = Math.sin(enemy.animPhase * 16 + lx) * 4;
        ctx.beginPath();
        ctx.moveTo(cx + lx, cy + 8);
        ctx.lineTo(cx + lx - 4 + legShift, cy + 22);
        ctx.stroke();
      }

      ctx.fillStyle = ed.body;
      ctx.beginPath();
      ctx.ellipse(cx, cy + bob, 16 * beat, 18 * beat, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = ed.strokeWidth ?? 2.5;
      ctx.stroke();

      ctx.fillStyle = ed.head;
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 11 + bob, 7, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 11 + bob, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 2 + bob, 3, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy + 2 + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'reptile_giant': {
      ctx.fillStyle = ed.aura ?? 'rgba(132, 204, 22, 0.20)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 42, 62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ed.stroke;
      ctx.beginPath();
      ctx.moveTo(cx + 14, cy + 10 + bob);
      ctx.lineTo(cx + 42, cy + 36 + bob);
      ctx.lineTo(cx + 22, cy + 44 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#38BDF8') : ed.body;
      roundRect(ctx, cx - 26, cy - 42 + bob, 54, 84, 16);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = ed.strokeWidth ?? 3.5;
      ctx.stroke();

      ctx.fillStyle = ed.head;
      for (let sy = -32; sy <= 26; sy += 15) {
        ctx.beginPath();
        ctx.moveTo(cx + 6, cy + sy + bob);
        ctx.lineTo(cx + 22, cy + sy + 6 + bob);
        ctx.lineTo(cx + 6, cy + sy + 12 + bob);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = isSlowed ? (ed.slowHead ?? '#7DD3FC') : ed.head;
      roundRect(ctx, cx - 38, cy - 24 + bob, 34, 42, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ed.detail ?? '#F8FAFC';
      for (let ty = -14; ty <= 10; ty += 8) {
        ctx.fillRect(cx - 41, cy + ty + bob, 6, 4);
      }

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx - 26, cy - 12 + bob, 4, 0, Math.PI * 2);
      ctx.arc(cx - 26, cy + 6 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      ctx.fillStyle = isSlowed ? (ed.slowBody ?? '#67E8F9') : ed.body;
      roundRect(ctx, cx - 14, cy - 4 + bob, 28, 28, 7);
      ctx.fill();
      ctx.strokeStyle = ed.stroke;
      ctx.lineWidth = strokeW;
      ctx.stroke();

      ctx.fillStyle = isSlowed ? (ed.slowHead ?? '#A5F3FC') : ed.head;
      ctx.beginPath();
      ctx.arc(cx, cy - 14 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = ed.accent;
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 15 + bob, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 3, cy - 15 + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const { cellSize, gateWidth, padTop } = BOARD_LAYOUT;
  const x = gateWidth + proj.col * cellSize + cellSize / 2;
  const y = padTop + proj.row * cellSize + cellSize / 2 - 1;
  const pd = getProjectileDesign(proj.kind);

  ctx.save();
  if (pd.glowColor) {
    ctx.shadowColor = pd.glowColor;
    ctx.shadowBlur = pd.glowBlur ?? 8;
  }

  const sprite = getCachedImage(pd.sprite);
  if (sprite) {
    const rotRad = ((pd.rotationDeg ?? 0) * Math.PI) / 180;
    const w = pd.spriteWidth ?? pd.radius * 3;
    const h = pd.spriteHeight ?? pd.radius * 3;
    if (rotRad !== 0) {
      ctx.translate(x, y);
      ctx.rotate(rotRad);
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(sprite, x - w / 2, y - h / 2, w, h);
    }
    ctx.restore();
    return;
  }

  const shape =
    pd.shape ??
    (proj.kind === 'shotgun'
      ? 'pellet_cluster'
      : proj.kind === 'sniper' || proj.kind === 'turret' || proj.kind === 'mtf' || proj.kind === 'heavy'
      ? 'streak'
      : 'circle');

  const customLayers = resolveCustomShapeLayers(pd.layers, shape);
  if (customLayers) {
    drawCustomLayers(ctx, customLayers, x, y, {
      time: 0,
      conditions: new Set<CustomShapeCondition>(),
      tokens: {
        body: pd.color,
        color: pd.color,
        core: pd.coreColor,
        accent: pd.coreColor,
        stroke: pd.glowColor ?? pd.color,
        glow: pd.glowColor,
      },
    });
    ctx.restore();
    return;
  }

  if (shape === 'pellet_cluster') {
    const spread = pd.pelletSpread ?? 4;
    ctx.fillStyle = pd.color;
    ctx.beginPath();
    ctx.arc(x, y - spread, pd.radius, 0, Math.PI * 2);
    ctx.arc(x + 3, y, pd.radius, 0, Math.PI * 2);
    ctx.arc(x, y + spread, pd.radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'streak') {
    ctx.fillStyle = pd.color;
    const len = pd.length ?? (proj.kind === 'sniper' ? 24 : proj.kind === 'turret' ? 18 : 14);
    roundRect(ctx, x - len / 2, y - pd.radius / 2, len, pd.radius, pd.cornerRadius ?? 2);
    ctx.fill();
  } else {
    ctx.fillStyle = pd.color;
    ctx.beginPath();
    ctx.arc(x, y, pd.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pd.coreColor;
    ctx.beginPath();
    ctx.arc(x, y, pd.radius * (pd.coreRatio ?? 0.45), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEffect(ctx: CanvasRenderingContext2D, fx: VisualEffect) {
  const { cellSize, gateWidth, padTop } = BOARD_LAYOUT;
  const x = gateWidth + fx.col * cellSize + cellSize / 2;
  const y = padTop + fx.row * cellSize + cellSize / 2;
  const progress = Math.min(1, fx.timer / fx.duration);
  const ef = DESIGN_CATALOG.effects;

  ctx.save();
  if (fx.kind === 'explosion') {
    const radius = (ef.explosionBaseRadius ?? 16) + progress * (ef.explosionExpandRadius ?? 64);
    ctx.strokeStyle = `rgba(${ef.explosionStroke}, ${1 - progress})`;
    ctx.lineWidth = (ef.explosionLineWidth ?? 6) * (1 - progress);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(${ef.explosionFill}, ${(1 - progress) * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (fx.kind === 'stun_wave') {
    const radius = (ef.stunWaveBaseRadius ?? 18) + progress * (ef.stunWaveExpandRadius ?? 170);
    ctx.strokeStyle = `rgba(${ef.stunWave}, ${1 - progress})`;
    ctx.lineWidth = (ef.stunWaveLineWidth ?? 4) * (1 - progress);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'scream_wave_066') {
    const radius = (ef.scream066BaseRadius ?? 24) + progress * (ef.scream066ExpandRadius ?? 225);
    ctx.strokeStyle = `rgba(${ef.screamWave066}, ${1 - progress})`;
    ctx.lineWidth = (ef.scream066LineWidth ?? 5) * (1 - progress);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'pocket_portal') {
    const radius = (ef.pocketPortalBaseRadius ?? 8) + progress * (ef.pocketPortalExpandRadius ?? 38);
    ctx.strokeStyle = `rgba(${ef.pocketPortal}, ${1 - progress})`;
    ctx.lineWidth = ef.pocketPortalLineWidth ?? 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'pull_beam' && fx.targetRow !== undefined && fx.targetCol !== undefined) {
    const tx = gateWidth + fx.targetCol * cellSize + cellSize / 2;
    const ty = padTop + fx.targetRow * cellSize + cellSize / 2;
    ctx.strokeStyle = `rgba(${ef.pullBeam}, ${1 - progress})`;
    ctx.lineWidth = ef.pullBeamWidth ?? 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  } else if (fx.kind === 'muzzle') {
    ctx.fillStyle = `rgba(${ef.muzzle}, ${1 - progress})`;
    ctx.beginPath();
    ctx.arc(x + (ef.muzzleOffsetX ?? 22), y - 1, (ef.muzzleBaseRadius ?? 7) * (1 - progress) + 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (fx.kind === 'cryo_hit') {
    ctx.strokeStyle = `rgba(${ef.cryoHit}, ${1 - progress})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, (ef.cryoHitBaseRadius ?? 10) + progress * (ef.cryoHitExpandRadius ?? 16), 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'burn_hit') {
    ctx.strokeStyle = `rgba(${ef.burnHit}, ${1 - progress})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, (ef.burnHitBaseRadius ?? 10) + progress * (ef.burnHitExpandRadius ?? 14), 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'tesla_arc' && fx.targetRow !== undefined && fx.targetCol !== undefined) {
    const tx = gateWidth + fx.targetCol * cellSize + cellSize / 2;
    const ty = padTop + fx.targetRow * cellSize + cellSize / 2;
    ctx.strokeStyle = `rgba(${ef.teslaArc}, ${1 - progress})`;
    ctx.lineWidth = ef.teslaArcWidth ?? 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo((x + tx) / 2, (y + ty) / 2 - 12);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  } else if (fx.kind === 'heal_ring') {
    ctx.strokeStyle = `rgba(${ef.healRing}, ${1 - progress})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, (ef.healRingBaseRadius ?? 14) + progress * (ef.healRingExpandRadius ?? 90), 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'revive_ring') {
    ctx.strokeStyle = `rgba(${ef.reviveRing}, ${1 - progress})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, (ef.reviveRingBaseRadius ?? 10) + progress * (ef.reviveRingExpandRadius ?? 34), 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'bounce_impact') {
    const radius = (ef.bounceImpactBaseRadius ?? 12) + progress * (ef.bounceImpactExpandRadius ?? 46);
    ctx.strokeStyle = `rgba(${ef.bounceImpact}, ${1 - progress})`;
    ctx.lineWidth = (ef.bounceImpactLineWidth ?? 4) * (1 - progress);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'ring') {
    const radius = 12 + progress * (fx.radiusPx ?? 64);
    const col = fx.color ?? '#38BDF8';
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = /^\d+\s*,\s*\d+\s*,\s*\d+$/.test(col.trim())
      ? `rgba(${col}, ${1 - progress})`
      : col;
    ctx.lineWidth = Math.max(1.5, 4 * (1 - progress));
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.kind === 'text' && fx.text) {
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = fx.color || ef.floatingTextDefaultColor || '#F59E0B';
    ctx.font = DESIGN_CATALOG.fonts?.floatingText ?? '700 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fx.text, x, y - 18 - progress * (ef.floatingTextRisePx ?? 22));
  }
  ctx.restore();
}

function drawEnergyDrop(ctx: CanvasRenderingContext2D, drop: EnergyDrop, time: number) {
  const { cellSize, gateWidth, padTop } = BOARD_LAYOUT;
  const x = gateWidth + drop.xCol * cellSize + cellSize / 2;
  const y = padTop + drop.yRow * cellSize + cellSize / 2;
  const ui = DESIGN_CATALOG.ui;

  const blink = drop.lifetime > drop.maxLifetime - 2.5 ? Math.sin(time * 14) > 0 : true;
  if (!blink) return;

  ctx.save();
  const radius = ui.energyDropRadius ?? 13;
  const halo = (ui.energyDropHaloBase ?? 18) + Math.sin(time * 5) * (ui.energyDropHaloAmp ?? 2.5);
  ctx.fillStyle = ui.energyDropGlow;
  ctx.beginPath();
  ctx.arc(x, y, halo, 0, Math.PI * 2);
  ctx.fill();

  const sprite = getCachedImage(ui.energyDropSprite);
  if (sprite) {
    drawSpriteAt(ctx, sprite, x, y, radius * 2.2, radius * 2.2);
  } else {
    ctx.fillStyle = ui.energyDropBg;
    ctx.strokeStyle = ui.energyDropStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = ui.energyDropText;
  ctx.font = DESIGN_CATALOG.fonts?.energyDrop ?? '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`+${drop.amount}`, x, y + 0.5);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
