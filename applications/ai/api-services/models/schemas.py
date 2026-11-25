from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    slot_id:  Optional[str] = Field(None, description="parking slot identifier")
    space_id: Optional[str] = Field(None, description="parking space identifier")


class PredictionResult(BaseModel):
    label:      str   = Field(..., description="empty or occupied")
    confidence: float = Field(..., description="softmax probability of the predicted class (0–1)")


class PredictionResponse(BaseModel):
    slot_id:      Optional[str] = None
    space_id:     Optional[str] = None
    prediction:   PredictionResult
    inference_id: str       # MongoDB ObjectId as string
    created_at:   datetime


class BatchPredictionResponse(BaseModel):
    results: list[PredictionResponse]
    total:   int


class HistoryResponse(BaseModel):
    results:   list[PredictionResponse]
    total:     int
    page:      int
    page_size: int


class PlateBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class PlateRead(BaseModel):
    box:        PlateBox = Field(..., description="plate position in the image, pixels")
    confidence: float    = Field(..., description="plate detector confidence (0–1)")
    text_en:    str      = Field(..., description="plate text in English, e.g. 'Dhaka Metro Ga 12-3456'")
    text_bn:    str      = Field(..., description="plate text in Bangla")


class PlateResponse(BaseModel):
    slot_id:      Optional[str] = None
    space_id:     Optional[str] = None
    plates:       list[PlateRead]   # most confident first; empty when no plate is found
    inference_id: str               # MongoDB ObjectId as string
    created_at:   datetime


class FrameSlot(BaseModel):
    slot_id: str
    x1: float = Field(..., ge=0, le=1, description="left edge, fraction of the frame width")
    y1: float = Field(..., ge=0, le=1, description="top edge, fraction of the frame height")
    x2: float = Field(..., ge=0, le=1, description="right edge, fraction of the frame width")
    y2: float = Field(..., ge=0, le=1, description="bottom edge, fraction of the frame height")


class FrameSlotResult(BaseModel):
    slot_id:    str
    prediction: PredictionResult
    plates:     list[PlateRead]     # read only for occupied slots


class FrameResponse(BaseModel):
    space_id:     Optional[str] = None
    camera_id:    Optional[str] = None
    slots:        list[FrameSlotResult]
    inference_id: str               # MongoDB ObjectId as string
    created_at:   datetime


class VideoFrameRequest(BaseModel):
    slots:     list[FrameSlot] = Field(..., min_length=1, max_length=200)
    space_id:  Optional[str] = None
    camera_id: Optional[str] = None
    at_s:      Optional[float] = Field(None, ge=0, description="seconds into the video; empty = now on the shared clock")


class VideoFrameResponse(FrameResponse):
    position_s: float           # where in the video the frame was taken


class VideoInfo(BaseModel):
    duration_s:  float
    clock_start: str            # ISO time the shared clock started
    position_s:  float          # where the video is now


class StandardResponse(BaseModel):
    success: bool = True
    data:    Optional[dict | list | None] = None
    message: str = ""
    error:   Optional[str] = None


class ErrorResponse(BaseModel):
    success: bool = False
    data:    None = None
    message: str = ""
    error:   str
