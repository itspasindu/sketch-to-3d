"use client";
import React from "react";

interface Props {
  onLoadIndex: (idx: number) => void;
  onLoadId: (id: number) => void;
  onInfer: (file: File) => void;
  onGenerate3D: () => void;
  wallHeight: number;
  setWallHeight: (v: number) => void;
}

export default function PlanControls({ onLoadIndex, onLoadId, onInfer, onGenerate3D, wallHeight, setWallHeight }: Props) {
  const [idx, setIdx] = React.useState(0);
  const [id, setId] = React.useState<number | "">("");

  return (
    <div className="card">
      <h3>Controls</h3>
      <div style={{ marginBottom: 10 }}>
        <label>Load dataset plan by index</label>
        <input type="number" value={idx} onChange={(e) => setIdx(Number(e.target.value))} />
        <button onClick={() => onLoadIndex(idx)}>Load Index</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Load dataset plan by id</label>
        <input type="number" value={id} onChange={(e) => setId(e.target.value === "" ? "" : Number(e.target.value))} />
        <button onClick={() => id !== "" && onLoadId(id)}>Load ID</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Upload 2D sketch and infer layout</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onInfer(f);
          }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <button onClick={onGenerate3D}>Generate 3D GLB</button>
      </div>

      <div>
        <label>Wall height (meters): {wallHeight.toFixed(2)}</label>
        <input
          type="range"
          min={2.2}
          max={3.5}
          step={0.1}
          value={wallHeight}
          onChange={(e) => setWallHeight(Number(e.target.value))}
        />
      </div>
    </div>
  );
}