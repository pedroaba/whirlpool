import { context, trace } from '@opentelemetry/api'
import pino from 'pino'

import { createOtelForwardStream } from './otel-forward-stream.ts'
import { isTelemetryWantedByEnv } from './telemetry.ts'

export type CreateLoggerOptions = {
  /** Overrides LOG_LEVEL / default `info`. */
  level?: string
  /**
   * Forward duplicate log lines to OpenTelemetry (OTLP logs).
   * Default: true when telemetry env indicates OTLP export.
   */
  forwardToOtel?: boolean
  useDefaultOtlpEndpoint?: boolean
}

/**
 * Creates a Pino logger with optional OpenTelemetry log forwarding and trace/span
 * fields on each record when a span is active.
 */
export function createLogger(
  name: string,
  options: CreateLoggerOptions = {},
): pino.Logger {
  const level = options.level ?? process.env.LOG_LEVEL ?? 'info'

  const forward =
    options.forwardToOtel ??
    isTelemetryWantedByEnv(options.useDefaultOtlpEndpoint)

  const streams: pino.StreamEntry[] = [
    { level: 'trace', stream: process.stderr },
  ]

  if (forward) {
    streams.push({
      level: 'trace',
      stream: createOtelForwardStream(name),
    })
  }

  return pino(
    {
      name,
      level,
      mixin() {
        const span = trace.getSpan(context.active())
        if (!span) return {}
        const sc = span.spanContext()
        if (!sc.traceId) return {}
        return {
          trace_id: sc.traceId,
          span_id: sc.spanId,
          trace_flags: `0${sc.traceFlags.toString(16)}`,
        }
      },
    },
    pino.multistream(streams),
  )
}

export type WhirlpoolLogger = ReturnType<typeof createLogger>
