import { Writable } from 'node:stream'

import { context } from '@opentelemetry/api'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'

const PINO_STD_KEYS = new Set([
  'level',
  'time',
  'pid',
  'hostname',
  'name',
  'msg',
  'v',
  'err',
  'trace_id',
  'span_id',
  'trace_flags',
])

/** Pino default level when missing in JSON line. */
const PINO_INFO_LEVEL = 30

function pinoLevelToSeverity(level: number): SeverityNumber {
  if (level >= 60) return SeverityNumber.FATAL
  if (level >= 50) return SeverityNumber.ERROR
  if (level >= 40) return SeverityNumber.WARN
  if (level >= 30) return SeverityNumber.INFO
  if (level >= 20) return SeverityNumber.DEBUG
  return SeverityNumber.TRACE
}

function severityText(level: number): string {
  if (level >= 60) return 'fatal'
  if (level >= 50) return 'error'
  if (level >= 40) return 'warn'
  if (level >= 30) return 'info'
  if (level >= 20) return 'debug'
  return 'trace'
}

/**
 * Writable stream that parses Pino JSON lines and emits OpenTelemetry log records.
 */
export function createOtelForwardStream(loggerScope: string): Writable {
  const otelLogger = logs.getLogger(loggerScope)
  return new Writable({
    write(chunk, _encoding, callback) {
      try {
        const line = JSON.parse(chunk.toString()) as Record<string, unknown>
        const levelNum =
          typeof line.level === 'number' ? line.level : PINO_INFO_LEVEL
        const msg = typeof line.msg === 'string' ? line.msg : ''
        const attributes: Record<string, string | number | boolean> = {}
        for (const [k, v] of Object.entries(line)) {
          if (PINO_STD_KEYS.has(k)) continue
          if (v === undefined || v === null) continue
          if (
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'boolean'
          ) {
            attributes[k] = v
          }
        }
        otelLogger.emit({
          severityNumber: pinoLevelToSeverity(levelNum),
          severityText: severityText(levelNum),
          body: msg,
          attributes,
          context: context.active(),
        })
      } catch {
        // Ignore malformed lines
      }
      callback()
    },
  })
}
