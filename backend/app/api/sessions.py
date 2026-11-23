from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.session import VisionSession, ActivityEvent
from app.schemas.session import SessionCreate, SessionResponse, EventCreate, EventResponse

router = APIRouter(prefix="/sessions", tags=["Sessions"])

def owned_session(session_id: int, user: User, db: Session):
    item = db.query(VisionSession).options(joinedload(VisionSession.events)).filter(
        VisionSession.id == session_id, VisionSession.user_id == user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Session not found")
    return item

@router.post("", response_model=SessionResponse, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = VisionSession(user_id=user.id, title=payload.title, source=payload.source)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("", response_model=list[SessionResponse])
def list_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(VisionSession).filter(VisionSession.user_id == user.id).order_by(VisionSession.started_at.desc()).limit(100).all()

@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = owned_session(session_id, user, db)
    return {
        "session": SessionResponse.model_validate(item),
        "events": [EventResponse.model_validate(e) for e in item.events]
    }

@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = owned_session(session_id, user, db)
    db.delete(item)
    db.commit()
    return Response(status_code=204)

@router.post("/{session_id}/events", response_model=EventResponse, status_code=201)
def add_event(session_id: int, payload: EventCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(VisionSession).filter(VisionSession.id == session_id, VisionSession.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Session not found")
    if item.status != "active":
        raise HTTPException(status_code=409, detail="Cannot add events to a finished session")
    event = ActivityEvent(
        session_id=item.id, event_type=payload.event_type, value=payload.value,
        confidence=payload.confidence, metadata_json=payload.metadata_json
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.post("/{session_id}/finish", response_model=SessionResponse)
def finish_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(VisionSession).filter(VisionSession.id == session_id, VisionSession.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Session not found")
    if item.status == "active":
        now = datetime.now(timezone.utc)
        started = item.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        item.ended_at = now
        item.duration_seconds = max(0, int((now - started).total_seconds()))
        item.status = "completed"
        db.commit()
        db.refresh(item)
    return item
