const DEFAULT_API_BASE = "http://localhost:8000/api";
const ANDROID_EMULATOR_API_BASE = "http://10.0.2.2:8000/api";

type Env = {
  EXPO_PUBLIC_API_URL?: string;
  EXPO_PUBLIC_ANDROID_EMULATOR?: string;
};

function getEnv(): Env {
  // In Expo, public env vars are injected into `process.env` at build time.
  // We avoid depending on Node typings by treating it as an untyped global.
  const p = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  return (p?.env || {}) as Env;
}

export function getApiBase(): string {
  // Expo: use EXPO_PUBLIC_ vars (via process.env)
  // - iOS simulator: localhost works
  // - Android emulator: localhost must be mapped to 10.0.2.2
  const env = getEnv();
  const fromEnv = env.EXPO_PUBLIC_API_URL?.trim();
  const base = fromEnv || DEFAULT_API_BASE;
  const isAndroidEmulator = !!env.EXPO_PUBLIC_ANDROID_EMULATOR;

  if (isAndroidEmulator) return ANDROID_EMULATOR_API_BASE;
  if (base.includes("://localhost:") || base.includes("://127.0.0.1:")) return base;
  return base;
}

function withQuery(path: string, query: Record<string, string | undefined>) {
  const q = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  if (!q) return path;
  return path.includes("?") ? `${path}&${q}` : `${path}?${q}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; sheetId?: string } = {}
): Promise<T> {
  const base = getApiBase();
  const token = options.token;
  const sheetId = options.sheetId;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!headers["Content-Type"] && options.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const finalPath = withQuery(path, { sheetId });
  const { sheetId: _sheetId, token: _token, ...fetchOptions } = options;

  try {
    const res = await fetch(`${base}${finalPath}`, { ...fetchOptions, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = (data && (data.message as string)) || "Request failed";
      throw new Error(message);
    }
    return data as T;
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Handle generic fetch network errors (e.g. "Network request failed")
      if (err.message.toLowerCase().includes("network request failed") || err.message.toLowerCase().includes("failed to fetch")) {
        throw new Error("Unable to connect to the server. Please check your internet connection and ensure the API server is running and accessible.");
      }
      throw err;
    }
    throw new Error("An unexpected network error occurred.");
  }
}

