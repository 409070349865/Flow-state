# Implementation Roadmap

## Included in this ZIP
- Working account registration/login
- JWT-protected session APIs
- Browser camera capture
- MediaPipe pose and face landmark model loading
- Local feature proxy calculations
- Session event persistence
- Dashboard, analytics, reports and explainable rule-based recommendations

## Deliberate extension work
The repository is a runnable full-stack foundation, not a claim that a fully trained research model is already present. These components need dataset-backed development and evaluation:

1. Multi-class human activity recognition (CNN-LSTM/TCN/VideoMAE).
2. Object detection adapter (e.g. a properly licensed YOLO model).
3. Camera calibration and robust posture estimation.
4. Personal baseline models and change-point detection.
5. User-controlled data deletion and export workflow.
6. Automated frontend tests and backend integration tests.
7. PostgreSQL Alembic migration scripts and production observability.

## Suggested sequence
1. Run backend and frontend locally.
2. Validate auth and session APIs.
3. Validate camera permissions and local model inference.
4. Test varied lighting, camera placement and occlusion.
5. Improve signal quality and confidence logic.
6. Build temporal windows and per-user baselines.
7. Add activity model only after assembling a licensed, consented dataset.
8. Evaluate macro-F1, event precision/recall, FPS and latency.
9. Conduct privacy and security review before deployment.
