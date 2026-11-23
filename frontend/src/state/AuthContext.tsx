import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../types";
import { api, tokenStore } from "../services/api";

type WorkspaceValue = {
  user: User | null;
  loading: boolean;
  error: string;
  connect: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function AuthProvider({children}:{children:ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const connect = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const existingToken = tokenStore.get();
      if (existingToken) {
        try {
          setUser(await api.me());
          return;
        } catch {
          tokenStore.clear();
        }
      }
      setUser(await api.guest());
    } catch (cause) {
      setUser(null);
      setError(cause instanceof Error ? cause.message : "Could not open the local workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void connect(); }, [connect]);

  return <WorkspaceContext.Provider value={{user, loading, error, connect}}>{children}</WorkspaceContext.Provider>;
}

export function useAuth() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
