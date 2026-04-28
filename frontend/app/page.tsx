"use client";

import React, { useState } from "react";
import { Upload, Home, Sparkles, Loader2, Ruler, Box, Layers3, ChevronRight, Activity } from "lucide-react";
import { fetchPlanById, fetchPlanByIndex, inferFromImage, generate3D } from "../lib/api";
import { LayoutResponse } from "../lib/types";
import Plan2DView from "../components/Plan2DView";
import Plan3DView from "../components/Plan3DView";

export default function DashboardPage() {
  const [layout, setLayout] = useState<LayoutResponse | null>(null);
  const [wallHeight, setWallHeight] = useState(2.7);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  const [id, setId] = useState<number | "">("");

  const run = async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      await fn();
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadIndex = () => run(async () => {
    const d = await fetchPlanByIndex(idx);
    setLayout(d);
    setWallHeight(d.wall_height_m);
  });

  const loadId = () => run(async () => {
    if (id === "") return;
    const d = await fetchPlanById(id as number);
    setLayout(d);
    setWallHeight(d.wall_height_m);
  });

  const onInfer = (file: File) => run(async () => {
    const d = await inferFromImage(file);
    setLayout(d.layout);
    setWallHeight(d.layout.wall_height_m);
    setNote(d.note || "");
  });

  const onGenerate3D = () => run(async () => {
    if (!layout) return;
    await generate3D({ ...layout, wall_height_m: wallHeight });
  });

  return (
    <div className="flex h-screen w-full bg-bg text-slate-200">
      {/* Sidebar: Glassmorphism Design */}
      <aside className="w-85 border-r border-white/5 flex flex-col glass-panel z-10 m-2 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/5">
          <div className="bg-accent p-2 rounded-xl shadow-glow">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tighter">ResPlan <span className="text-accent opacity-80">Studio</span></span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-hide">
          {/* Section: Dataset Access */}
          <section className="space-y-4">
            <header className="flex items-center gap-2 px-1">
              <Activity className="w-3 h-3 text-accent" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dataset Engine</p>
            </header>
            
            <div className="sidebar-section space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 ml-1 mb-1.5 block font-semibold uppercase">By Index</label>
                <div className="flex gap-2">
                  <input type="number" className="input-field" value={idx} onChange={e => setIdx(Number(e.target.value))} />
                  <button onClick={loadIndex} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all border border-white/5">LOAD</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 ml-1 mb-1.5 block font-semibold uppercase">By ID</label>
                <div className="flex gap-2">
                  <input type="number" className="input-field" value={id} onChange={e => setId(e.target.value === "" ? "" : Number(e.target.value))} />
                  <button onClick={loadId} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all border border-white/5">LOAD</button>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Upload */}
          <section className="space-y-4">
            <header className="flex items-center gap-2 px-1">
              <Layers3 className="w-3 h-3 text-accent" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Image Analysis</p>
            </header>
            <label className="flex flex-col items-center justify-center gap-3 w-full py-6 bg-accent/5 hover:bg-accent/10 rounded-2xl cursor-pointer transition-all border border-accent/20 border-dashed group">
              <div className="p-3 bg-accent/10 rounded-full group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-accent" />
              </div>
              <div className="text-center px-4">
                <span className="block text-sm font-bold">Import 2D Blueprint</span>
                <span className="block text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">JPG, PNG or PDF detection</span>
              </div>
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onInfer(e.target.files[0])} />
            </label>
          </section>

          {/* Section: Controls */}
          <section className="space-y-4">
            <header className="flex items-center gap-2 px-1">
              <Ruler className="w-3 h-3 text-accent" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Environment</p>
            </header>
            <div className="sidebar-section">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Wall Height</span>
                <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded-lg border border-accent/20">{wallHeight.toFixed(2)}m</span>
              </div>
              <input 
                type="range" min={2.2} max={3.5} step={0.1} value={wallHeight} 
                onChange={e => setWallHeight(Number(e.target.value))} 
                className="w-full accent-accent bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </section>
        </div>

        {/* Global CTA */}
        <div className="p-5 border-t border-white/5">
          <button 
            onClick={onGenerate3D}
            disabled={!layout || loading}
            className="w-full py-4 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 group transition-all active:scale-95 disabled:opacity-20 disabled:grayscale"
          >
            Generate 3D Model
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        {/* Floating Header */}
        <header className="flex justify-between items-center glass-panel px-6 py-3 rounded-2xl border-white/5">
          <div className="flex gap-8">
            <StatItem icon={<Layers3 className="w-4 h-4 text-indigo-400"/>} label="Walls" value={layout?.walls?.length || 0} />
            <StatItem icon={<Ruler className="w-4 h-4 text-emerald-400"/>} label="Ceiling" value={`${wallHeight}m`} />
            <StatItem icon={<Box className="w-4 h-4 text-orange-400"/>} label="Mesh" value={layout ? "Generated" : "N/A"} />
          </div>
          
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-black text-accent animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> RUNNING ALGORITHM
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Processor Idle
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
          <ViewportFrame title="2D Technical Drawing">
            <Plan2DView layout={layout} />
          </ViewportFrame>
          <ViewportFrame title="3D Realtime Render" isEmpty={!layout}>
            <Plan3DView layout={layout} />
          </ViewportFrame>
        </div>
      </main>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/5 rounded-xl border border-white/5">{icon}</div>
      <div className="leading-tight">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{label}</p>
        <p className="text-sm font-bold text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function ViewportFrame({ title, children, isEmpty }: { title: string; children: React.ReactNode; isEmpty?: boolean }) {
  return (
    <div className="glass-panel rounded-[2rem] overflow-hidden flex flex-col h-full group hover:border-white/10">
      <div className="px-6 py-4 border-b border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] bg-white/[0.02] flex justify-between items-center">
        {title}
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-white/5 group-hover:bg-accent transition-colors" />
        </div>
      </div>
      <div className={`flex-1 relative ${isEmpty ? 'flex items-center justify-center' : ''}`}>
        {isEmpty ? (
          <div className="text-center opacity-10 flex flex-col items-center">
            <div className="relative mb-6">
              <Box className="w-24 h-24 text-white" />
              <div className="absolute inset-0 bg-accent blur-3xl opacity-20" />
            </div>
            <p className="text-xs font-black uppercase tracking-[1em] text-white">Standby</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}