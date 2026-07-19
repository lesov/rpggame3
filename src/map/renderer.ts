/**
 * Canvas map renderer. The full map (cells, borders, rivers, routes) is
 * rasterized once per display mode into an offscreen base bitmap used at low
 * zoom; past VECTOR_ZOOM the visible cells are redrawn as vectors so zoomed
 * terrain stays crisp. Burgs, labels and markers are drawn per frame in
 * screen space.
 */
import type { WorldData } from '../data/worldLoader';

export interface ViewTransform {
  x: number; // screen offset of world origin
  y: number;
  k: number; // zoom (screen px per world px)
}

export interface RenderOptions {
  mode: 'biome' | 'political';
  showMarkers: boolean;
  showRoutes: boolean;
  showLabels: boolean;
}

export interface RenderExtras {
  selection?: { x: number; y: number; cellId: number };
  focus?: { x: number; y: number };
  eventHighlight?: { x: number; y: number; radiusWorld: number; kind: string; anchor?: boolean };
  travelTarget?: { x: number; y: number; name: string; kind: 'burg' | 'marker' };
  player?: { x: number; y: number; name: string };
}

const VECTOR_ZOOM = 3;
const OCEAN = '#26436e';
const NEUTRAL_STATE = '#6f7a6a';

export function fitView(width: number, height: number, mapW: number, mapH: number): ViewTransform {
  const k = Math.min(width / mapW, height / mapH);
  return { k, x: (width - mapW * k) / 2, y: (height - mapH * k) / 2 };
}

export class MapRenderer {
  private baseCache = new Map<string, HTMLCanvasElement>();

  constructor(private wd: WorldData) {}

  private cellFill(cellId: number, mode: RenderOptions['mode']): string {
    const c = this.wd.geometry.cells[cellId];
    if (c.h < 20) {
      // Water: shade slightly by depth; lakes a touch lighter.
      const az = c.t === -1 ? 1 : 0; // shallow shelf highlight
      const lake = this.wd.geometry.azgaarFeatures.find((f) => f.i === c.f)?.type === 'lake';
      if (lake) return '#3d6aa3';
      return az ? '#2e4d7c' : OCEAN;
    }
    if (mode === 'political') {
      if (c.state === 0) return NEUTRAL_STATE;
      return this.wd.stateById.get(c.state)?.color ?? NEUTRAL_STATE;
    }
    return this.wd.geometry.biomes[c.biome]?.color ?? '#888';
  }

