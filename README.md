# FLOWSTATE Personal Workspace

**A private space for personal activity sessions** — a local-first web application for noticing movement, posture and session patterns.

> FLOWSTATE is an assistive analytics prototype. It does not diagnose health conditions, read emotions, or objectively measure concentration/productivity. All scores are transparent heuristics derived from observable signals.

## What's included

- React + TypeScript + Vite frontend
- Browser webcam capture with explicit user permission
- On-device pose, face, gaze, blink, and phone-object indicators
- Session activity estimates, stillness tracking, timelines and optional break prompts
- Local feature extraction; raw frames are not uploaded
- FastAPI backend with JWT authentication
- SQLite by default, SQLAlchemy persistence
- Session lifecycle, event ingestion, analytics and recommendations
- Interactive dashboard, live vision screen, session history and privacy settings
- Architecture, flowcharts, API documentation and development roadmap

## Quick start

### Requirements
- Python 3.10+
- Node.js 20+
- A modern browser
- Webcam permission for live vision (localhost is treated as a secure context)

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/docs

The default database is SQLite at `backend/flowstate.db`. Change `DATABASE_URL` for PostgreSQL.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

The frontend uses a local Vite proxy for `/api/v1` by default.

### Workspace

FLOWSTATE opens a private browser workspace automatically. No login screen or account setup is needed. Session data is associated with this browser's local workspace.

## Computer vision setup

The Live Session screen loads MediaPipe Tasks Vision and its pose, face, and object models from public CDN URLs. Internet access is required on first load. Models run in the browser. The camera stream is not sent to the backend. Starting a session requests camera permission automatically.

If model download fails:
1. Check internet access and browser console.
2. Confirm webcam permission.
3. Try Chrome or Edge on localhost.
4. Check that the selected model asset URL remains available; model hosting can change over time.

Pose, face, and object landmarks are processed locally. FLOWSTATE estimates upright/leaning posture, camera-facing and gaze direction, blink rate, movement, and visible-phone proximity. Sitting, standing, walking, typing-like movement, and away/not-visible labels are heuristics and depend on the full body being in view. They are not reliable activity recognition, attention, or distraction judgments. The absent-person indicator can also mean the camera is blocked or tracking was lost.

## Main modules

| Module | Purpose |
|---|---|
| Overview | Session totals, trends and latest recommendations |
| Live Session | Camera, posture/activity estimates, gaze and blink indicators, phone proximity, live prompts |
| Sessions | Review saved movement, posture, and camera-facing patterns over time |
| Activity Analytics | Session-level observation summaries |
| Session Guidance | Optional rule-based reflection prompts |
| Reports | Session history and summaries |
| Privacy | Camera controls and data deletion guidance |

## API overview

- `POST /api/v1/auth/guest`
- `GET /api/v1/auth/me`
- `POST /api/v1/sessions`
- `GET /api/v1/sessions`
- `GET /api/v1/sessions/{session_id}`
- `POST /api/v1/sessions/{session_id}/events`
- `POST /api/v1/sessions/{session_id}/finish`
- `GET /api/v1/analytics/summary`
- `GET /api/v1/recommendations`
- `GET /health`

All authenticated endpoints require `Authorization: Bearer <token>`.

## Configuration

Backend: copy `backend/.env.example` to `backend/.env`.

Important settings:
- `SECRET_KEY`: replace before deployment with a long random secret.
- `DATABASE_URL`: SQLite by default; PostgreSQL URL for production.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT lifetime.
- `CORS_ORIGINS`: comma-separated frontend origins.

Frontend: `frontend/.env.example`.

## Production checklist

- Use PostgreSQL and run migrations (Alembic is included as a dependency; migration scripts should be generated for production schema evolution).
- Set a strong unique `SECRET_KEY`.
- Restrict CORS to the deployed frontend origin.
- Serve only over HTTPS.
- Use managed secrets; never commit `.env`.
- Add backups, monitoring, rate limiting and security review.
- Review applicable privacy and data protection laws before real-world deployment.
- Keep raw webcam video local by default; disclose any future processing changes clearly.
- Add model evaluation on representative, consented data before making performance claims.

## Repository map

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for full architecture and Mermaid flowcharts, and [`docs/API.md`](docs/API.md) for API details.

## License

MIT for the original source code in this repository. Third-party model weights, datasets and libraries retain their own licenses and terms. Verify them independently before redistribution or commercial use.
