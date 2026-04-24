"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

type Poly = { exterior: number[][]; holes?: number[][][] };
type Room = { polygons: Poly[] };
type Layout = { walls: Poly[]; rooms?: Room[]; wall_height_m?: number };

function shapeFromPoly(poly: Poly, s = 0.01) {
  const pts = poly?.exterior || [];
  if (pts.length < 3) return null;
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0] * s, pts[0][1] * s);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0] * s, pts[i][1] * s);

  (poly.holes || []).forEach((h) => {
    if (h.length < 3) return;
    const ph = new THREE.Path();
    ph.moveTo(h[0][0] * s, h[0][1] * s);
    for (let i = 1; i < h.length; i++) ph.lineTo(h[i][0] * s, h[i][1] * s);
    sh.holes.push(ph);
  });
  return sh;
}

function SceneContent({ layout }: { layout: Layout }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, controls } = useThree() as any;

  const wallHeight = layout.wall_height_m ?? 2.7;
  const sceneScale = 0.01; // IMPORTANT: px -> meters-like units

  const wallMeshes = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    <meshStandardMaterial color="#b7c4e4" roughness={0.85} metalness={0.05} />
    for (const w of layout.walls || []) {
      const sh = shapeFromPoly(w, sceneScale);
      if (!sh) continue;
      const g = new THREE.ExtrudeGeometry(sh, { depth: wallHeight, bevelEnabled: false });
      g.rotateX(-Math.PI / 2); // Y-up
      out.push(g);
    }
    return out;
  }, [layout, wallHeight]);

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = Math.max(6, maxDim * 1.8);

    camera.position.set(center.x + dist, center.y + dist, center.z + dist);
    camera.near = 0.01;
    camera.far = 5000;
    camera.updateProjectionMatrix();
    camera.lookAt(center);

    if (controls?.target) {
      controls.target.copy(center);
      controls.update();
    }
  }, [wallMeshes, camera, controls]);

  return (
    <group ref={groupRef}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
  <planeGeometry args={[30, 30]} />
  <meshStandardMaterial color="#334155" />
</mesh>
      {wallMeshes.map((g, i) => (
        <mesh key={i} geometry={g} castShadow receiveShadow>
          <meshStandardMaterial color="#3b3f4a" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

export default function Plan3DJsonView({ layout }: { layout: Layout | null }) {
  if (!layout || !layout.walls || layout.walls.length === 0) {
    return <div style={{ padding: 12, color: "#9aa4b2" }}>No wall geometry in layout.</div>;
  }

  return (
    <div style={{ width: "100%", height: 560 }}>
      <Canvas shadows camera={{ position: [10, 10, 10], fov: 45 }}>
        <color attach="background" args={["#111827"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 8]} intensity={1.0} castShadow />
        <Grid args={[100, 100]} cellSize={0.5} sectionSize={5} />
        <SceneContent layout={layout} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}