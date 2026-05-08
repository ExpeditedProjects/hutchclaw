# hutchclaw

OpenClaw plugin for [Hutch](https://hutchdb.com) — store, query, and publish
structured data from agents via the Hutch REST API.

## Install

```bash
clawhub install hutchclaw
# or
npm install hutchclaw
```

## Configure

```jsonc
{
  "plugins": {
    "entries": {
      "hutch": {
        "apiKey": "hutch_..."
        // baseUrl defaults to https://hutchdb.com — override for self-hosted.
      }
    },
    "tools": {
      // Opt in to destructive tools:
      "allow": ["delete_collection", "delete_record", "transform_records"]
    }
  }
}
```

`apiKey` is a Hutch API key (`hutch_*` prefix). `baseUrl` defaults to
`https://hutchdb.com`; set it to your own URL for self-hosted deployments.

## Tools

Always available:

| Tool                  | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `list_collections`    | List all collections.                                  |
| `get_collection`      | Get collection details and record count.               |
| `describe_collection` | Field types, sample values, schema.                    |
| `store_records`       | Save one or many records (auto-creates collection).    |
| `query_records`       | Filter, search, sort, aggregate, time-bucket.          |
| `search`              | Full-text search across all collections.               |
| `update_collection`   | Edit name, description, unique key, published flag.    |
| `update_record`       | Replace a record's data.                               |
| `set_record_status`   | Mark active / pending / flagged / archived.            |
| `infer_schema`        | Auto-detect field types from existing records.         |
| `update_schema`       | Set field type, options, position, visibility.         |
| `create_view`         | Create a named view (table / kanban / calendar / etc). |

Destructive (require allowlisting via `tools.allow`):

| Tool                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `delete_collection`  | Permanently delete a collection and all records.     |
| `delete_record`      | Soft-delete a single record.                         |
| `transform_records`  | Bulk rename / remove / set fields across records.    |

## Publishing

```bash
clawhub package publish . --family code-plugin --dry-run
clawhub package publish . --family code-plugin
```
