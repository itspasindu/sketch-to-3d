"use client";

import React from "react";
import { Upload, Layers3, Box, Ruler, Home, Sparkles } from "lucide-react";
import { fetchPlanById, fetchPlanByIndex, inferFromImage, generate3D } from "../lib/api";
import { LayoutResponse } from "../lib/types";
import Plan2DView from "../components/Plan2DView";
import Plan3DView from "../components/Plan3DView";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function DashboardPage() {
  const [layout, setLayout] = React.useState<LayoutResponse | null>(null);
  const [wallHeight, setWallHeight] = React.useState(2.7);
  const [note, setNote] = React.useState("");
  const [glbUrl, setGlbUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const [id, setId] = React.useState<number | "">("");

  const run = async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      await fn();
    } catch (e: any) {
      alert(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const loadIndex = () => run(async () => {
    const d = await fetchPlanByIndex(idx);
    setLayout(d);
    setWallHeight(d.wall_height_m);
    setGlbUrl(null);
    setNote("");
  });

  const loadId = () => run(async () => {
    if (id === "") return;
    const d = await fetchPlanById(id);
    setLayout(d);
    setWallHeight(d.wall_height_m);
    setGlbUrl(null);
    setNote("");
  });

  const onInfer = (file: File) => run(async () => {
    const d = await inferFromImage(file);
    setLayout(d.layout);
    setWallHeight(d.layout.wall_height_m);
    setGlbUrl(null);
    setNote(d.note || "");
  });

  const onGenerate3D = () => run(async () => {
    if (!layout) return alert("Load or infer a layout first.");
    const patched = { ...layout, wall_height_m: wallHeight };
    const resp = await generate3D(patched);
    setGlbUrl(`${API_BASE}${resp.glb_url}`);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid grid-cols-12 gap-4 p-4">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-6">
            <Home className="w-5 h-5 text-indigo-400" />
            <h1 className="font-semibold text-lg">ResPlan Studio</h1>
          </div>

          <nav className="space-y-2 text-sm">
            <div className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/30">Dashboard</div>
            <div className="px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer">Projects</div>
            <div className="px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer">Exports</div>
            <div className="px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer">Settings</div>
          </nav>

          <div className="mt-8 p-3 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              Pro Tip
            </div>
            Upload high-contrast floor plans for best wall detection.
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 lg:col-span-9 xl:col-span-10 space-y-4">
          {/* Top bar */}
          <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">2D → 3D Floor Plan Dashboard</h2>
                <p className="text-slate-400 text-sm">Convert sketches into interactive 3D layouts.</p>
              </div>
              <div className="text-xs text-slate-400">{loading ? "Processing..." : "Ready"}</div>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card icon={<Layers3 className="w-4 h-4" />} title="Walls" value={layout?.walls?.length ?? 0} />
            <Card icon={<Ruler className="w-4 h-4" />} title="Wall Height" value={`${wallHeight.toFixed(2)} m`} />
            <Card icon={<Box className="w-4 h-4" />} title="3D Model" value={glbUrl ? "Generated" : "Not generated"} />
          </section>

          {/* Controls */}
          <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-soft">
            <h3 className="font-medium mb-4">Controls</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <InputCard label="Dataset by Index">
                <div className="flex gap-2">
                  <input className="input" type="number" value={idx} onChange={e => setIdx(Number(e.target.value))} />
                  <button className="btn" onClick={loadIndex}>Load</button>
                </div>
              </InputCard>

              <InputCard label="Dataset by ID">
                <div className="flex gap-2">
                  <input className="input" type="number" value={id} onChange={e => setId(e.target.value === "" ? "" : Number(e.target.value))} />
                  <button className="btn" onClick={loadId}>Load</button>
                </div>
              </InputCard>

              <InputCard label="Upload Sketch">
                <label className="btn w-full flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" /> Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onInfer(f);
                    }}
                  />
                </label>
              </InputCard>

              <InputCard label="Generate">
                <button className="btn-primary w-full" onClick={onGenerate3D}>Generate 3D GLB</button>
              </InputCard>
            </div>

            <div className="mt-4">
              <label className="text-sm text-slate-300">Wall height: {wallHeight.toFixed(2)} m</label>
              <input
                type="range"
                min={2.2}
                max={3.5}
                step={0.1}
                value={wallHeight}
                onChange={e => setWallHeight(Number(e.target.value))}
                className="w-full mt-2 accent-indigo-500"
              />
            </div>

            {note ? <p className="text-xs text-indigo-300 mt-3">{note}</p> : null}
          </section>

          {/* Views */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Panel title="2D Plan">
              <Plan2DView layout={layout} />
            </Panel>
            <Panel title="3D View">
              <Plan3DView layout={layout} />
            </Panel>
          </section>
        </main>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(51 65 85);
          background: rgb(15 23 42);
          color: white;
          border-radius: 0.6rem;
          padding: 0.5rem 0.7rem;
          outline: none;
        }
        .btn {
          border: 1px solid rgb(71 85 105);
          background: rgb(30 41 59);
          color: white;
          border-radius: 0.6rem;
          padding: 0.5rem 0.8rem;
        }
        .btn:hover { background: rgb(51 65 85); }
        .btn-primary {
          border: 1px solid rgb(99 102 241);
          background: rgb(79 70 229);
          color: white;
          border-radius: 0.6rem;
          padding: 0.55rem 0.9rem;
        }
        .btn-primary:hover { background: rgb(67 56 202); }
      `}</style>
    </div>
  );
}

function Card({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-soft">
      <div className="flex items-center gap-2 text-slate-300 text-sm">{icon} {title}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 shadow-soft">
      <h3 className="font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InputCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {children}
    </div>
  );
}