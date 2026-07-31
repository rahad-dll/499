from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query

from db.mongodb import get_collection

from auth.dependencies import verify_token
from models.schemas import (
    PredictionResponse,
    BatchPredictionResponse,
    HistoryResponse,
)
from predictor import predict

router = APIRouter(prefix="/api/v1/inference", tags=["inference"])


@router.post("/predict", response_model=PredictionResponse)
async def predict_single(
    file:     UploadFile = File(..., description="pre-cropped image of one parking slot"),
    slot_id:  str = Query(None, description="slot identifier"),
    space_id: str = Query(None, description="parking space identifier"),
    model:    str = Query(None, description="use occupancy or slot-occupancy"),
    _token:   str = Depends(verify_token),
):
    """Classify a single slot image. Send a cropped slot patch — not the full frame."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image")

    image_bytes = await file.read()
    result = predict(image_bytes, model_name=model)

    doc = {
        "slot_id":    slot_id,
        "space_id":   space_id,
        "label":      result["label"],
        "confidence": result["confidence"],
        "filename":   file.filename,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        col = get_collection("inferences")
        insert_result = await col.insert_one(doc)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="inference storage unavailable") from exc

    return PredictionResponse(
        slot_id=slot_id,
        space_id=space_id,
        prediction=result,
        inference_id=str(insert_result.inserted_id),
        created_at=doc["created_at"],
    )


@router.post("/predict-batch", response_model=BatchPredictionResponse)
async def predict_batch(
    files:    list[UploadFile] = File(..., description="one image per slot"),
    slot_ids: str = Query(None, description="comma-separated slot ids, positional"),
    space_id: str = Query(None, description="parking space identifier"),
    model:    str = Query(None, description="use occupancy or slot-occupancy"),
    _token:   str = Depends(verify_token),
):
    """Classify multiple slot images in one request.

    slot_ids maps to files by position — first id matches first file.
    Omit slot_ids to leave all slot_id fields null.
    """
    slot_id_list = slot_ids.split(",") if slot_ids else [None] * len(files)

    if len(slot_id_list) != len(files):
        raise HTTPException(status_code=400, detail="slot_ids count must match files count")

    try:
        col = get_collection("inferences")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="inference storage unavailable") from exc

    docs = []

    for f, sid in zip(files, slot_id_list):
        if not f.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"{f.filename} is not an image")

        result = predict(await f.read(), model_name=model)
        docs.append({
            "slot_id":    sid,
            "space_id":   space_id,
            "label":      result["label"],
            "confidence": result["confidence"],
            "filename":   f.filename,
            "created_at": datetime.now(timezone.utc),
        })

    insert_result = await col.insert_many(docs)

    results = [
        PredictionResponse(
            slot_id=doc["slot_id"],
            space_id=doc["space_id"],
            prediction={"label": doc["label"], "confidence": doc["confidence"]},
            inference_id=str(oid),
            created_at=doc["created_at"],
        )
        for doc, oid in zip(docs, insert_result.inserted_ids)
    ]

    return BatchPredictionResponse(results=results, total=len(results))


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    page:      int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    slot_id:   str = Query(None, description="filter by slot id"),
    space_id:  str = Query(None, description="filter by space id"),
    _token:    str = Depends(verify_token),
):
    """Return paginated inference history, newest first."""
    try:
        col = get_collection("inferences")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="inference storage unavailable") from exc

    query = {}
    if slot_id:
        query["slot_id"] = slot_id
    if space_id:
        query["space_id"] = space_id

    total  = await col.count_documents(query)
    cursor = col.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    docs   = await cursor.to_list(length=page_size)

    results = [
        PredictionResponse(
            slot_id=d.get("slot_id"),
            space_id=d.get("space_id"),
            prediction={"label": d["label"], "confidence": d["confidence"]},
            inference_id=str(d["_id"]),
            created_at=d["created_at"],
        )
        for d in docs
    ]

    return HistoryResponse(results=results, total=total, page=page, page_size=page_size)
