import { cancel, confirm, intro, isCancel } from '@clack/prompts'
import {
  browserExtraCachePaths,
  executeCacheClean,
  planCacheClean,
} from '@whirlpool/cleanup'
import { loadConfig } from '@whirlpool/config'
import { getDiskSnapshot } from '@whirlpool/disk'
import { formatBytes } from '@whirlpool/format'
import pc from 'picocolors'

import { CLI_NAME } from '../utils/constants.ts'
import {
  outDiskDelta,
  outDiskSnapshot,
  outLine,
  outWarn,
} from '../utils/out.ts'
import { withCacheSizingSpinner } from '../utils/scan-progress.ts'

/** Report planned cache footprint without deleting anything. */
export async function runCacheSize(opts: { browsers: boolean }): Promise<void> {
  const config = loadConfig()
  if (opts.browsers) {
    outWarn(
      '[!] --browsers includes extra browser cache folders under Application Support.',
    )
    outWarn(
      '    Sizes include those paths in the total below. Use only if you accept that scope.',
    )
    outWarn(`    Extra paths: ${browserExtraCachePaths().join(', ')}`)
  }

  const before = await getDiskSnapshot()
  outDiskSnapshot(before)

  const plan = withCacheSizingSpinner((reportSizingTarget) =>
    planCacheClean({
      config,
      includeBrowsers: opts.browsers,
      onSizingTarget: reportSizingTarget,
    }),
  )

  outLine(
    `${pc.bold('Caches (planned targets):')} ${plan.targets.length} path(s), ~${pc.cyan(formatBytes(plan.totalBytes))}.`,
  )
}

export async function runCacheClean(opts: {
  dryRun: boolean
  browsers: boolean
  yes: boolean
}): Promise<void> {
  const config = loadConfig()
  if (opts.browsers) {
    outWarn(
      '[!] --browsers also targets extra browser cache folders under Application Support.',
    )
    outWarn(
      '    Sessions or offline data may be affected. Continue only if you accept that risk.',
    )
    outWarn(`    Extra paths: ${browserExtraCachePaths().join(', ')}`)
  }

  const before = await getDiskSnapshot()
  outDiskSnapshot(before)

  const plan = planCacheClean({
    config,
    includeBrowsers: opts.browsers,
  })

  outLine(
    `${pc.bold('Planned:')} ${plan.targets.length} path(s), ~${pc.cyan(formatBytes(plan.totalBytes))}.`,
  )

  if (!opts.yes && !opts.dryRun) {
    intro(CLI_NAME)
    const ok = await confirm({
      message: 'Delete these cache paths permanently?',
      initialValue: false,
    })
    if (isCancel(ok) || !ok) {
      cancel('Cancelled.')
      process.exit(0)
    }
  }

  const freed = executeCacheClean(plan.targets, opts.dryRun)
  if (opts.dryRun) {
    outLine(
      `${pc.yellow('Dry run:')} would remove ~${pc.cyan(formatBytes(freed))}.`,
    )
  } else {
    outLine(
      `${pc.green('Removed')} ~${pc.cyan(formatBytes(freed))} ${pc.dim('(best effort).')}`,
    )
  }

  const after = await getDiskSnapshot()
  outDiskDelta(before, after)
  outDiskSnapshot(after)
}
