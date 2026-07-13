/**
 * Burg adjacency graph for NPC trade diffusion (framework §4.3). The route
 * export only carries polyline geometry, so we snap each route's endpoints to
 * the nearest burg and build edges between them, tagged with transport type and
 * capacity. Built once per WorldData and memoized.
 */
import type { WorldData } from '../data/worldLoader';
import type { Burg, Route } from '../data/types';

export type EdgeType = 'road' | 'trail' | 'sea';

export interface RouteEdge {
  a: number; // burg.i
  b: number; // burg.i
  type: EdgeType;
  km: number;
  capacity: number; // §4.3: road 1.0, trail 0.4, sea 2.5
}

export interface TradeGraph {
  edges: RouteEdge[];
  neighbors: Map<number, { burg: number; type: EdgeType; km: number; capacity: number }[]>;
}

const CAPACITY: Record<EdgeType, number> = { road: 1.0, trail: 0.4, sea: 2.5 };

function edgeTypeOf(group: string): EdgeType {
  if (group === 'roads') return 'road';
  if (group === 'searoutes') return 'sea';
  return 'trail';
}

function nearestBurgId(burgs: Burg[], x: number, y: number): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const burg of burgs) {
    const dx = burg.x - x;
    const dy = burg.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = burg.i;
    }
  }
  return best;
}

function routeLengthMi(wd: WorldData, route: Route): number {
  let km = 0;
  const pts = route.points;
  for (let i = 1; i < pts.length; i++) {
    km += wd.distanceMi(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }
  return km;
}

const CACHE = new WeakMap<WorldData, TradeGraph>();

export function buildRouteGraph(wd: WorldData): TradeGraph {
  const cached = CACHE.get(wd);
  if (cached) return cached;

  const burgs = wd.world.burgs;
  const edges: RouteEdge[] = [];
  const seen = new Map<string, RouteEdge>();

  for (const route of wd.world.routes) {
    if (route.points.length < 2) continue;
    const first = route.points[0];
    const last = route.points[route.points.length - 1];
    const a = nearestBurgId(burgs, first[0], first[1]);
    const b = nearestBurgId(burgs, last[0], last[1]);
    if (a == null || b == null || a === b) continue;
    const type = edgeTypeOf(route.group);
    const km = Math.max(1, routeLengthMi(wd, route) * 1.609);
    const key = a < b ? `${a}-${b}-${type}` : `${b}-${a}-${type}`;
    const existing = seen.get(key);
    if (existing) {
      if (km < existing.km) existing.km = km; // keep the shortest connection
      continue;
    }
    const edge: RouteEdge = { a, b, type, km, capacity: CAPACITY[type] };
    seen.set(key, edge);
    edges.push(edge);
  }

  const neighbors = new Map<number, { burg: number; type: EdgeType; km: number; capacity: number }[]>();
  const link = (from: number, to: number, e: RouteEdge) => {
    const list = neighbors.get(from) ?? [];
    list.push({ burg: to, type: e.type, km: e.km, capacity: e.capacity });
    neighbors.set(from, list);
  };
  for (const e of edges) {
    link(e.a, e.b, e);
    link(e.b, e.a, e);
  }

  const graph: TradeGraph = { edges, neighbors };
  CACHE.set(wd, graph);
  return graph;
}

/** Neighbours of a burg in the trade graph. */
export function neighborsOf(graph: TradeGraph, burgId: number) {
  return graph.neighbors.get(burgId) ?? [];
}
