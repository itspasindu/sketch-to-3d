"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls, TransformControls } from "@react-three/drei";

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  bg:          "#080c12",
  surface:     "#161b22",
  surfaceHov:  "#1c2330",
  border:      "#30363d",
  borderAcc:   "#388bfd",
  text:        "#e6edf3",
  textMuted:   "#7d8590",
  accent:      "#388bfd",
  accentGlow:  "rgba(56,139,253,0.15)",
  success:     "#3fb950",
  danger:      "#f85149",
  dangerBg:    "rgba(248,81,73,0.10)",
  dangerBdr:   "rgba(248,81,73,0.30)",
  panelShadow: "0 8px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.04)",
  kbd:         "#21262d",
  kbdBorder:   "#30363d",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type Poly = { exterior: number[][]; holes?: number[][][] };
type Room = { type?: string; polygons: Poly[] };
type Layout = { wall_height_m?: number; walls: Poly[]; rooms?: Room[] };
type FurnitureKind = "sofa" | "bed" | "table" | "counter";
type FurnitureItem = {
  id: string;
  kind: FurnitureKind;
  pos: [number, number, number];
  rotY?: number;
};

const ICONS: Record<FurnitureKind, string> = {
  sofa: "🛋️", bed: "🛏️", table: "🪑", counter: "🍳",
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function toShape(poly: Poly, s: number) {
  const e = poly?.exterior || [];
  if (e.length < 3) return null;
  const sh = new THREE.Shape();
  sh.moveTo(e[0][0] * s, e[0][1] * s);
  for (let i = 1; i < e.length; i++) sh.lineTo(e[i][0] * s, e[i][1] * s);
  (poly.holes || []).forEach((h) => {
    if (!h || h.length < 3) return;
    const ph = new THREE.Path();
    ph.moveTo(h[0][0] * s, h[0][1] * s);
    for (let i = 1; i < h.length; i++) ph.lineTo(h[i][0] * s, h[i][1] * s);
    sh.holes.push(ph);
  });
  return sh;
}

function boundsOfPoly(poly: Poly, s: number) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly.exterior || []) {
    const X = x * s, Y = y * s;
    minX = Math.min(minX, X); minY = Math.min(minY, Y);
    maxX = Math.max(maxX, X); maxY = Math.max(maxY, Y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function boundsOfWalls(walls: Poly[], s: number) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of walls || []) {
    for (const [x, y] of w.exterior || []) {
      const X = x * s, Y = y * s;
      minX = Math.min(minX, X); minY = Math.min(minY, Y);
      maxX = Math.max(maxX, X); maxY = Math.max(maxY, Y);
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function pickInteriorBounds(layout: Layout, s: number) {
  type BB = { area: number; b: ReturnType<typeof boundsOfPoly> };
  let best: BB | null = null;
  (layout.rooms || []).forEach((r) =>
    (r.polygons || []).forEach((p) => {
      const b = boundsOfPoly(p, s);
      const a = b.w * b.h;
      if (!best || a > best.area) best = { area: a, b };
    })
  );
  const bc = best as BB | null;
  if (bc && bc.area > 1) return bc.b;
  const wb = boundsOfWalls(layout.walls || [], s);
  if (!wb) return null;
  const padX = Math.max(0.8, wb.w * 0.2), padY = Math.max(0.8, wb.h * 0.2);
  return {
    minX: wb.minX + padX, minY: wb.minY + padY,
    maxX: wb.maxX - padX, maxY: wb.maxY - padY,
    w: Math.max(0.1, wb.w - 2 * padX), h: Math.max(0.1, wb.h - 2 * padY),
    cx: (wb.minX + wb.maxX) / 2, cy: (wb.minY + wb.maxY) / 2,
  };
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

function defaultFurniture(layout: Layout, s: number): FurnitureItem[] {
  const b = pickInteriorBounds(layout, s);
  if (!b) return [];
  return [
    { id: "sofa-1",    kind: "sofa",    pos: [b.cx, 0.25, clamp(b.cy, b.minY + 0.8, b.maxY - 0.8)] },
    { id: "bed-1",     kind: "bed",     pos: [clamp(b.minX + 1.0, b.minX + 0.6, b.maxX - 0.6), 0.22, clamp(b.minY + 1.0, b.minY + 0.6, b.maxY - 0.6)] },
    { id: "table-1",   kind: "table",   pos: [clamp(b.cx + 0.8, b.minX + 0.8, b.maxX - 0.8), 0.38, clamp(b.maxY - 0.9, b.minY + 0.8, b.maxY - 0.8)] },
    { id: "counter-1", kind: "counter", pos: [clamp(b.maxX - 0.6, b.minX + 0.6, b.maxX - 0.6), 0.45, b.cy] },
  ];
}

function makeNewItem(kind: FurnitureKind, layout: Layout, s: number, idx: number): FurnitureItem {
  const b = pickInteriorBounds(layout, s);
  const cx = b?.cx ?? 0, cz = b?.cy ?? 0;
  const jitter = (idx % 5) * 0.35;
  const baseY = kind === "table" ? 0.38 : kind === "counter" ? 0.45 : kind === "sofa" ? 0.25 : 0.22;
  return { id: `${kind}-${Date.now()}-${idx}`, kind, pos: [cx + jitter, baseY, cz + jitter] };
}

// ─── Furniture mesh ───────────────────────────────────────────────────────────
function FurnitureMesh({ item, selected }: { item: FurnitureItem; selected: boolean }) {
  return (
    <group position={item.pos} rotation={[0, item.rotY || 0, 0]}>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.68, 48]} />
          <meshBasicMaterial color="#388bfd" />
        </mesh>
      )}
      {item.kind === "sofa" && (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.6, 0.4, 0.75]} />
            <meshStandardMaterial color="#1d4ed8" metalness={0.1} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.32, -0.24]} castShadow>
            <boxGeometry args={[1.6, 0.26, 0.12]} />
            <meshStandardMaterial color="#1e40af" />
          </mesh>
        </>
      )}
      {item.kind === "bed" && (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.35, 1.3]} />
            <meshStandardMaterial color="#374151" metalness={0.05} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, -0.4]} castShadow>
            <boxGeometry args={[1.7, 0.2, 0.16]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        </>
      )}
      {item.kind === "table" && (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.08, 0.8]} />
            <meshStandardMaterial color="#92400e" metalness={0.15} roughness={0.5} />
          </mesh>
          {([ [-0.4,-0.24,-0.25],[0.4,-0.24,-0.25],[-0.4,-0.24,0.25],[0.4,-0.24,0.25] ] as [number,number,number][]).map((p, i) => (
            <mesh key={i} position={p} castShadow>
              <boxGeometry args={[0.1, 0.48, 0.1]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
          ))}
        </>
      )}
      {item.kind === "counter" && (
        <>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.9, 2.0]} />
            <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.62, 0.04, 2.0]} />
            <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.3} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Keyboard zoom ────────────────────────────────────────────────────────────
