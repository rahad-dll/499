from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query

from db.mongodb import get_collection

from auth.dependencies import verify_token
from models.schemas import PlateResponse
from predictor import read_plates

router = APIRouter(prefix="/api/v1/inference", tags=["plates"])


@router.post("/plate", response_model=PlateResponse)
async def read_plate(
    file:     UploadFile = File(..., description="slot image or camera frame"),
    slot_id:  str = Query(None, description="slot identifier"),
    space_id: str = Query(None, description="parking space identifier"),
    _token:   str = Depends(verify_token),
):
    """Find every licence plate in the image and read it in English and Bangla."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image")

    plates = read_plates(await file.read())

    doc = {
        "slot_id":    slot_id,
        "space_id":   space_id,
        "plates":     plates,
        "filename":   file.filename,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        col = get_collection("plate_reads")
        insert_result = await col.insert_one(doc)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="inference storage unavailable") from exc

    return PlateResponse(
        slot_id=slot_id,
        space_id=space_id,
        plates=plates,
        inference_id=str(insert_result.inserted_id),
        created_at=doc["created_at"],
    )
