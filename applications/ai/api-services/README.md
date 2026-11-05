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
│   ├── inference.py     # occupancy endpoints
│   └── plates.py        # licence plate endpoint
└── weights/
    ├── mobilenetv2/
    │   ├── phase1_weights.pth   (archived)
    │   └── phase2_weights.pth   (active)
    ├── plate-detector-yolo26n/
    │   └── best.pt
    └── plate-reader-yolo26s/
        ├── best.pt
        └── classes.json
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

| Variable               | Default                                       | Notes                                                         |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| `AI_API_TOKEN`         | `your-ai-api-token`                           | shared secret with the upstream caller — change before deploy |
| `MONGO_URI`            | `mongodb://localhost:27017`                   | MongoDB connection string                                     |
| `MONGO_DB`             | `citypulse_ai`                                | MongoDB database name                                         |
| `MODEL_DIR`            | `./weights`                                   | root folder for all model weights                             |
| `DEFAULT_MODEL`        | `occupancy`                                   | default selector used when no model is provided               |
| `MODEL_PATH_OCCUPANCY` | `mobilenetv2/phase2_weights.pth`              | occupancy model path relative to `MODEL_DIR`                  |
| `MODEL_PATH_VPS_NET`   | `vps-net/Customized.pth`                      | alternate model path relative to `MODEL_DIR`                  |
| `MODEL_PATH_PLATE_DETECTOR` | `plate-detector-yolo26n/best.pt`         | plate detector path relative to `MODEL_DIR`                   |
| `MODEL_PATH_PLATE_READER`   | `plate-reader-yolo26s/best.pt`           | plate character reader path relative to `MODEL_DIR`           |
| `MODEL_PATH_PLATE_CLASSES`  | `plate-reader-yolo26s/classes.json`      | reader classes with English and Bangla text                   |
| `PLATE_MIN_CONFIDENCE`      | `0.4`                                    | plates detected below this confidence are dropped             |
| `HOST`                 | `0.0.0.0`                                     |                                                               |
| `PORT`                 | `8001`                                        |                                                               |
| `CORS_ORIGINS`         | `http://localhost:3000,http://localhost:5173` | comma-separated allowed origins                               |

The API accepts a simple `model` query parameter with two values: `occupancy` for the default occupancy model and `slot-occupancy` for the alternate model path configured in `MODEL_PATH_VPS_NET`.

---

## Authentication

All inference routes require a bearer token:

```
Authorization: Bearer <AI_API_TOKEN>
```

This API is not intended for direct public access. Deploy it on an internal network and restrict ingress to the upstream service only.

---

## Endpoints

| Method | Path                              | Auth | Description                |
| ------ | --------------------------------- | ---- | -------------------------- |
| GET    | `/health`                         | —    | liveness probe             |
| POST   | `/api/v1/inference/predict`       | ✓    | single slot classification |
| POST   | `/api/v1/inference/predict-batch` | ✓    | batch slot classification  |
| GET    | `/api/v1/inference/history`       | ✓    | paginated inference log    |
| POST   | `/api/v1/inference/plate`         | ✓    | find and read licence plates |

---

### POST `/api/v1/inference/predict`

Classify one slot image.

**Form field:** `file` — JPEG or PNG of a single cropped slot patch

**Query params:**

- `slot_id` (optional)
- `space_id` (optional)
- `model` (optional, use `occupancy` or `slot-occupancy`)

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

**Query params:**

- `slot_ids` (optional, comma-separated)
- `space_id` (optional)
- `model` (optional, use `occupancy` or `slot-occupancy`)

```json
{ "results": [ ... ], "total": 3 }
```

---

### GET `/api/v1/inference/history`

Paginated inference log, newest first.

**Query params:**

- `page` (default 1)
- `page_size` (default 20, max 100)
- `slot_id` (optional)
- `space_id` (optional)

---

### POST `/api/v1/inference/plate`

Find every licence plate in an image (slot image or full camera frame) and read it. The YOLO26n detector finds the plates, the YOLO26s reader finds each character, and the characters become text: district, word and letter first, then the digits. Plates are returned most confident first; `plates` is empty when no plate is found.

**Form field:** `file` — JPEG or PNG

**Query params:**

- `slot_id` (optional)
- `space_id` (optional)

```json
{
  "slot_id": "A01",
  "space_id": "space-abc",
  "plates": [
    {
      "box": { "x1": 412, "y1": 1630, "x2": 640, "y2": 1764 },
      "confidence": 0.9412,
      "text_en": "Dhaka Metro Ga 24-2955",
      "text_bn": "ঢাকা মেট্রো গ ২৪-২৯৫৫"
    }
  ],
  "inference_id": "6a563b45a83b52e626761fdc",
  "created_at": "2026-11-05T10:12:41.204Z"
}
```

Store `text_en`: two reader classes differ only in case (`Da` / `DA`, `Tha` / `THA`), so keep the text as returned.

---

## Storage

Records are stored in MongoDB and auto-deleted after 30 days by a TTL index.

`inferences` (occupancy):

```
slot_id, space_id, label, confidence, filename, created_at
```

`plate_reads` (licence plates):

```
slot_id, space_id, plates[box, confidence, text_en, text_bn], filename, created_at
```

---

## Adding a new task

1. Train a model and export weights to `weights/<task-name>/`.
2. Add a `*_MODEL` env var in `.env` and `config.py`.
3. Create a predictor function in `predictor.py`.
4. Add a router under `routes/` and register it in `main.py`.
