# FLOWSTATE API Reference

Base URL: `http://127.0.0.1:8000/api/v1`

Interactive OpenAPI docs: `/docs`.

## Authentication

Register:
```http
POST /auth/register
Content-Type: application/json

{"email":"user@example.com","password":"use-a-long-password"}
```

Login:
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=use-a-long-password
```

Use returned `access_token`:
```http
Authorization: Bearer <access_token>
```

## Sessions

Create:
```http
POST /sessions
{"title":"Morning study","source":"browser"}
```

Add event:
```http
POST /sessions/{session_id}/events
{
  "event_type":"posture_proxy",
  "value":0.72,
  "confidence":0.84,
  "metadata":{"label":"possible_forward_lean"}
}
```

Finish:
```http
POST /sessions/{session_id}/finish
```

## Analytics

`GET /analytics/summary` returns session count, total tracked time, event counts and latest sessions for the authenticated user.

`GET /recommendations` returns explainable suggestions generated from session event aggregates.

## Event types

Suggested values:
- `pose_available`
- `face_available`
- `movement_proxy`
- `posture_proxy`
- `break`
- `activity_label`

Do not send images, video frames, face embeddings or identifying biometric templates.