  private drawCellPath(ctx: CanvasRenderingContext2D, poly: [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, mode: RenderOptions['mode'], cellIds?: Iterable<number>) {
    const cells = this.wd.geometry.cells;
    const ids = cellIds ?? cells.map((c) => c.i);
    for (const id of ids) {
      const c = cells[id];
      ctx.fillStyle = this.cellFill(id, mode);
      this.drawCellPath(ctx, c.poly);
      ctx.fill();
      // hairline stroke of same color hides antialiasing seams between cells
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  private drawRivers(ctx: CanvasRenderingContext2D, scale: number) {
    ctx.strokeStyle = '#5d8cc0';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const r of this.wd.world.rivers) {
      ctx.lineWidth = Math.min(0.6 + r.discharge / 300, 3.2) / scale;
      ctx.beginPath();
      ctx.moveTo(r.points[0][0], r.points[0][1]);
      for (let i = 1; i < r.points.length; i++) ctx.lineTo(r.points[i][0], r.points[i][1]);
      ctx.stroke();
    }
  }

  private drawRoutes(ctx: CanvasRenderingContext2D, scale: number) {
    for (const route of this.wd.world.routes) {
      if (route.group === 'searoutes') {
        ctx.strokeStyle = 'rgba(180, 205, 230, 0.45)';
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.lineWidth = 0.5 / scale;
      } else if (route.group === 'trails') {
        ctx.strokeStyle = 'rgba(120, 96, 60, 0.6)';
        ctx.setLineDash([2 / scale, 2 / scale]);
        ctx.lineWidth = 0.5 / scale;
      } else {
        ctx.strokeStyle = 'rgba(112, 82, 44, 0.85)';
        ctx.setLineDash([]);
        ctx.lineWidth = 0.9 / scale;
      }
      ctx.beginPath();
      ctx.moveTo(route.points[0][0], route.points[0][1]);
      for (let i = 1; i < route.points.length; i++) ctx.lineTo(route.points[i][0], route.points[i][1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  private drawStateBorders(ctx: CanvasRenderingContext2D, scale: number) {
    ctx.strokeStyle = 'rgba(20, 16, 12, 0.75)';
    ctx.lineWidth = 1.1 / scale;
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of this.wd.world.stateBorders) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  /** Full-map offscreen bitmap for a mode (cached). */
  private base(options: RenderOptions): HTMLCanvasElement {
    const key = `${options.mode}|${options.showRoutes}`;
    let canvas = this.baseCache.get(key);
    if (canvas) return canvas;
    const { width, height } = this.wd.geometry;
    const scale = 1.5; // slight supersample so mid-zoom stays acceptable
    canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.fillStyle = OCEAN;
    ctx.fillRect(0, 0, width, height);
    this.drawTerrain(ctx, options.mode);
    this.drawRivers(ctx, 1);
    if (options.showRoutes) this.drawRoutes(ctx, 1);
    this.drawStateBorders(ctx, 1);
    this.baseCache.set(key, canvas);
    return canvas;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    view: ViewTransform,
    options: RenderOptions,
    extras: RenderExtras = {},
  ) {
    const { width, height } = this.wd.geometry;
    ctx.fillStyle = '#10141b';
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.k, view.k);

    if (view.k < VECTOR_ZOOM) {
      const base = this.base(options);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(base, 0, 0, width, height);
    } else {
      // Vector pass over visible cells only.
      const x0 = -view.x / view.k;
      const y0 = -view.y / view.k;
      const x1 = x0 + viewW / view.k;
      const y1 = y0 + viewH / view.k;
      ctx.fillStyle = OCEAN;
      ctx.fillRect(Math.max(0, x0), Math.max(0, y0), Math.min(width, x1) - Math.max(0, x0), Math.min(height, y1) - Math.max(0, y0));
      const visible = this.wd.cellIndex.cellsInRect(x0 - 20, y0 - 20, x1 + 20, y1 + 20);
      this.drawTerrain(ctx, options.mode, visible);
      this.drawRivers(ctx, 1);
      if (options.showRoutes) this.drawRoutes(ctx, 1);
      this.drawStateBorders(ctx, 1);
    }
    ctx.restore();

    this.drawOverlay(ctx, viewW, viewH, view, options, extras);
  }

  private toScreen(view: ViewTransform, x: number, y: number): [number, number] {
    return [x * view.k + view.x, y * view.k + view.y];
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    view: ViewTransform,
    options: RenderOptions,
    extras: RenderExtras,
  ) {
    const onScreen = (sx: number, sy: number, pad = 30) =>
      sx > -pad && sy > -pad && sx < viewW + pad && sy < viewH + pad;

    // Event area highlight
    if (extras.eventHighlight) {
      const [sx, sy] = this.toScreen(view, extras.eventHighlight.x, extras.eventHighlight.y);
      const maxR = Math.max(viewW, viewH) * 0.78;
      const r = Math.min(Math.max(extras.eventHighlight.radiusWorld * view.k, 16), maxR);
      const isWar = extras.eventHighlight.kind === 'war';
      const isAnchor = Boolean(extras.eventHighlight.anchor);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = isWar
        ? 'rgba(198, 72, 54, 0.22)'
        : isAnchor
          ? 'rgba(242, 193, 78, 0.24)'
          : 'rgba(90, 155, 212, 0.22)';
      ctx.fill();
      ctx.lineWidth = isAnchor || isWar ? 2.5 : 2;
      ctx.strokeStyle = isWar
        ? 'rgba(239, 113, 91, 0.82)'
        : isAnchor
          ? 'rgba(242, 193, 78, 0.86)'
          : 'rgba(137, 190, 235, 0.82)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = isWar ? '#ef715b' : isAnchor ? '#f2c14e' : '#89beeb';
      ctx.fill();
      ctx.restore();
    }

    // Burgs
    for (const b of this.wd.world.burgs) {
      const [sx, sy] = this.toScreen(view, b.x, b.y);
      if (!onScreen(sx, sy)) continue;
      const r = Math.min(1.4 + Math.sqrt(b.population) / 45, 7) * Math.min(Math.max(view.k * 0.55, 0.8), 1.6);
      if (!b.capital && b.population < 5000 && view.k < 2.2) continue; // declutter small burgs zoomed out
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = b.capital ? '#f2c14e' : '#e8e2d4';
      ctx.fill();
      ctx.lineWidth = b.capital ? 1.6 : 1;
      ctx.strokeStyle = '#1c1712';
      ctx.stroke();
    }

    // Markers
    if (options.showMarkers && view.k >= 1.4) {
      ctx.font = `${Math.min(11 + view.k, 18)}px serif`;
      ctx.textAlign = 'center';
      for (const m of this.wd.world.markers) {
        const [sx, sy] = this.toScreen(view, m.x, m.y);
        if (!onScreen(sx, sy)) continue;
        ctx.fillText(m.icon, sx, sy);
      }
    }

    if (options.showLabels) {
      ctx.textAlign = 'center';
      // State labels
      for (const s of this.wd.world.states) {
        if (s.i === 0 || !s.pole) continue;
        const [sx, sy] = this.toScreen(view, s.pole[0], s.pole[1]);
        if (!onScreen(sx, sy, 120)) continue;
        const size = Math.min(Math.max(9 + Math.sqrt(s.cellCount) * 0.35 * view.k, 11), 34);
        if (view.k > 6) continue; // zoomed way in, state names just get in the way
        ctx.font = `600 ${size}px 'Segoe UI', sans-serif`;
        ctx.lineWidth = Math.max(size / 6, 2);
        ctx.strokeStyle = 'rgba(12, 10, 8, 0.75)';
        ctx.fillStyle = 'rgba(240, 234, 220, 0.92)';
        ctx.strokeText(s.name, sx, sy);
        ctx.fillText(s.name, sx, sy);
      }
      // Burg labels
      if (view.k >= 1.6) {
        ctx.font = `11px 'Segoe UI', sans-serif`;
        for (const b of this.wd.world.burgs) {
          const big = b.capital || b.population >= 20000;
          const medium = b.population >= 5000;
          if (view.k < 3 && !big) continue;
          if (view.k < 5.5 && !medium && !big) continue;
          const [sx, sy] = this.toScreen(view, b.x, b.y);
          if (!onScreen(sx, sy)) continue;
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(12, 10, 8, 0.8)';
          ctx.fillStyle = b.capital ? '#f2d491' : '#ded8ca';
          ctx.font = `${b.capital ? '600 ' : ''}${b.capital ? 12.5 : 11}px 'Segoe UI', sans-serif`;
          ctx.strokeText(b.name, sx, sy - 7);
          ctx.fillText(b.name, sx, sy - 7);
        }
      }
    }

    // Selection cross-hair ring
    if (extras.selection) {
      const [sx, sy] = this.toScreen(view, extras.selection.x, extras.selection.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#f2c14e';
      ctx.fill();
    }

    // Travel target marker
    if (extras.travelTarget) {
      const [sx, sy] = this.toScreen(view, extras.travelTarget.x, extras.travelTarget.y);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, 13, 0, Math.PI * 2);
      ctx.strokeStyle = '#5a9bd4';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(90, 155, 212, 0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#5a9bd4';
      ctx.fill();
      if (view.k >= 1.4) {
        ctx.textAlign = 'center';
        ctx.font = "700 12px 'Segoe UI', sans-serif";
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(12, 10, 8, 0.88)';
        ctx.fillStyle = '#c6e2ff';
        const label = `Travel: ${extras.travelTarget.name}`;
        ctx.strokeText(label, sx, sy + 29);
        ctx.fillText(label, sx, sy + 29);
      }
      ctx.restore();
    }

    // Player marker
    if (extras.player) {
      const [sx, sy] = this.toScreen(view, extras.player.x, extras.player.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f7f1df';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#2d8f68';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#2d8f68';
      ctx.fill();
      if (view.k >= 2) {
        ctx.textAlign = 'center';
        ctx.font = "600 12px 'Segoe UI', sans-serif";
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(12, 10, 8, 0.86)';
        ctx.fillStyle = '#f7f1df';
        ctx.strokeText(extras.player.name, sx, sy - 12);
        ctx.fillText(extras.player.name, sx, sy - 12);
      }
    }

    // Focus ping (recently jumped-to event location)
    if (extras.focus) {
      const [sx, sy] = this.toScreen(view, extras.focus.x, extras.focus.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(217, 108, 74, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}
