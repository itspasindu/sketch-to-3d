import pickle
import numpy as np
import cv2
from torch.utils.data import Dataset
from shapely.geometry import Polygon, MultiPolygon

CLASS_MAP = {
    "wall": 1,
    "door": 2,
    "window": 3,
    "room": 4,  # union of room-like classes
}
ROOM_KEYS = [
    "bathroom", "bedroom", "kitchen", "living", "storage",
    "stair", "inner", "balcony", "veranda", "garden", "parking", "pool", "land"
]

def draw_geom(mask, geom, cls_id, minx, miny, scale, pad, out_h):
    if geom is None or geom.is_empty:
        return
    geoms = [geom] if isinstance(geom, Polygon) else list(geom.geoms) if isinstance(geom, MultiPolygon) else []
    for g in geoms:
        ext = [((x - minx)*scale + pad, (y - miny)*scale + pad) for x, y in g.exterior.coords]
        ext = np.array([[int(x), int(out_h - y)] for x, y in ext], dtype=np.int32)
        cv2.fillPoly(mask, [ext], cls_id)
        for h in g.interiors:
            hole = [((x - minx)*scale + pad, (y - miny)*scale + pad) for x, y in h.coords]
            hole = np.array([[int(x), int(out_h - y)] for x, y in hole], dtype=np.int32)
            cv2.fillPoly(mask, [hole], 0)

class ResPlanSegDataset(Dataset):
    def __init__(self, pkl_path, size=512):
        with open(pkl_path, "rb") as f:
            self.data = pickle.load(f)
        self.size = size

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        rec = self.data[idx]
        s = self.size
        pad = 8

        # bounds
        geoms = [rec[k] for k in rec.keys() if hasattr(rec[k], "bounds") and not rec[k].is_empty]
        minx = min(g.bounds[0] for g in geoms)
        miny = min(g.bounds[1] for g in geoms)
        maxx = max(g.bounds[2] for g in geoms)
        maxy = max(g.bounds[3] for g in geoms)
        scale = (s - 2*pad) / max(maxx-minx, maxy-miny, 1e-6)

        # synthetic input image (white bg + black walls)
        img = np.full((s, s, 3), 255, dtype=np.uint8)
        y = np.zeros((s, s), dtype=np.uint8)

        # rooms
        for rk in ROOM_KEYS:
            draw_geom(y, rec.get(rk), CLASS_MAP["room"], minx, miny, scale, pad, s)

        # wall/door/window overwrite
        draw_geom(y, rec.get("wall"), CLASS_MAP["wall"], minx, miny, scale, pad, s)
        draw_geom(y, rec.get("door"), CLASS_MAP["door"], minx, miny, scale, pad, s)
        draw_geom(y, rec.get("window"), CLASS_MAP["window"], minx, miny, scale, pad, s)

        # build simple sketch-like input from label
        img[y == CLASS_MAP["wall"]] = (0, 0, 0)
        img[y == CLASS_MAP["door"]] = (40, 40, 40)
        img[y == CLASS_MAP["window"]] = (80, 80, 80)

        # normalize to tensor
        x = img.astype(np.float32) / 255.0
        x = np.transpose(x, (2, 0, 1))  # C,H,W
        return x, y.astype(np.int64)