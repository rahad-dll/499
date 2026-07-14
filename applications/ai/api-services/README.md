# Inference API

Internal REST API that serves computer vision inference for the CityPulse platform. Currently handles parking slot occupancy detection. Designed to support additional vision tasks without structural changes.

---

## Architecture

```
Upstream service
    │
    │  POST /api/v1/inference/predict
    │  (pre-cropped slot patch per request)
    ▼
┌─────────────────────────────┐
│  FastAPI — Inference API    │
│  ├── Bearer token guard     │
│  ├── MobileNetV2 predictor  │
│  └── MongoDB writer         │
└─────────────────────────────┘
    │
    ▼
MongoDB inferences collection
(TTL: 30 days)
```

> The upstream service is responsible for extracting per-slot patches from the full CCTV frame using stored mask coordinates before calling this API.

---

## Structure

```
api-services/
├── main.py              # app bootstrap, lifespan, health route
├── config.py            # all env vars in one place
├── predictor.py         # model loading and inference engine
├── auth/
│   └── dependencies.py  # bearer token guard
├── db/
│   └── mongodb.py       # Motor connection, TTL index
├── models/
│   └── schemas.py       # Pydantic contracts
├── routes/
│   └── inference.py     # endpoint handlers
└── weights/
    └── mobilenetv2/
        └── phase1_weights.pth
```

---

## Setup

```bash
# activate the shared venv (created at the ai/ level)
..\.venv\Scripts\Activate.ps1    # Windows
source ../.venv/bin/activate      # macOS / Linux

# configure env
cp .env.example .env              # then fill in values

uvicorn main:app --reload --port 8001
```

Swagger UI → `http://localhost:8001/docs`

---

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `AI_API_TOKEN` | `change-me-in-production` | shared secret with the upstream caller — change before deploy |
| `MONGO_URI` | `mongodb://localhost:27017` | |
| `MONGO_DB` | `citypulse_ai` | |
| `MODEL_DIR` | `./weights` | root folder for all model weights |
| `OCCUPANCY_MODEL` | `mobilenetv2/phase1_weights.pth` | relative to `MODEL_DIR` |
| `HOST` | `0.0.0.0` | |
| `PORT` | `8001` | |

Each task gets its own `*_MODEL` variable. To add a new model, add a new variable — no existing config changes needed.

---

## Authentication

All inference routes require a bearer token:

```
Authorization: Bearer <AI_API_TOKEN>
```

This API is not intended for direct public access. Deploy it on an internal network and restrict ingress to the upstream service only.

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | liveness probe |
| POST | `/api/v1/inference/predict` | ✓ | single slot classification |
| POST | `/api/v1/inference/predict-batch` | ✓ | batch slot classification |
| GET | `/api/v1/inference/history` | ✓ | paginated inference log |

---

### POST `/api/v1/inference/predict`

Classify one slot image.

**Form field:** `file` — JPEG or PNG of a single cropped slot patch

**Query params:** `slot_id`, `space_id` (both optional)

```json
{
  "slot_id": "slot-01",
  "space_id": "space-abc",
  "prediction": { "label": "occupied", "confidence": 0.9312 },
  "inference_id": "6a563b45a83b52e626761fdb",
  "created_at": "2026-07-14T13:36:05.748148Z"
}
```

---

### POST `/api/v1/inference/predict-batch`

Classify multiple slot images in one call. `slot_ids` is comma-separated and maps to `files` by position.

```json
{ "results": [ ... ], "total": 3 }
```

---

### GET `/api/v1/inference/history`

Paginated inference log, newest first.

**Query params:** `page` (default 1), `page_size` (default 20, max 100), `slot_id`, `space_id`

---

## Storage

Inference records are stored in the `inferences` MongoDB collection. A TTL index auto-deletes records older than 30 days.

```
slot_id, space_id, label, confidence, filename, created_at
```

---

## Adding a new task

1. Train a model and export weights to `weights/<task-name>/`.
2. Add a `*_MODEL` env var in `.env` and `config.py`.
3. Create a predictor function in `predictor.py`.
4. Add a router under `routes/` and register it in `main.py`.
