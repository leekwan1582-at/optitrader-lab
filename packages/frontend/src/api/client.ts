import { errorResponseSchema } from '@optitrader/shared';
import type { ZodType } from 'zod';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details: unknown;
  code?: string;

  constructor(message: string, status = 0, details: unknown = null, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export interface UploadOptions {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

const AUTH_PATHS = new Set(['/auth/login', '/auth/register', '/auth/refresh']);

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessCookie(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      return response.ok;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  schema?: ZodType<T>,
  { method = 'GET', body, signal }: RequestOptions = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    signal,
  });

  if (response.status === 401 && retry && !AUTH_PATHS.has(path)) {
    const refreshed = await refreshAccessCookie();
    if (refreshed) {
      return request<T>(path, schema, { method, body, signal }, false);
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const payload: unknown = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;

    if (payload && typeof payload === 'object') {
      const parsedError = errorResponseSchema.safeParse(payload);
      if (parsedError.success) {
        message = parsedError.data.message;
        code = parsedError.data.code;
      } else {
        const fallback = payload as { message?: string; error?: string };
        message = fallback.error || fallback.message || message;
      }
    } else if (typeof payload === 'string' && payload.length > 0) {
      message = payload;
    }

    throw new ApiError(message, response.status, payload, code);
  }

  if (schema) {
    return schema.parse(payload);
  }

  return payload as T;
}

function uploadWithXhr<T>(
  path: string,
  formData: FormData,
  schema?: ZodType<T>,
  options: UploadOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload aborted', 'AbortError'));
      });
    }

    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      let payload: unknown;
      try {
        const contentType = xhr.getResponseHeader('content-type') || '';
        payload = contentType.includes('application/json')
          ? JSON.parse(xhr.responseText)
          : xhr.responseText;
      } catch {
        payload = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (schema) {
          try {
            resolve(schema.parse(payload));
          } catch (err) {
            reject(err);
          }
        } else {
          resolve(payload as T);
        }
      } else {
        let message = `Request failed with status ${xhr.status}`;
        let code: string | undefined;

        if (payload && typeof payload === 'object') {
          const parsedError = errorResponseSchema.safeParse(payload);
          if (parsedError.success) {
            message = parsedError.data.message;
            code = parsedError.data.code;
          } else {
            const fallback = payload as { message?: string; error?: string };
            message = fallback.error || fallback.message || message;
          }
        } else if (typeof payload === 'string' && payload.length > 0) {
          message = payload;
        }

        reject(new ApiError(message, xhr.status, payload, code));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError('Network error during file upload', 0));
    };

    xhr.send(formData);
  });
}

export const http = {
  get: <T>(path: string, schema?: ZodType<T>, options?: RequestOptions) =>
    request<T>(path, schema, { ...options, method: 'GET' }),
  post: <T>(path: string, body: unknown, schema?: ZodType<T>, options?: RequestOptions) =>
    request<T>(path, schema, { ...options, method: 'POST', body }),
  put: <T>(path: string, body: unknown, schema?: ZodType<T>, options?: RequestOptions) =>
    request<T>(path, schema, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body: unknown, schema?: ZodType<T>, options?: RequestOptions) =>
    request<T>(path, schema, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, schema?: ZodType<T>, options?: RequestOptions) =>
    request<T>(path, schema, { ...options, method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData, schema?: ZodType<T>, options?: UploadOptions) =>
    uploadWithXhr<T>(path, formData, schema, options),
};

export { API_URL };
