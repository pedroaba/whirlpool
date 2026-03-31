import { scanRemnantsForBundleIds } from '@whirlpool/explore'
import { resolveScanTarget } from '@whirlpool/system-apps'
import pc from 'picocolors'

import {
  outDiskSnapshot,
  outErr,
  outLine,
  outMuted,
  printDiskBannerColored,
} from '../utils/out.ts'
import { printOrphansAppTable } from '../utils/scan-candidates-table.ts'
import { printScanDoneLine, withScanSpinner } from '../utils/scan-progress.ts'

export async function runScan(
  json: boolean,
  dryRun: boolean,
  target: string,
): Promise<void> {
  const before = await printDiskBannerColored('Disk status')
  if (dryRun) {
    outMuted(
      'Note: scan is read-only; --dry-run only affects destructive commands.',
    )
  }

  const raw = target.trim()
  if (!raw) {
    outErr('Usage: whirlpool scan <app name or bundle id>')
    process.exitCode = 1
    return
  }

  const resolved = resolveScanTarget(raw)
  if (!resolved) {
    outErr(
      `No installed app matched "${raw}". Try the exact bundle id (e.g. com.vendor.app) if the app was uninstalled.`,
    )
    process.exitCode = 1
    return
  }

  const idSet = new Set(resolved.bundleIds)
  const candidates = withScanSpinner(
    (cb) => scanRemnantsForBundleIds(idSet, cb),
    `Scanning remnants: ${resolved.matchedLabel}…`,
  )
  const totalBytes = candidates.reduce((a, c) => a + c.sizeBytes, 0)

  if (json) {
    outLine(
      JSON.stringify(
        {
          mode: 'targeted',
          matchedLabel: resolved.matchedLabel,
          bundleIds: resolved.bundleIds,
          disk: before,
          candidates,
          summary: { count: candidates.length, totalBytes },
        },
        null,
        2,
      ),
    )
    return
  }

  outLine('')
  outLine(`${pc.bold('Target:')} ${pc.cyan(resolved.matchedLabel)}`)
  printScanDoneLine(candidates.length, totalBytes)
  printOrphansAppTable(
    candidates,
    'Per-app summary (Library remnants for this target):',
  )
  outDiskSnapshot(before)
}
