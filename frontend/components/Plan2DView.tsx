"use client";
import React from "react";
import { LayoutResponse } from "../lib/types";

const colorByType: Record<string, string> = {
  bedroom: "#93c5fd",
  bathroom: "#fca5a5",
  kitchen: "#fde68a",
  living: "#86efac",
  storage: "#d8b4fe",
  stair: "#cbd5e1",
  balcony: "#99f6e4",
  veranda: "#f9a8d4",
  garden: "#bbf7d0",
  parking: "#d1d5db",
  pool: "#67e8f9",
  land: "#e5e7eb",
  inner: "#e2e8f0"
};

function computeBounds(layout: LayoutResponse) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const consume = (pts: [number, number][]) => {
    pts.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
  };
  layout.rooms.forEach(r => r.polygons.forEach(p => consume(p.exterior)));
  layout.walls.forEach(p => consume(p.exterior));
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

export default function Plan2DView({ layout }: { layout: LayoutResponse | null }) {
  if (!layout) return <div className="card">No layout loaded</div>;

  const { minX, minY, maxX, maxY } = computeBounds(layout);
  const W = 560, H = 560, pad = 20;
  const sx = (W - 2 * pad) / Math.max(1e-6, maxX - minX);
  const sy = (H - 2 * pad) / Math.max(1e-6, maxY - minY);
  const s = Math.min(sx, sy);

  const p2s = ([x, y]: [number, number]) => `${(x - minX) * s + pad},${H - ((y - minY) * s + pad)}`;

  return (
    <div className="card">
      <h3>2D Plan (Top view)</h3>
      <svg width={W} height={H} style={{ border: "1px solid #ddd", background: "#fff" }}>
        {layout.rooms.map((room, i) =>
          room.polygons.map((poly, j) => (
            <polygon
              key={`r-${i}-${j}`}
              points={poly.exterior.map(p2s).join(" ")}
              fill={colorByType[room.type] || "#eee"}
              stroke="#555"
              strokeWidth={0.8}
              opacity={0.75}
            />
          ))
        )}
        {layout.walls.map((w, i) => (
          <polygon
            key={`w-${i}`}
            points={w.exterior.map(p2s).join(" ")}
            fill="#2f3136"
            stroke="#2f3136"
            strokeWidth={0.4}
            opacity={0.9}
          />
        ))}
      </svg>
      <div className="small">ID: {layout.id} | unitType: {layout.unitType || "N/A"}</div>
    </div>
  );
}