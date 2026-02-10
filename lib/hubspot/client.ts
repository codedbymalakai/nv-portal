// lib/hubspot/client.ts
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
  retries?: number;
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

const isAbortError = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

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

export type GetServiceRecordsOpts = {
  limit?: number; // 1..100
  after?: string; // paging cursor
  associations?: string[]; // e.g. ["companies"]
  properties?: string[]; // e.g. ["hs_name", ...]
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

        if (!res.ok) {
          const statusCode = res.status;

          const bodyText = await res.text().catch(() => "");
          const parsed = bodyText ? safeJsonParse(bodyText) : { ok: true as const, data: null };

          if (isTransientStatus(statusCode) && attempt < retries - 1) {
            const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
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

        const canRetry =
          (isAbortError(err) || message.toLowerCase().includes("fetch")) && attempt < retries - 1;
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

  async getServiceRecords(opts: GetServiceRecordsOpts = {}) {
    const {
      limit = 50,
      after,
      associations = ["companies"],
      properties = [
        "hs_object_id",
        "hs_name",
        "hs_status",
        "hs_start_date",
        "hs_target_end_date",
        "hubspot_owner_id",
      ],
    } = opts;

    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

    // repeated params (because buildUrl's query uses .set which overwrites duplicates)
    const propsQs = properties.map((p) => `properties=${encodeURIComponent(p)}`).join("&");
    const assocQs = associations.map((a) => `associations=${encodeURIComponent(a)}`).join("&");

    const parts: string[] = [
      propsQs,
      assocQs,
      `limit=${encodeURIComponent(String(safeLimit))}`,
    ];
    if (after) parts.push(`after=${encodeURIComponent(after)}`);

    const endpoint = `/crm/v3/objects/0-162?${parts.join("&")}`;
    return this.get(endpoint);
  }

  async getCompanyById(id: string) {
    // same repeated-param approach, avoid spaces in properties list
    const endpoint =
      `/crm/v3/objects/companies/${encodeURIComponent(id)}?` +
      ["hs_object_id", "name", "domain"].map((p) => `properties=${encodeURIComponent(p)}`).join("&");

    return this.get(endpoint);
  }

  async getOwnerById(id: string) {
    return this.get(`/crm/v3/owners/${encodeURIComponent(id)}`);
  }
}
