from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, ConfigDict

class SessionCreate(BaseModel):
    title: str = Field(default="Untitled session", max_length=160)
    source: str = Field(default="browser", max_length=40)

class EventCreate(BaseModel):
    event_type: str = Field(min_length=2, max_length=60)
    value: float | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    metadata_json: dict[str, Any] = Field(default_factory=dict, alias="metadata")
    model_config = ConfigDict(populate_by_name=True)

class SessionResponse(BaseModel):
    id: int
    title: str
    source: str
    status: str
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int
    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    event_type: str
    value: float | None
    confidence: float | None
    metadata_json: dict
    recorded_at: datetime
    class Config:
        from_attributes = True
