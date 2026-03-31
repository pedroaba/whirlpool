import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

export type TelemetryHandle = {
  shutdown: () => Promise<void>
}

export type InitTelemetryOptions = {
  serviceName?: string
  /**
   * When false, skips starting the SDK. When true (default), starts only if
   * OTLP is configured (see isTelemetryWantedByEnv).
   */
  enabled?: boolean
  /**
   * Start exporters even when no OTLP env is set (uses http://localhost:4318).
   */
  useDefaultOtlpEndpoint?: boolean
}

function otlpBaseUrl(): string {
  const raw = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, '')
  return raw ?? 'http://localhost:4318'
}

function traceExporterUrl(): string {
  return (
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    `${otlpBaseUrl()}/v1/traces`
  )
}

function logsExporterUrl(): string {
  return (
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ?? `${otlpBaseUrl()}/v1/logs`
  )
}

export function isTelemetryWantedByEnv(
  useDefaultOtlpEndpoint?: boolean,
): boolean {
  if (process.env.OTEL_SDK_DISABLED === 'true') return false
  if (useDefaultOtlpEndpoint) return true
  if (process.env.WHIRLPOOL_OTEL_ENABLED === '1') return true
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return true
  if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) return true
  if (process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) return true
  return false
}

let activeSdk: NodeSDK | null = null

/**
 * Starts the OpenTelemetry Node SDK (traces + logs OTLP HTTP).
 * No-op when disabled or when no OTLP configuration is present.
 */
export function initTelemetry(
  options: InitTelemetryOptions = {},
): TelemetryHandle | null {
  if (options.enabled === false) return null

  if (process.env.LOG_OTEL_DIAG === '1') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
  }

  if (!isTelemetryWantedByEnv(options.useDefaultOtlpEndpoint)) {
    return null
  }

  const serviceName =
    options.serviceName ?? process.env.OTEL_SERVICE_NAME ?? 'whirlpool'

  const traceExporter = new OTLPTraceExporter({
    url: traceExporterUrl(),
  })
  const logExporter = new OTLPLogExporter({
    url: logsExporterUrl(),
  })

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter,
    logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
  })

  sdk.start()
  activeSdk = sdk

  return {
    async shutdown() {
      if (!activeSdk) return
      await activeSdk.shutdown()
      activeSdk = null
    },
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (!activeSdk) return
  await activeSdk.shutdown()
  activeSdk = null
}
