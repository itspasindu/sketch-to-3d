import { LayoutResponse } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function fetchPlanByIndex(idx: number): Promise<LayoutResponse> {
  const r = await fetch(`${API_BASE}/plans/by-index/${idx}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchPlanById(id: number): Promise<LayoutResponse> {
  const r = await fetch(`${API_BASE}/plans/${id}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function inferFromImage(file: File): Promise<{ok: boolean; layout: LayoutResponse; note?: string}> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API_BASE}/infer`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function generate3D(layout: LayoutResponse): Promise<{ok: boolean; glb_url: string}> {
  const r = await fetch(`${API_BASE}/generate-3d`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ layout })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}