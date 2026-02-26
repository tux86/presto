import { useAuthStore } from "../stores/auth.store";
import { useConfigStore } from "../stores/config.store";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  code?: string;
  entity?: string;
  dependentCount?: number;

  constructor(message: string, status: number, body?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code as string | undefined;
    this.entity = body?.entity as string | undefined;
    this.dependentCount = body?.dependentCount as number | undefined;
  }
}

function extractZodMessages(issues: { message?: string }[]): string {
  return issues.map((i) => i.message || "Validation error").join(". ");
}

function extractErrorMessage(body: Record<string, unknown>, status: number): string {
  if (typeof body.error === "string") return body.error;

  const err = body.error as Record<string, unknown> | undefined;

  // Zod validation: issues as direct array property
  if (Array.isArray(err?.issues)) {
    return extractZodMessages(err.issues as { message?: string }[]);
  }

  // Zod 4: issues serialized as JSON string inside message
  const message = (err?.message as string) || (body.message as string);
  if (message?.startsWith("[")) {
    try {
      return extractZodMessages(JSON.parse(message));
    } catch {}
  }

  return message || `Request failed: ${status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const authDisabled = useConfigStore.getState().config?.authDisabled ?? false;
  const isAuthRoute =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/password") ||
    path.startsWith("/auth/delete-account");
  if (res.status === 401 && !authDisabled && !isAuthRoute) {
    useAuthStore.getState().logout();
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(extractErrorMessage(body, res.status), res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(extractErrorMessage(body, res.status), res.status, body);
  }

  return res;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getBlob: (path: string) => requestBlob(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
