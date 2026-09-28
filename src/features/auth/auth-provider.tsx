import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, endSession, onSessionEnded, refreshSession, startSession, type SessionResponse, type User } from "@/lib/api";
import { loadSession } from "@/lib/session-store";
import type { SignInInput, SignUpInput } from "./schemas";

type Status = "loading" | "signed-in" | "signed-out";

type AuthState = {
  status: Status;
  user: User | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Knows who is signed in, and is the only place that signs anyone in or out. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const client = useQueryClient();

  // Everything cached under "me" (bookings, shortlist) belongs to one person:
  // drop it whenever the person changes, so nobody ever sees someone else's.
  const forgetPersonalData = () => client.removeQueries({ queryKey: ["me"] });

  useEffect(() => {
    const stop = onSessionEnded(() => {
      client.removeQueries({ queryKey: ["me"] });
      setUser(null);
      setStatus("signed-out");
    });

    (async () => {
      const saved = await loadSession();
      if (!saved.refreshToken || !saved.user) {
        setStatus("signed-out");
        return;
      }
      // Open instantly with the last known profile, then refresh quietly in the
      // background. Offline is fine: the saved session is kept for later.
      setUser(saved.user);
      setStatus("signed-in");
      const fresh = await refreshSession().catch(() => null);
      if (fresh) setUser(fresh.user);
    })().catch(() => setStatus("signed-out"));

    return stop;
  }, [client]);

  const begin = async (session: SessionResponse) => {
    await startSession(session);
    forgetPersonalData();
    setUser(session.user);
    setStatus("signed-in");
  };

  const signIn = async (input: SignInInput) => {
    await begin(await api<SessionResponse>("/v1/auth/login", { body: input }));
  };

  const signUp = async (input: SignUpInput) => {
    await begin(await api<SessionResponse>("/v1/auth/register", { body: input }));
  };

  const signOut = async () => {
    const { refreshToken } = await loadSession();
    // Forget the session on this phone first, so signing out works even offline.
    await endSession();
    forgetPersonalData();
    setUser(null);
    setStatus("signed-out");
    if (refreshToken) await api("/v1/auth/logout", { body: { refreshToken } }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ status, user, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
