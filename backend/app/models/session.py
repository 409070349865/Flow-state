from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class VisionSession(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(160), default="Untitled session", nullable=False)
    source = Column(String(40), default="browser", nullable=False)
    status = Column(String(20), default="active", nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)
    events = relationship("ActivityEvent", back_populates="session", cascade="all, delete-orphan")

class ActivityEvent(Base):
    __tablename__ = "activity_events"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    event_type = Column(String(60), nullable=False, index=True)
    value = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    metadata_json = Column(JSON, default=dict, nullable=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    session = relationship("VisionSession", back_populates="events")
