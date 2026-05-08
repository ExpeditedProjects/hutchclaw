export interface HutchConfig {
  apiKey: string;
  baseUrl: string;
}

export class HutchApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "HutchApiError";
  }
}

const PRIVATE_HOST_RE =
  /^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fe80:|fc00:|fd[0-9a-f]{2}:)/i;

function assertSafeBaseUrl(raw: string): URL {
  const url = new URL(raw);
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol === "http:" && !isLoopback) {
    throw new Error(`HutchClient: baseUrl must be https (got ${url.protocol}//${url.hostname})`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`HutchClient: baseUrl protocol must be http(s) (got ${url.protocol})`);
  }
  if (!isLoopback && PRIVATE_HOST_RE.test(url.hostname)) {
    throw new Error(`HutchClient: baseUrl points at a private/link-local host (${url.hostname})`);
  }
  return url;
}

export class HutchClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: HutchConfig) {
    const url = assertSafeBaseUrl(config.baseUrl);
    this.baseUrl = url.toString().replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const parsed = text ? safeJson(text) : null;

    if (!res.ok) {
      const message =
        (parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : text) || `${res.status} ${res.statusText}`;
      throw new HutchApiError(message, res.status);
    }

    return parsed as T;
  }

  listCollections() {
    return this.request("GET", "/api/v1/collections");
  }

  getCollection(slug: string) {
    return this.request("GET", `/api/v1/collections/${encodeURIComponent(slug)}`);
  }

  describeCollection(slug: string) {
    return this.request("GET", `/api/v1/collections/${encodeURIComponent(slug)}/describe`);
  }

  storeRecords(body: {
    collection: string;
    data?: Record<string, unknown>;
    records?: Record<string, unknown>[];
    on_conflict?: "replace" | "merge" | "skip" | "error";
  }) {
    return this.request("POST", "/api/v1/records", body);
  }

  queryRecords(
    slug: string,
    body: Record<string, unknown>,
  ) {
    return this.request("POST", `/api/v1/collections/${encodeURIComponent(slug)}/query`, body);
  }

  search(body: { search: string; limit?: number }) {
    return this.request("POST", "/api/v1/search", body);
  }

  updateCollection(slug: string, body: Record<string, unknown>) {
    return this.request("PATCH", `/api/v1/collections/${encodeURIComponent(slug)}`, body);
  }

  deleteCollection(slug: string) {
    return this.request("DELETE", `/api/v1/collections/${encodeURIComponent(slug)}`);
  }

  updateRecord(slug: string, recordId: number, data: Record<string, unknown>) {
    return this.request(
      "PATCH",
      `/api/v1/collections/${encodeURIComponent(slug)}/records/${recordId}`,
      { data },
    );
  }

  deleteRecord(slug: string, recordId: number) {
    return this.request(
      "DELETE",
      `/api/v1/collections/${encodeURIComponent(slug)}/records/${recordId}`,
    );
  }

  transformRecords(slug: string, body: Record<string, unknown>) {
    return this.request(
      "POST",
      `/api/v1/collections/${encodeURIComponent(slug)}/transform`,
      body,
    );
  }

  inferSchema(slug: string) {
    return this.request(
      "POST",
      `/api/v1/collections/${encodeURIComponent(slug)}/schema/infer`,
    );
  }

  updateSchema(slug: string, body: Record<string, unknown>) {
    return this.request(
      "PATCH",
      `/api/v1/collections/${encodeURIComponent(slug)}/schema`,
      body,
    );
  }

  setRecordStatus(slug: string, recordId: number, status: string) {
    return this.request(
      "PATCH",
      `/api/v1/collections/${encodeURIComponent(slug)}/records/${recordId}`,
      { status },
    );
  }

  createView(slug: string, body: Record<string, unknown>) {
    return this.request(
      "POST",
      `/api/v1/collections/${encodeURIComponent(slug)}/views`,
      body,
    );
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