function KeyboardZoom({ orbitRef, enabled }: { orbitRef: React.MutableRefObject<any>; enabled: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const orbit = orbitRef.current;
      if (!orbit) return;
      const plus  = e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
      const minus = e.key === "-" || e.key === "_" || e.code === "NumpadSubtract";
      const reset = e.key === "0";
      if (!plus && !minus && !reset) return;
      e.preventDefault();
      const target = orbit.target as THREE.Vector3;
      const dir = new THREE.Vector3().subVectors(target, camera.position).normalize();
      if (plus)  camera.position.addScaledVector(dir,  0.9);
      if (minus) camera.position.addScaledVector(dir, -0.9);
      if (reset) camera.position.set(target.x + 5, target.y + 5, target.z + 5);
      camera.updateProjectionMatrix();
      orbit.update();
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [camera, orbitRef, enabled]);
  return null;
}

// ─── Scene 3D ─────────────────────────────────────────────────────────────────
function Scene3D({
  layout, showFurniture, items, selectedId, setSelectedId, setItems, keyboardEnabled,
}: {
  layout: Layout; showFurniture: boolean; items: FurnitureItem[];
  selectedId: string | null; setSelectedId: (id: string | null) => void;
  setItems: React.Dispatch<React.SetStateAction<FurnitureItem[]>>; keyboardEnabled: boolean;
}) {
  const groupRef     = useRef<THREE.Group>(null);
  const orbitRef     = useRef<any>(null);
  const dragProxyRef = useRef<THREE.Group>(null);
  const { camera }   = useThree();
  const unitScale    = 0.01;
  const wallHeight   = Number.isFinite(layout.wall_height_m) ? (layout.wall_height_m as number) : 2.7;

  const wallGeoms = useMemo(() => {
    const out: THREE.ExtrudeGeometry[] = [];
    for (const w of layout.walls || []) {
      const sh = toShape(w, unitScale);
      if (!sh) continue;
      const g = new THREE.ExtrudeGeometry(sh, { depth: wallHeight, bevelEnabled: false, steps: 1 });
      g.rotateX(-Math.PI / 2);
      out.push(g);
    }
    return out;
  }, [layout, wallHeight]);

  const roomGeoms = useMemo(() => {
    const out: THREE.ShapeGeometry[] = [];
    (layout.rooms || []).forEach((r) =>
      (r.polygons || []).forEach((p) => {
        const sh = toShape(p, unitScale);
        if (!sh) return;
        const g = new THREE.ShapeGeometry(sh);
        g.rotateX(-Math.PI / 2);
        out.push(g);
      })
    );
    return out;
  }, [layout]);

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    if (box.isEmpty()) return;
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const dist   = Math.max(4, Math.max(size.x, size.y, size.z) * 1.15);
    camera.position.set(center.x + dist, center.y + dist, center.z + dist);
    camera.lookAt(center);
    camera.near = 0.01; camera.far = 10000;
    camera.updateProjectionMatrix();
    if (orbitRef.current) { orbitRef.current.target.copy(center); orbitRef.current.update(); }
  }, [camera, wallGeoms, roomGeoms]);

  const selected = items.find((i) => i.id === selectedId) || null;

  useEffect(() => {
    if (!dragProxyRef.current || !selected) return;
    dragProxyRef.current.position.set(selected.pos[0], selected.pos[1], selected.pos[2]);
  }, [selected]);

  const interior = pickInteriorBounds(layout, unitScale);

  return (
    <>
      <group ref={groupRef} onPointerMissed={() => setSelectedId(null)}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#090d14" />
        </mesh>
        {roomGeoms.map((g, i) => (
          <mesh key={`room-${i}`} geometry={g} receiveShadow position={[0, 0.03, 0]}>
            <meshStandardMaterial color="#0d1117" roughness={0.95} />
          </mesh>
        ))}
        {wallGeoms.map((g, i) => (
          <mesh key={`wall-${i}`} geometry={g} castShadow receiveShadow>
            <meshStandardMaterial color="#c2ccde" roughness={0.75} metalness={0.05} />
          </mesh>
        ))}
        {showFurniture && items.map((it) => (
          <group key={it.id} onClick={(e) => { e.stopPropagation(); setSelectedId(it.id); }}>
            <FurnitureMesh item={it} selected={selectedId === it.id} />
          </group>
        ))}
        <group ref={dragProxyRef} />
      </group>

      {showFurniture && selected && dragProxyRef.current && (
        <TransformControls
          object={dragProxyRef.current}
          mode="translate"
          showX showY={false} showZ
          onMouseDown={() => { if (orbitRef.current) orbitRef.current.enabled = false; }}
          onMouseUp={() => {
            if (orbitRef.current) orbitRef.current.enabled = true;
            const obj = dragProxyRef.current;
            if (!obj) return;
            const margin = selected.kind === "bed" ? 0.9 : selected.kind === "sofa" ? 0.8 : 0.6;
            const minX = (interior?.minX ?? -9999) + margin, maxX = (interior?.maxX ?? 9999) - margin;
            const minZ = (interior?.minY ?? -9999) + margin, maxZ = (interior?.maxY ?? 9999) - margin;
            const x = clamp(obj.position.x, minX, maxX);
            const z = clamp(obj.position.z, minZ, maxZ);
            const y = Math.max(0.2, obj.position.y);
            obj.position.set(x, y, z);
            setItems((prev) => prev.map((p) => (p.id === selected.id ? { ...p, pos: [x, y, z] } : p)));
          }}
        />
      )}

      <OrbitControls ref={orbitRef} makeDefault enableZoom enablePan enableRotate={!selectedId} />
      <KeyboardZoom orbitRef={orbitRef} enabled={keyboardEnabled} />
    </>
  );
}

