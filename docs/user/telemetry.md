# Product usage data and diagnostics

This self-use build sends no product usage events by default: it ships with no ingest endpoint
or key, telemetry defaults to off, relay connection traces are off unless explicitly enabled,
and agent activity is never published to the T3 Connect relay. The sections below describe what
happens only if you explicitly configure your own telemetry endpoint and enable it. Prompts,
responses, file contents, and credentials are never included (unless you explicitly approve an
[agent feedback](#agent-feedback) card with conversation text attached).

## Product usage events

With telemetry explicitly configured (`T3CODE_TELEMETRY_HOST`, `T3CODE_TELEMETRY_KEY`, and
`T3CODE_TELEMETRY_ENABLED=true`), the server sends usage events to that endpoint under a hashed
random install ID (plus a hashed T3 Connect account ID when signed in, and random client device
IDs). Events contain provider, catalog model name (non-catalog models report as custom),
reasoning effort, permission mode, turn/request outcome, duration, release channel, and token
counts.

## Disable telemetry

Telemetry is already off by default in this build. The standard opt-outs still apply if you
enabled it:

- **Server / CLI**: Set `T3CODE_TELEMETRY_ENABLED=false` or `DO_NOT_TRACK=1` before starting (`DO_NOT_TRACK=1` takes precedence).
- **Desktop app**: Export `T3CODE_TELEMETRY_ENABLED=false` or `DO_NOT_TRACK=1` in your shell profile (macOS/Linux) or user environment variables (Windows) and restart.
- **Managed policy**: Administrators can set `"telemetry": false` in [managed policy](./managed-policy.md#other-capabilities) for servers and desktop apps.
- **Mobile app**: Toggle **Send crash reports** and **Send connection traces** separately in **Settings → About T3 Code → Diagnostics**.

## Relay connection diagnostics

Relay connection traces are off by default in this build. If explicitly enabled, T3 Connect sends
connection timings, request paths, environment/thread IDs, and error types (no addresses, logs,
or stack frames) to Axiom. Disabled by the server telemetry opt-outs above or by
`T3CODE_OTEL_SDK_DISABLED` / `OTEL_SDK_DISABLED`.

## Agent feedback

Optional tool for agents to report T3 Code bugs or missing capabilities. Configure in **Settings → Labs → Agent feedback**:

- **Off** (default): Feedback tools and `t3 feedback` are disabled.
- **When I ask**: Agents submit a report only when you ask, shown as an interactive approval card before anything leaves your machine.
- **Automatic**: Also sends minimal automated reports (problem kind + tool/command name only—no text or conversation) when an agent hits a T3 tool failure; enables `t3 feedback` CLI reporting (up to 10/hour).

Approval cards show exact payloads (expected/actual/workaround, turn outline with no text, and optional **Include the conversation** up to 16 KB). File paths, usernames, hostnames, git remotes, and secret-like strings are scrubbed before saving, and reports use one-off random IDs. Inspect local reports with `t3 feedback list [--json]`. In this build, while telemetry is off, saved reports stay on your machine and are not sent.

## Agent activity for mobile notifications

Agent activity publishing is disabled in this self-use build: project/thread titles, model names,
and turn status are never sent to the T3 Connect relay, whatever the **Publish agent activity**
setting says.

## Export diagnostics to your own OpenTelemetry receiver

Open **Settings → Maintenance → Diagnostics** (per environment) and enter OTLP HTTP endpoints (e.g. `http://localhost:4318/v1/traces`), save, and restart the server. Use **Test** to verify connectivity.

`T3CODE_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` env vars override saved settings (use `T3CODE_OTLP_HEADERS` / `T3CODE_OTLP_PROTOCOL=http/protobuf` or the standard `OTEL_EXPORTER_OTLP_*` equivalents for auth and protobuf).
