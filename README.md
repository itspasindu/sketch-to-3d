# ResPlan 2D -> 3D Room Layout Web App

## What this starter does
- Reads `ResPlan.pkl` records (vector polygons, graph metadata).
- Converts a plan into structured layout JSON.
- Visualizes in:
  - 2D top view
  - 3D extruded walls (height slider)
- Includes `/infer` endpoint scaffold for future semantic segmentation model integration.

## Prerequisites
- Python 3.10+
- Node 18+
- `ResPlan.pkl` downloaded from Kaggle:
  - https://www.kaggle.com/datasets/resplan/resplan?select=ResPlan.pkl

## Setup

### 1) Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Place dataset:
- Put `ResPlan.pkl` at `backend/data/ResPlan.pkl`
- OR edit `.env`:
  - `RESPLAN_PKL_PATH=/absolute/path/to/ResPlan.pkl`

Run:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open:
- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

## API
- `GET /health`
- `GET /plans/count`
- `GET /plans/by-index/{idx}`
- `GET /plans/{plan_id}`
- `POST /infer` (image upload; currently returns baseline sample layout)

## Next steps (ML integration)
Replace `backend/app/services/inference_service.py` with:
1. model loading (e.g., DeepLabV3+ checkpoint),
2. preprocessing,
3. segmentation prediction,
4. mask->polygon vectorization,
5. layout JSON assembly.
