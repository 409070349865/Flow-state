from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.session import VisionSession, ActivityEvent
from app.services.recommendations import build_recommendations

router = APIRouter(tags=["Analytics"])

@router.get("/analytics/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sessions = db.query(VisionSession).filter(VisionSession.user_id == user.id).order_by(VisionSession.started_at.desc()).all()
    session_ids = [s.id for s in sessions]
    events = db.query(ActivityEvent).join(VisionSession).filter(VisionSession.user_id == user.id).all()
    event_counts = __import__("collections").Counter()
    for event in events:
        if event.event_type != "vision_snapshot":
            event_counts[event.event_type] += 1
            continue
        metadata = event.metadata_json or {}
        for key in ("activity", "posture", "gaze_direction"):
            value = metadata.get(key)
            if isinstance(value, str) and value and value not in {"unknown", "present"}:
                event_counts[f"{key}_{value}"] += 1
        if metadata.get("phone_use_likely"):
            event_counts["phone_near_hand"] += 1
        if metadata.get("screen_facing") is True:
            event_counts["facing_camera"] += 1
    return {
        "session_count": len(sessions),
        "completed_sessions": sum(1 for s in sessions if s.status == "completed"),
        "total_duration_seconds": sum(s.duration_seconds for s in sessions),
        "event_count": len(events),
        "recent_sessions": [{
            "id": s.id, "title": s.title, "status": s.status,
            "started_at": s.started_at, "duration_seconds": s.duration_seconds
        } for s in sessions[:8]],
        "event_counts": dict(event_counts)
    }

@router.get("/recommendations")
def recommendations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    events = db.query(ActivityEvent).join(VisionSession).filter(VisionSession.user_id == user.id).order_by(ActivityEvent.recorded_at.desc()).limit(500).all()
    data = [{"event_type": e.event_type, "value": e.value, "metadata": e.metadata_json or {}, "recorded_at": e.recorded_at} for e in reversed(events)]
    return {"recommendations": build_recommendations(data)}
