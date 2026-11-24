import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import TypeAdapter, ValidationError

from auth.dependencies import verify_token
from db.mongodb import get_collection
from models.schemas import FrameResponse, FrameSlot
from predictor import analyse_frame

router = APIRouter(prefix="/api/v1/inference", tags=["frames"])

MAX_SLOTS = 200
_slot_list = TypeAdapter(list[FrameSlot])


@router.post("/frame", response_model=FrameResponse)
async def read_frame(
    file:      UploadFile = File(..., description="full camera frame"),
    slots:     str = Form(..., description='JSON list: [{"slot_id": "A1", "x1": 0.1, "y1": 0.5, "x2": 0.2, "y2": 0.7}]'),
    space_id:  str = Query(None, description="parking space identifier"),
    camera_id: str = Query(None, description="camera identifier"),
    model:     str = Query(None, description="use occupancy or slot-occupancy"),
    _token:    str = Depends(verify_token),
):
    """Occupancy of every slot in one camera frame, and the plate of each occupied slot."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image")

    try:
        slot_list = _slot_list.validate_python(json.loads(slots))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=422, detail=f"invalid slots: {exc}") from exc
    if not slot_list or len(slot_list) > MAX_SLOTS:
        raise HTTPException(status_code=422, detail=f"send 1 to {MAX_SLOTS} slots")
    for s in slot_list:
        if s.x2 <= s.x1 or s.y2 <= s.y1:
            raise HTTPException(status_code=422, detail=f"slot {s.slot_id}: needs x1 < x2 and y1 < y2")

    results = analyse_frame(await file.read(), [s.model_dump() for s in slot_list], model_name=model)

    doc = {
        "space_id":   space_id,
        "camera_id":  camera_id,
        "slots":      results,
        "filename":   file.filename,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        col = get_collection("frame_reads")
        insert_result = await col.insert_one(doc)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="inference storage unavailable") from exc

    return FrameResponse(
        space_id=space_id,
        camera_id=camera_id,
        slots=results,
        inference_id=str(insert_result.inserted_id),
        created_at=doc["created_at"],
    )
