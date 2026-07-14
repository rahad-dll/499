# AI/ML Service

Centralized AI and machine learning service for CityPulse.

---

## Project Structure

```
ai/
├── ai-models/                   # model training, weights, notebooks
│   └── parking-occupancy/
│       └── mobilenetv2/
│           ├── notebooks/       # training notebooks
│           ├── weights/         # exported model weights
│           └── exported/        # exported artifacts
│
├── api-services/                # fastapi inference services
│   ├── .env                     # environment variables (gitignored)
│   ├── config.py                # env vars, model paths
│   ├── main.py                  # app entry point
│   ├── predictor.py             # model loading and inference
│   ├── requirements.txt         # python dependencies
│   ├── weights/                 # model weights for deployment
│   │   └── mobilenetv2/
│   │       └── phase1_weights.pth
│   ├── auth/                    # api token verification
│   ├── db/                      # mongodb connection
│   ├── models/                  # pydantic schemas
│   └── routes/                  # api endpoints
│
├── data/                        # datasets (gitignored)
│   ├── parking-occupancy-merged/
│   ├── CNRPark/
│   └── PKLot/
│
└── requirements.txt             # shared python dependencies
```

---

## Services

| Service | Path | Description |
|---------|------|-------------|
| Inference API | `api-services/` | FastAPI service for parking occupancy detection |
| Training | `ai-models/parking-occupancy/mobilenetv2/notebooks/` | Kaggle notebooks for model training |

---

## Models

| Model | Architecture | Task | Accuracy | Status |
|-------|-------------|------|----------|--------|
| Parking Occupancy | MobileNetV2 | binary classification (empty/occupied) | 97.28% (phase 1) | phase 1 done, phase 2 pending |

---

## Setup

```bash
# create virtual environment
python -m venv .venv
.venv\Scripts\activate        # windows
source .venv/bin/activate     # linux

# install dependencies
pip install -r requirements.txt
```

Swagger docs at http://localhost:8000/docs

---

## Data

Datasets are stored in `data/` and gitignored. Download from:

- parking-occupancy-merged: https://www.kaggle.com/datasets/raahad/parking-occupancy-merged