// ─── Shared panel style ───────────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  background: D.surface,
  border: `1px solid ${D.border}`,
  borderRadius: 10,
  boxShadow: D.panelShadow,
};

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Plan3DView({ layout }: { layout?: Layout | null }) {
  const [showFurniture,   setShowFurniture]   = useState(true);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [items,           setItems]           = useState<FurnitureItem[]>([]);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const itemCounter = useRef(1);

  useEffect(() => {
    if (!layout) return;
    itemCounter.current = 2;
    setItems(defaultFurniture(layout, 0.01));
    setSelectedId(null);
  }, [layout]);

  const selected = items.find((i) => i.id === selectedId) || null;

  const addFurniture = (kind: FurnitureKind) => {
    if (!layout) return;
    const item = makeNewItem(kind, layout, 0.01, itemCounter.current++);
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!layout)
    return (
      <div
        className="d-flex align-items-center justify-content-center p-5 rounded-4"
        style={{ minHeight: 220, background: D.surface, border: `1px solid ${D.border}`, color: D.textMuted }}
      >
        <div className="text-center">
          <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.7 }}>🏠</div>
          <div className="fw-semibold" style={{ color: D.text, fontSize: 15 }}>No 3D data yet</div>
          <div className="mt-1 small" style={{ color: D.textMuted }}>Upload a floor plan to get started</div>
        </div>
      </div>
    );

  return (
    <div
      className="position-relative w-100 overflow-hidden rounded-4 shadow-lg"
      style={{
        height: 600,
        outline: "none",
        border: `1px solid ${D.border}`,
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.7)",
        background: D.bg,
      }}
      tabIndex={0}
      onMouseEnter={() => setKeyboardEnabled(true)}
      onMouseLeave={() => setKeyboardEnabled(false)}
      onFocus={() => setKeyboardEnabled(true)}
      onBlur={() => setKeyboardEnabled(false)}
    >
      {/* ── Canvas ───────────────────────────────────────────────────────────── */}
      <Canvas shadows camera={{ position: [4.5, 4.5, 4.5], fov: 45 }}>
        <color attach="background" args={["#080c12"]} />
        <ambientLight intensity={0.45} />
        <hemisphereLight intensity={0.3} groundColor="#0d1117" />
        <directionalLight position={[12, 16, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} color="#c8d8f8" />
        <pointLight position={[-8, 6, -8]} intensity={0.35} color="#388bfd" />
        <Grid
          args={[80, 80]}
          cellSize={0.5}
          sectionSize={5}
          cellThickness={0.4}
          sectionThickness={0.8}
          cellColor="#161b22"
          sectionColor="#21262d"
          fadeDistance={40}
          fadeStrength={1.2}
        />
        <Scene3D
          layout={layout}
          showFurniture={showFurniture}
          items={items}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          setItems={setItems}
          keyboardEnabled={keyboardEnabled}
        />
      </Canvas>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div
        className="position-absolute top-0 start-0 end-0 mx-3 mt-3 px-3 py-2 d-flex align-items-center justify-content-between rounded-3 shadow-sm"
        style={{ ...panelStyle }}
      >
        {/* Title + status */}
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold" style={{ fontSize: 14, color: D.text, letterSpacing: "-0.02em" }}>
            3D Floor Planner
          </span>
          <span
            className="badge rounded-pill d-inline-flex align-items-center gap-2"
            style={{
              background: selectedId ? "rgba(63,185,80,0.10)" : "rgba(125,133,144,0.10)",
              border: `1px solid ${selectedId ? "rgba(63,185,80,0.28)" : D.border}`,
              color: selectedId ? D.success : D.textMuted,
              fontSize: 11,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: selectedId ? D.success : D.textMuted,
              display: "inline-block",
            }} />
            {selectedId ? "Selected" : "No selection"}
          </span>
        </div>

        {/* Keyboard hints */}
        <div className="d-flex align-items-center gap-2" style={{ fontSize: 11, color: D.textMuted }}>
          {["+", "−", "0"].map((k) => (
            <kbd
              key={k}
              className="badge"
              style={{
                background: D.kbd,
                border: `1px solid ${D.kbdBorder}`,
                borderRadius: 5,
                padding: "2px 7px",
                fontSize: 11,
                fontFamily: "monospace",
                color: D.text,
                boxShadow: "0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {k}
            </kbd>
          ))}
          <span className="ms-1">zoom · reset</span>
        </div>

        {/* Object count pill */}
        <span
          className="badge rounded-pill"
          style={{
            background: "rgba(56,139,253,0.10)",
            border: "1px solid rgba(56,139,253,0.22)",
            color: D.accent,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {items.length} objects
        </span>
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────────────── */}
      <div
        className="position-absolute end-0 d-flex flex-column gap-2"
        style={{ top: 64, bottom: 16, right: 12, width: 230 }}
      >
        {/* Controls card */}
        <div className="card shadow-sm" style={{ ...panelStyle, padding: "14px", border: `1px solid ${D.border}`, borderRadius: 12 }}>
          {/* Toggle row */}
          <div
            className="d-flex align-items-center justify-content-between pb-2 mb-3"
            style={{ borderBottom: `1px solid ${D.border}` }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Furniture
            </span>
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="showFurnitureCheck"
                checked={showFurniture}
                onChange={(e) => setShowFurniture(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

          {/* Add buttons */}
          <div className="row g-1 mb-2">
            {(["sofa", "bed", "table", "counter"] as FurnitureKind[]).map((kind) => (
              <div className="col-6" key={kind}>
                <button
                  className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 border"
                  onClick={() => addFurniture(kind)}
                  style={{
                    background: D.surfaceHov,
                    borderColor: D.border,
                    color: D.text,
                    fontWeight: 500,
                    fontSize: 12,
                    borderRadius: 7,
                    padding: "5px 4px",
                    transition: "border-color 0.15s, color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = D.accent;
                    b.style.color = D.accent;
                    b.style.background = D.accentGlow;
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = D.border;
                    b.style.color = D.text;
                    b.style.background = D.surfaceHov;
                  }}
                >
                  <span style={{ fontSize: 13 }}>{ICONS[kind]}</span>
                  <span style={{ textTransform: "capitalize" }}>{kind}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Delete */}
          <button
            className="btn btn-sm w-100 border"
            onClick={deleteSelected}
            disabled={!selected}
            style={{
              background: selected ? D.dangerBg : "transparent",
              borderColor: selected ? D.dangerBdr : D.border,
              color: selected ? D.danger : D.textMuted,
              fontWeight: 500,
              fontSize: 12,
              borderRadius: 7,
              transition: "all 0.15s",
            }}
          >
            🗑 Delete Selected
          </button>

          <p className="mb-0 mt-2" style={{ fontSize: 10, color: D.textMuted, lineHeight: 1.6 }}>
            Click to select · drag gizmo to move
          </p>
        </div>

        {/* Furniture list card */}
        <div className="card shadow-sm" style={{ ...panelStyle, padding: "12px 14px", flex: 1, overflowY: "auto", minHeight: 0, border: `1px solid ${D.border}`, borderRadius: 12 }}>
          <div
            className="d-flex align-items-center justify-content-between mb-2 pb-2"
            style={{ borderBottom: `1px solid ${D.border}` }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Room Objects
            </span>
            <span
              className="badge rounded-pill"
              style={{
                background: "rgba(56,139,253,0.10)",
                border: "1px solid rgba(56,139,253,0.20)",
                color: D.accent,
                padding: "1px 8px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {items.length}
            </span>
          </div>

          {items.length === 0 ? (
            <div style={{ fontSize: 12, color: D.textMuted, textAlign: "center", padding: "16px 0" }}>
              No objects yet
            </div>
          ) : (
            <div className="d-flex flex-column gap-1">
              {items.map((it) => {
                const isSel = selectedId === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => setSelectedId(it.id)}
                    className="d-flex align-items-center gap-2 px-2 py-1 rounded-2 cursor-pointer"
                    style={{
                      cursor: "pointer",
                      background: isSel ? D.accentGlow : "transparent",
                      border: `1px solid ${isSel ? D.borderAcc : "transparent"}`,
                      transition: "all 0.1s",
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSel) (e.currentTarget as HTMLDivElement).style.background = D.surfaceHov;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSel) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{ICONS[it.kind]}</span>
                    <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                      <div className="fw-medium" style={{ fontSize: 12, color: isSel ? D.accent : D.text, textTransform: "capitalize" }}>
                        {it.kind}
                      </div>
                      <div className="text-muted" style={{ fontSize: 10, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.id}
                      </div>
                    </div>
                    {isSel && <span style={{ fontSize: 8, color: D.accent, flexShrink: 0 }}>◆</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}