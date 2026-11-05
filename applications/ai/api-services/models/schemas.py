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
