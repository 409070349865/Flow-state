export interface User { id: number; email: string }
export interface VisionSession {
  id: number; title: string; source: string; status: string;
  started_at: string; ended_at: string | null; duration_seconds: number;
}
export interface SessionEvent {
  id: number; event_type: string; value: number | null; confidence: number | null;
  metadata_json: Record<string, unknown>; recorded_at: string;
}
export interface SessionDetail { session: VisionSession; events: SessionEvent[] }
export interface Recommendation {
  title: string; message: string; evidence: string; type: string; confidence: string;
}
export interface Summary {
  session_count: number; completed_sessions: number; total_duration_seconds: number;
  event_count: number; recent_sessions: VisionSession[]; event_counts: Record<string, number>;
}
