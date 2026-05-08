export interface HutchConfig {
  apiKey: string;
  baseUrl: string;
}

export class HutchClient {
  constructor(private readonly config: HutchConfig) {}

  private url(path: string): string {
    const base = this.config.baseUrl.replace(/\/$/, "");
    return `${base}${path}`;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(this.url(path), {
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
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

export class HutchApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "HutchApiError";
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
