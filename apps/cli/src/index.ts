#!/usr/bin/env bun
import { createLogger, initTelemetry } from '@whirlpool/logging'
import { assertMacOS } from '@whirlpool/platform'

import { createCli } from './cli.ts'
import { normalizePrdSubcommands } from './utils/normalize-argv.ts'

function main(): void {
  assertMacOS()

  const telemetry = initTelemetry({ serviceName: 'whirlpool-cli' })
  const log = createLogger('whirlpool-cli', {
    forwardToOtel: telemetry !== null,
  })
  process.once('beforeExit', () => {
    void telemetry?.shutdown()
  })

  const raw = process.argv.slice(2)
  const normalized = normalizePrdSubcommands(raw)
  process.argv = [process.argv[0]!, process.argv[1]!, ...normalized]

  log.info({ argv: normalized }, 'cli_start')

  const cli = createCli(log)
  cli.parse()
}

main()
