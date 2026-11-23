import type { User, VisionSession, Summary, Recommendation, SessionDetail } from "../types";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const TOKEN_KEY = "flowstate_token";
const CLIENT_ID_KEY = "flowstate_client_id";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (value: string) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

function getClientId() {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof URLSearchParams)) headers.set("Content-Type", "application/json");
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("FLOWSTATE could not reach its local service. Check that the backend is running and try again.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
  return body as T;
}

export const api = {
  guest: async () => {
    const result = await request<{access_token: string; user: User}>("/auth/guest", {
      method: "POST", body: JSON.stringify({client_id: getClientId()})
    });
    tokenStore.set(result.access_token); return result.user;
  },
  me: () => request<User>("/auth/me"),
  summary: () => request<Summary>("/analytics/summary"),
  recommendations: async () => (await request<{recommendations: Recommendation[]}>("/recommendations")).recommendations,
  sessions: () => request<VisionSession[]>("/sessions"),
  session: (id: number) => request<SessionDetail>(`/sessions/${id}`),
  deleteSession: (id: number) => request<void>(`/sessions/${id}`, {method:"DELETE"}),
  createSession: (title: string) => request<VisionSession>("/sessions", {method:"POST", body:JSON.stringify({title,source:"browser"})}),
  addEvent: (id: number, event_type: string, value: number | null, confidence: number | null, metadata: object = {}) =>
    request(`/sessions/${id}/events`, {method:"POST", body:JSON.stringify({event_type,value,confidence,metadata})}),
  finishSession: (id: number) => request<VisionSession>(`/sessions/${id}/finish`, {method:"POST"})
};
