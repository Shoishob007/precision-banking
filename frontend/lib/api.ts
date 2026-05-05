const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface ApiErrorShape {
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const API_REQUEST_STARTED_EVENT = "precision:api-request-started";
export const API_REQUEST_ENDED_EVENT = "precision:api-request-ended";
export const AUTH_INVALID_EVENT = "precision:auth-invalid";

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(API_REQUEST_STARTED_EVENT));
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    const body = await parseJson<T | ApiErrorShape>(response);

    if (!response.ok) {
      const errorBody = body as ApiErrorShape;

      if (response.status === 401 && token && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(AUTH_INVALID_EVENT, {
            detail: {
              message:
                errorBody.message ??
                "Your session has expired. Please sign in again.",
            },
          }),
        );
      }

      throw new ApiError(
        response.status,
        errorBody.message ?? "Request failed.",
        errorBody.details,
      );
    }

    return body as T;
  } finally {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(API_REQUEST_ENDED_EVENT));
    }
  }
}

export { API_BASE_URL };
