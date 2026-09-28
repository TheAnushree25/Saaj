import Constants from "expo-constants";
import { Platform } from "react-native";
import { clearSession, loadSession, saveSession } from "./session-store";

export type Role = "customer" | "artist" | "admin";

export type User = {
  id: string;
  role: Role;
  fullName: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  city: string | null;
  weddingDate: string | null;
  createdAt: string;
};

export type Tokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type SessionResponse = { user: User; tokens: Tokens };

/**
 * Where the Saaj API lives. Production builds set EXPO_PUBLIC_API_URL. In
 * development a phone cannot use "localhost" (that is the phone itself), so we
 * reuse the laptop address Expo already serves the app from, on port 4000.
 */
function resolveApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const laptop = Constants.expoConfig?.hostUri?.split(":")[0];
  if (Platform.OS !== "web" && laptop) return `http://${laptop}:4000`;
  return "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

/** Every error the API sends has this shape; `code` is what the app switches on. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } } | null;

// The access token lives only in memory: it is short-lived and never written to disk.
let accessToken: string | null = null;
let refreshing: Promise<SessionResponse | null> | null = null;
const endedListeners = new Set<() => void>();

/** Called when the server ends the session (password changed, signed out everywhere, suspended). */
export function onSessionEnded(listener: () => void) {
  endedListeners.add(listener);
  return () => {
    endedListeners.delete(listener);
  };
}

export async function startSession(session: SessionResponse) {
  accessToken = session.tokens.accessToken;
  await saveSession(session.tokens.refreshToken, session.user);
}

export async function endSession() {
  accessToken = null;
  await clearSession();
}

async function send(path: string, method: Method, body: unknown, token: string | null) {
  // Give up after 15 seconds instead of spinning forever on a dead connection.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach Saaj right now. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ErrorBody)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details,
    );
  }
  return data as T;
}

/**
 * Swaps the saved refresh token for a fresh session. Only one swap runs at a
 * time: if ten requests expire together they share it, instead of racing to
 * use the same one-time token ten times. Returns null when there is no session.
 */
export function refreshSession(): Promise<SessionResponse | null> {
  refreshing ??= (async () => {
    const { refreshToken } = await loadSession();
    if (!refreshToken) return null;
    try {
      const session = await parse<SessionResponse>(await send("/v1/auth/refresh", "POST", { refreshToken }, null));
      await startSession(session);
      return session;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await endSession();
        endedListeners.forEach((listener) => listener());
        return null;
      }
      throw error; // offline: keep the saved session and try again later
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Calls the API as the signed-in user (or as a guest), refreshing the session when it expires. */
export async function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");

  // First call after launching the app: turn the saved sign-in into an access token.
  if (!accessToken && (await loadSession()).refreshToken) await refreshSession();

  let response = await send(path, method, options.body, accessToken);
  if (response.status === 401 && accessToken) {
    const code = await response
      .clone()
      .json()
      .then((data: ErrorBody) => data?.error?.code)
      .catch(() => undefined);
    if (code === "TOKEN_EXPIRED" && (await refreshSession())) {
      response = await send(path, method, options.body, accessToken);
    }
  }
  return parse<T>(response);
}
