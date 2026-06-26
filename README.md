<p align="center">
  <img src="assets/h-icon.png" alt="Hutch" width="96" height="96" />
</p>

<h1 align="center">HutchClaw</h1>

<p align="center">
  <em>Hutch tools for OpenClaw — store, query, and publish structured data from agents.</em>
</p>

<p align="center">
  <a href="https://hutchdb.com">hutchdb.com</a> ·
  <a href="https://docs.openclaw.ai">OpenClaw docs</a> ·
  <a href="https://github.com/ExpeditedProjects/hutchclaw/issues">Issues</a>
</p>

---

## What it does

Gives an OpenClaw agent a structured-data backend. Your agent can:

- Save anything as a record — bookmarks, notes, leads, research — with no schema setup.
- Query later by exact filter, full-text search, sort, group, or aggregate.
- Inspect, evolve, and publish what's stored, all from inside a conversation.

Collections auto-create on first write. Records are arbitrary JSON, queryable
via Postgres JSONB containment + full-text search. Hutch handles the rest.

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

Get an API key at [hutchdb.com](https://hutchdb.com). For self-hosted
deployments, set `baseUrl` to your own URL.

## Tools

### Always available

| Tool                  | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `hutch_list_collections`    | List all collections.                                  |
| `hutch_get_collection`      | Get collection details and record count.               |
| `hutch_describe_collection` | Field types, sample values, schema.                    |
| `hutch_store_records`       | Save one or many records (auto-creates collection).    |
| `hutch_query_records`       | Filter, search, sort, aggregate, time-bucket.          |
| `hutch_search`              | Full-text search across all collections.               |
| `hutch_update_collection`   | Edit name, description, unique key, published flag.    |
| `hutch_update_record`       | Replace a record's data.                               |
| `hutch_set_record_status`   | Mark active / pending / flagged / archived.            |
| `hutch_infer_schema`        | Auto-detect field types from existing records.         |
| `hutch_update_schema`       | Set field type, options, position, visibility.         |
| `hutch_create_view`         | Create a named view (table / kanban / calendar / etc). |

### Destructive (opt-in)

These require allowlisting via `tools.allow` — they bypass undo:

| Tool                | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `hutch_delete_collection` | Permanently delete a collection and all records.    |
| `hutch_delete_record`     | Soft-delete a single record.                        |
| `hutch_transform_records` | Bulk rename / remove / set fields across records.   |

## Publishing to ClawHub

```bash
clawhub package publish . --family code-plugin --dry-run
clawhub package publish . --family code-plugin
```

## License

MIT — see [LICENSE](./LICENSE).
