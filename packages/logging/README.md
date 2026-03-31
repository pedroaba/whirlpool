# @whirlpool/logging

**Structured logging** with [Pino](https://getpino.io) plus optional **OpenTelemetry** (Node SDK, OTLP trace and log exporters). Used by the CLI for `command_begin`-style events and forward-compatible telemetry when env vars point at an OTLP endpoint.

## Main exports

- `createLogger` / `WhirlpoolLogger` — Pino instance, optional OTLP log fan-out
- `initTelemetry`, `shutdownTelemetry`, `isTelemetryWantedByEnv` — SDK lifecycle
- See `src/index.ts` header comment for `OTEL_*`, `LOG_LEVEL`, `WHIRLPOOL_OTEL_ENABLED`, etc.

## Dependencies

OpenTelemetry API + SDK packages and Pino (see `package.json`).

## Scripts

`build`, `lint`, `check-types`.
