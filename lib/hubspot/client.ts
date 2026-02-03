// lib/hubspot/client.ts
// Server-only HubSpot API wrapper for Next.js (Node 18+ has global fetch)

import "server-only";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type HubSpotOk<T = unknown> = {
  status: "ok";
  data: T;
  statusCode: number;
};

export type HubSpotErr = {
  status: "error";
  reason: string;
  statusCode?: number;
  details?: unknown;
};

export type HubSpotResult<T = unknown> = HubSpotOk<T> | HubSpotErr;

type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  json?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number; // default 3
};

const BASE_URL = "https://api.hubapi.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const buildUrl = (endpoint: string, query?: RequestOptions["query"]) => {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(path, BASE_URL);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  return url.toString();
};

const isTransientStatus = (status: number) =>
  status === 429 || status === 408 || (status >= 500 && status <= 599);

const isAbortError = (err: unknown) =>
  err instanceof DOMException && err.name === "AbortError";

const parseRetryAfterMs = (retryAfterHeader: string | null) => {
  if (!retryAfterHeader) return null;
  const seconds = Number.parseInt(retryAfterHeader, 10);
  if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1000;
  return null;
};

const safeJsonParse = (text: string) => {
  try {
    return { ok: true as const, data: JSON.parse(text) };
  } catch {
    return { ok: false as const, data: text };
  }
};

export class HubSpotClient {
  private token: string;

  constructor(token?: string) {
    const envToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    this.token = token ?? envToken ?? "";

    if (!this.token) {
      throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN env var (or pass token to constructor).");
    }
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    opts: RequestOptions = {}
  ): Promise<HubSpotResult<T>> {
    const url = buildUrl(endpoint, opts.query);
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = opts.retries ?? DEFAULT_RETRIES;

    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      ...(opts.headers ?? {}),
    };

    // Only set JSON content-type if we're actually sending a JSON body.
    const hasBody = opts.json !== undefined && method !== "GET" && method !== "DELETE";
    if (hasBody && !baseHeaders["Content-Type"]) {
      baseHeaders["Content-Type"] = "application/json";
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          method,
          headers: baseHeaders,
          body: hasBody ? JSON.stringify(opts.json) : undefined,
          signal: controller.signal,
        });

        // Handle 429 / 5xx with retry
        if (!res.ok) {
          const statusCode = res.status;

          const bodyText = await res.text().catch(() => "");
          const parsed = bodyText ? safeJsonParse(bodyText) : { ok: true as const, data: null };

          // Retry on transient errors if attempts remain
          if (isTransientStatus(statusCode) && attempt < retries - 1) {
            const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
            // basic exponential backoff with a small floor
            const backoffMs = Math.max(500, 500 * 2 ** attempt);
            const waitMs = retryAfterMs ?? backoffMs;
            clearTimeout(timeout);
            await sleep(waitMs);
            continue;
          }

          return {
            status: "error",
            reason: `HTTP ${statusCode} ${res.statusText}`,
            statusCode,
            details: parsed.data,
          };
        }

        // Parse response body (some endpoints return empty body)
        const raw = await res.text().catch(() => "");
        if (!raw) {
          return { status: "ok", data: undefined as unknown as T, statusCode: res.status };
        }

        const parsed = safeJsonParse(raw);
        if (!parsed.ok) {
          return {
            status: "error",
            reason: "Response was not valid JSON",
            statusCode: res.status,
            details: parsed.data,
          };
        }

        return { status: "ok", data: parsed.data as T, statusCode: res.status };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

        // Retry on network/timeout errors if attempts remain
        const canRetry = (isAbortError(err) || message.toLowerCase().includes("fetch")) && attempt < retries - 1;
        if (canRetry) {
          clearTimeout(timeout);
          const backoffMs = Math.max(500, 500 * 2 ** attempt);
          await sleep(backoffMs);
          continue;
        }

        return { status: "error", reason: message };
      } finally {
        clearTimeout(timeout);
      }
    }

    return { status: "error", reason: "Max retries exceeded" };
  }

  get<T = unknown>(endpoint: string, opts?: RequestOptions) {
    return this.request<T>("GET", endpoint, opts);
  }

  post<T = unknown>(endpoint: string, opts?: RequestOptions) {
    return this.request<T>("POST", endpoint, opts);
  }

  patch<T = unknown>(endpoint: string, opts?: RequestOptions) {
    return this.request<T>("PATCH", endpoint, opts);
  }

  put<T = unknown>(endpoint: string, opts?: RequestOptions) {
    return this.request<T>("PUT", endpoint, opts);
  }

  delete<T = unknown>(endpoint: string, opts?: RequestOptions) {
    return this.request<T>("DELETE", endpoint, opts);
  }


  // 
  async getServiceRecords() {
  return this.get("/crm/v3/objects/0-162?properties=hs_object_id, hs_name, hs_status, hs_start_date, hs_target_end_date&associations=companies", {
    query: { limit: 50 },
  });
}

// Get a single Company by ID
async getCompanyById(id: string) {
  return this.get(`/crm/v3/objects/companies/${id}?properties=hs_object_id, name, domain`);
}

// Create a note and attach it to a Service record
// async createNoteOnService(serviceId: string, noteBody: string) {
//   return this.post("/crm/v3/objects/notes", {
//     json: {
//       properties: {
//         hs_note_body: noteBody,
//       },
//       associations: [
//         {
//           to: { id: serviceId },
//           types: [
//             {
//               associationCategory: "HUBSPOT_DEFINED",
//               associationTypeId: 190, //  may differ 
//             },
//           ],
//         },
//       ],
//     },
//   });
// }
}

/*
Usage example (server code only):

import { HubSpotClient } from "@/lib/hubspot/HubSpotClient";

const hs = new HubSpotClient();

const res = await hs.get("/crm/v3/objects/companies", { query: { limit: 10 } });

if (res.status === "ok") console.log(res.data);
else console.error(res.statusCode, res.reason, res.details);
*/
