import { useEffect, useMemo, useRef } from 'react';
import { MapRenderer, fitView, type ViewTransform } from '../map/renderer';
import { useGame } from './store';

export function MapView() {
  const { state, dispatch, wd } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<ViewTransform | null>(null);
  const consumedJumpRef = useRef(0);
  const dragRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number; moved: boolean } | null>(null);
  const renderer = useMemo(() => new MapRenderer(wd), [wd]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    if (!viewRef.current) viewRef.current = fitView(w, h, wd.geometry.width, wd.geometry.height);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = stateRef.current;
    renderer.draw(ctx, w, h, viewRef.current, s.options, {
      selection: s.selection ?? undefined,
      focus: s.focus ?? undefined,
      travelTarget: s.travelTarget ?? undefined,
      player: s.player ? { x: s.player.location.x, y: s.player.location.y, name: s.player.name } : undefined,
    });
  };

  // Redraw on any game-state change and on resize.
  useEffect(() => {
    redraw();
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => redraw());
    obs.observe(canvas);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Consume jump commands from the store (event feed / nearby clicks).
  useEffect(() => {
    const jump = state.jump;
    const canvas = canvasRef.current;
    if (!jump || !canvas || jump.seq === consumedJumpRef.current) return;
    consumedJumpRef.current = jump.seq;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const view = viewRef.current ?? fitView(w, h, wd.geometry.width, wd.geometry.height);
    const k = Math.max(view.k, jump.minZoom ?? 4);
    viewRef.current = { k, x: w / 2 - jump.x * k, y: h / 2 - jump.y * k };
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.jump]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const view = viewRef.current;
    if (!view) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const view = viewRef.current;
    if (!drag || !view) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.moved) {
      viewRef.current = { ...view, x: drag.viewX + dx, y: drag.viewY + dy };
      redraw();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    const view = viewRef.current;
    if (!drag || !view) return;
    if (drag.moved) return; // it was a pan
    // Click: hit-test to a cell.
    const rect = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - rect.left - view.x) / view.k;
    const wy = (e.clientY - rect.top - view.y) / view.k;
    const cellId = wd.cellIndex.cellAt(wx, wy);
    if (cellId !== null) {
      const c = wd.geometry.cells[cellId];
      dispatch({ type: 'select', selection: { cellId, x: c.p[0], y: c.p[1] } });
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const view = viewRef.current;
    const canvas = canvasRef.current;
    if (!view || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const minK = fitView(canvas.clientWidth, canvas.clientHeight, wd.geometry.width, wd.geometry.height).k * 0.8;
    const k = Math.min(Math.max(view.k * factor, minK), 40);
    const wx = (mx - view.x) / view.k;
    const wy = (my - view.y) / view.k;
    viewRef.current = { k, x: mx - wx * k, y: my - wy * k };
    redraw();
  };

  return (
    <canvas
      ref={canvasRef}
      className="map-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    />
  );
}
