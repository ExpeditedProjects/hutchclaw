import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { HutchClient, HutchApiError, type HutchConfig } from "./client.js";

const DEFAULT_BASE_URL = "https://hutchdb.com";

const configSchema = Type.Object({
  apiKey: Type.String({ description: "Hutch API key (hutch_*)." }),
  baseUrl: Type.Optional(
    Type.String({
      description: "Hutch API base URL. Defaults to the hosted Hutch service.",
      default: DEFAULT_BASE_URL,
    }),
  ),
});

export default definePluginEntry({
  id: "hutch",
  name: "Hutch",
  description: "Store, query, and publish structured data via the Hutch API.",
  configSchema,
  register(api) {
    const rawConfig = api.getConfig() as { apiKey: string; baseUrl?: string };
    const config: HutchConfig = {
      apiKey: rawConfig.apiKey,
      baseUrl: rawConfig.baseUrl ?? DEFAULT_BASE_URL,
    };
    const client = new HutchClient(config);

    const tool = makeToolFactory(api, client);

    // ---- Read ----

    tool({
      name: "list_collections",
      description:
        "List all stored collections. Use when the user asks what data they have saved or wants to see their stored information.",
      parameters: Type.Object({}),
      handler: () => client.listCollections(),
    });

    tool({
      name: "get_collection",
      description:
        "Get details about a specific collection including record count and schema.",
      parameters: Type.Object({
        slug: Type.String({ description: "Collection slug" }),
      }),
      handler: ({ slug }) => client.getCollection(slug),
    });

    tool({
      name: "describe_collection",
      description:
        "Describe a collection's field names, types, and sample values. Use to understand the shape of stored data before querying.",
      parameters: Type.Object({
        slug: Type.String({ description: "Collection slug" }),
      }),
      handler: ({ slug }) => client.describeCollection(slug),
    });

    tool({
      name: "search",
      description:
        "Search across everything stored in Hutch. Use when the user wants to find something but doesn't know which collection it's in.",
      parameters: Type.Object({
        search: Type.String({ description: "What to search for." }),
        limit: Type.Optional(
          Type.Number({ description: "Max results per collection (default 10, max 50)." }),
        ),
      }),
      handler: (params) => client.search(params),
    });

    tool({
      name: "query_records",
      description:
        "Retrieve stored records from a collection with filters, search, sort, and aggregation.",
      parameters: Type.Object({
        slug: Type.String(),
        filter: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        search: Type.Optional(Type.String()),
        search_fields: Type.Optional(Type.Array(Type.String())),
        sort: Type.Optional(Type.String({ description: "Prefix with - for descending." })),
        group_by: Type.Optional(Type.String()),
        aggregate: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        time_bucket: Type.Optional(Type.String()),
        created_after: Type.Optional(Type.String()),
        created_before: Type.Optional(Type.String()),
        limit: Type.Optional(Type.Number()),
        offset: Type.Optional(Type.Number()),
      }),
      handler: ({ slug, ...body }) => client.queryRecords(slug, body),
    });

    // ---- Write ----

    tool({
      name: "store_records",
      description:
        "Save data to Hutch. The collection auto-creates if it doesn't exist. Pass `data` for one record or `records` for many.",
      parameters: Type.Object({
        collection: Type.String({ description: "Collection name." }),
        data: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        records: Type.Optional(Type.Array(Type.Record(Type.String(), Type.Unknown()))),
        on_conflict: Type.Optional(
          Type.Union([
            Type.Literal("replace"),
            Type.Literal("merge"),
            Type.Literal("skip"),
            Type.Literal("error"),
          ]),
        ),
      }),
      handler: (params) => client.storeRecords(params),
    });

    tool({
      name: "update_collection",
      description:
        "Update collection metadata (name, description, unique key, published, submissions).",
      parameters: Type.Object({
        slug: Type.String(),
        name: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        unique_key: Type.Optional(Type.Array(Type.String())),
        published: Type.Optional(Type.Boolean()),
        submissions: Type.Optional(
          Type.Union([Type.Literal("open"), Type.Literal("closed")]),
        ),
      }),
      handler: ({ slug, ...body }) => client.updateCollection(slug, body),
    });

    tool({
      name: "update_record",
      description: "Replace a single record's data by ID.",
      parameters: Type.Object({
        slug: Type.String(),
        record_id: Type.Number(),
        data: Type.Record(Type.String(), Type.Unknown()),
      }),
      handler: ({ slug, record_id, data }) => client.updateRecord(slug, record_id, data),
    });

    tool({
      name: "set_record_status",
      description: "Set the status on a record (active, pending, flagged, archived).",
      parameters: Type.Object({
        slug: Type.String(),
        record_id: Type.Number(),
        status: Type.Union([
          Type.Literal("active"),
          Type.Literal("pending"),
          Type.Literal("flagged"),
          Type.Literal("archived"),
        ]),
      }),
      handler: ({ slug, record_id, status }) =>
        client.setRecordStatus(slug, record_id, status),
    });

    tool({
      name: "infer_schema",
      description:
        "Trigger schema inference on a collection. Analyzes existing records to determine field types.",
      parameters: Type.Object({ slug: Type.String() }),
      handler: ({ slug }) => client.inferSchema(slug),
    });

    tool({
      name: "update_schema",
      description: "Set or modify a single field's type, options, position, or visibility.",
      parameters: Type.Object({
        slug: Type.String(),
        field: Type.String(),
        type: Type.Optional(
          Type.Union([
            Type.Literal("text"),
            Type.Literal("number"),
            Type.Literal("boolean"),
            Type.Literal("date"),
            Type.Literal("url"),
            Type.Literal("email"),
            Type.Literal("image_url"),
            Type.Literal("select"),
            Type.Literal("multiselect"),
            Type.Literal("json"),
          ]),
        ),
        options: Type.Optional(Type.Array(Type.String())),
        position: Type.Optional(Type.Number()),
        hidden: Type.Optional(Type.Boolean()),
      }),
      handler: ({ slug, ...body }) => client.updateSchema(slug, body),
    });

    tool({
      name: "create_view",
      description: "Create a named view on a collection (table, kanban, calendar, gallery).",
      parameters: Type.Object({
        slug: Type.String(),
        name: Type.String(),
        type: Type.Optional(
          Type.Union([
            Type.Literal("table"),
            Type.Literal("kanban"),
            Type.Literal("calendar"),
            Type.Literal("gallery"),
          ]),
        ),
        config: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        filter: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        sort: Type.Optional(Type.String()),
        columns: Type.Optional(Type.Array(Type.String())),
      }),
      handler: ({ slug, ...body }) => client.createView(slug, body),
    });

    // ---- Destructive (optional, opt-in) ----

    tool(
      {
        name: "delete_collection",
        description:
          "Permanently delete a collection and all its records. Destructive.",
        parameters: Type.Object({ slug: Type.String() }),
        handler: ({ slug }) => client.deleteCollection(slug),
      },
      { optional: true },
    );

    tool(
      {
        name: "delete_record",
        description: "Soft-delete a single record by ID.",
        parameters: Type.Object({
          slug: Type.String(),
          record_id: Type.Number(),
        }),
        handler: ({ slug, record_id }) => client.deleteRecord(slug, record_id),
      },
      { optional: true },
    );

    tool(
      {
        name: "transform_records",
        description:
          "Bulk update records: rename fields, remove fields, or set a field value (optionally filtered).",
        parameters: Type.Object({
          slug: Type.String(),
          rename_fields: Type.Optional(Type.Record(Type.String(), Type.String())),
          remove_fields: Type.Optional(Type.Array(Type.String())),
          set_field: Type.Optional(
            Type.Object({
              field: Type.String(),
              value: Type.Unknown(),
              filter: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
            }),
          ),
        }),
        handler: ({ slug, ...body }) => client.transformRecords(slug, body),
      },
      { optional: true },
    );
  },
});

interface ToolDef<P> {
  name: string;
  description: string;
  parameters: P;
  handler: (params: any) => Promise<unknown> | unknown;
}

function makeToolFactory(
  api: { registerTool: (def: unknown, opts?: unknown) => void },
  _client: HutchClient,
) {
  return function tool<P>(def: ToolDef<P>, opts?: { optional?: boolean }) {
    api.registerTool(
      {
        name: def.name,
        description: def.description,
        parameters: def.parameters,
        async execute(_id: string, params: unknown) {
          try {
            const result = await def.handler(params);
            return {
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (err) {
            const message =
              err instanceof HutchApiError
                ? `${err.status}: ${err.message}`
                : err instanceof Error
                  ? err.message
                  : String(err);
            return {
              content: [{ type: "text", text: message }],
              isError: true,
            };
          }
        },
      },
      opts,
    );
  };
}
