/**
 * Structured logging (Pino) + OpenTelemetry traces and OTLP log export.
 *
 * Environment (common):
 * - OTEL_EXPORTER_OTLP_ENDPOINT — base URL (default path segments added)
 * - OTEL_EXPORTER_OTLP_TRACES_ENDPOINT / OTEL_EXPORTER_OTLP_LOGS_ENDPOINT — overrides
 * - OTEL_SERVICE_NAME — resource service.name
 * - WHIRLPOOL_OTEL_ENABLED=1 — enable export without OTEL_EXPORTER_OTLP_ENDPOINT
 * - OTEL_SDK_DISABLED=true — disable SDK entirely
 * - LOG_LEVEL — pino level (trace…fatal)
 * - LOG_OTEL_DIAG=1 — enable OpenTelemetry diag console logger
 */

export {
  createLogger,
  type CreateLoggerOptions,
  type WhirlpoolLogger,
} from './logger.ts'
export {
  initTelemetry,
  isTelemetryWantedByEnv,
  shutdownTelemetry,
  type InitTelemetryOptions,
  type TelemetryHandle,
} from './telemetry.ts'
