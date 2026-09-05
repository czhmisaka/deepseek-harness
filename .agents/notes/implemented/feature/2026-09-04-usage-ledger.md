# Agent Note: Durable cross-session token usage ledger

Status: implemented

English | [中文](2026-09-04-usage-ledger.zh.md)

## Problem

The harness had no durable answer to "how many tokens has DSH used in total". Every piece existed except the accounting: adapters normalize usage into `TokenUsage`, the durable log carries it on each `assistant/message` event, and `dsh-token-meter` folds it per session into a `tokenUsage` projection. But projections are per-session folds — nothing accumulated across sessions, and every answer to "what has this deployment spent in total" required hand-rolling a scan over all session logs. The web stats strip counts output tokens per session only, and no visual surface existed for deployment-wide accounting.

## Decision

`packages/llm/usage-ledger` is a service-class plugin, mounted in `dsh-base`, that keeps one append-only JSONL ledger file per harness home (default `dshHomePath('usage', 'usage.jsonl')`). It subscribes to the `session/event` firehose at plugin scope, so every live session the process observes — main, subagent, workflow — contributes. Each `assistant/message` with adapter-reported usage becomes one version-stamped record; route attribution reads the assembled message's `source.provider`/`source.model` directly, so no request-header folding state exists. Interrupted messages count because a delivered prefix is billed.

Real-time means the append chain starts when the event commits: the firehose listener is synchronous record shaping, and the write rides a serialized promise chain (order preserved, write failures logged and contained). The service subscribes to the awaited `session/flush` durability checkpoint and drains there, so the ledger loses exactly the records a crash also loses from the session log — the two durable surfaces stay consistent by construction. Disposal drains before closing the handle.

Totals are derived, never checkpointed: `totals()` stats the file and refolds when size or mtime moved past the cached fold, which is what makes cross-process sharing of one harness home correct without any coordination — another profile's appends change the file identity and the next fold sees them. The bucket total is `input + cacheRead + cacheWrite + output`, the same billed-total convention `dsh-token-meter` folds with, so the two accounting surfaces agree by construction. The same fold derives per-session buckets keyed by the record's session id — sorted largest first, each with its newest record time — so the per-session breakdown is one more view of the same records, not separate state.

The `/usage` command is the command-capable consumer: registered through `ctx.inject(['commands'], ...)` (plan-mode's child pattern), it renders all-time figures, today's UTC figures, the top five routes, and the top five sessions with their latest activity day. Records deliberately carry no message content — the ledger is an accounting surface, not a transcript, so it needs no redaction rules.

The web dashboard (`packages/client/ui-usage`) is the visual surface: a `settings.section` entry rendering the totals grid, today's figures, a usage-over-time area chart over calendar-aligned UTC days with a 7/30-day range toggle, the route table, and the session table (id-prefix labels, full id on hover) from a new `usage` Typert Remote namespace (`ctx.remote.usage.totals()`), mounted through the `api-remotes` assembly. The section fetches on mount and on Refresh rather than subscribing live: the ledger moves on every model call, and a live counter would re-render the panel on unrelated traffic. Compact number forms are shared verbatim between the command text and the dashboard so both surfaces read alike.

## Alternatives considered

**A per-session projection summed across sessions.** Rejected: projections fold live sessions and their cache serves the session listing column; all-time totals would require scanning every session's log or projection row, and cold sessions would drop out of any in-memory sum. A global firehose listener appends exactly one record per billed event with no per-session state at all.

**A session-telemetry backend.** Rejected: the telemetry seam is for outbound reporting with sharing disclosure and redaction, and deployments mount exactly one backend; a local accounting file is neither outbound nor shareable, and forcing it through that seam would couple a default-on feature to the telemetry posture.

**SQLite through the storage stack.** Rejected for v1: the ledger is append-only and read by full fold; a single JSONL file keeps the format inspectable, append-safe across processes (`O_APPEND` line atomicity), and free of schema machinery no consumer needs yet.

**Backfilling from existing session logs at boot.** Deferred: resume replays seeds without firehose emission, so a one-time scan could recover pre-ledger usage, but it would fold every historical log on first boot and mix installed-before/after accounting. The ledger starts at its installation point; the durable file carries everything since.

**A live-updating dashboard counter.** Deferred: the ledger changes on every model call, so a live panel would re-render on unrelated traffic across every open client. Mount-and-Refresh matches the data's cadence; a push channel is a follow-up if a consumer asks.

## Consequences

- Every base-backed profile records by default; `path` redirects the file, and a patch row with `disabled: true` opts a deployment out entirely.
- `/usage` appears in every command-capable surface (CLI chat, Web client), and the **Usage** settings page appears in the web client's settings panel, once mounted; compositions without a command registry keep the ledger without the command.
- The JSONL file is a user-readable fact: one JSON object per line, version-stamped, no compression, no rotation — deployment size grows with usage, and the fold is O(records).
- A crashed writer can tear its last line; the fold skips exactly that line on the next boot.
- Client packages under `packages/client` name their test files' face with the `.client.` suffix; a plain-named spec pulls the client `api-remotes` face into the Host aggregate and fails the build there (this landed with the dashboard's specs).
