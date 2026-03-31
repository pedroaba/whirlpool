import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
} from '@clack/prompts'
import { movePathsToTrashMacOS } from '@whirlpool/cleanup'
import { getDiskSnapshot } from '@whirlpool/disk'
import { scanRemnantsForBundleIds } from '@whirlpool/explore'
import { formatBytes } from '@whirlpool/format'
import { resolveScanTarget } from '@whirlpool/system-apps'
import pc from 'picocolors'

import { CLI_NAME } from '../utils/constants.ts'
import {
  orphanTrashMultiselectOption,
  sortCandidatesForPicker,
} from '../utils/orphans-prompt-labels.ts'
import { outDiskDelta, outDiskSnapshot, outErr, outLine } from '../utils/out.ts'
import { withScanSpinner } from '../utils/scan-progress.ts'

export async function runOrphansClean(opts: {
  dryRun: boolean
  target: string
}): Promise<void> {
  const raw = opts.target.trim()
  if (!raw) {
    outErr('Usage: whirlpool orphans-clean <app name or bundle id>')
    process.exitCode = 1
    return
  }

  const before = await getDiskSnapshot()
  outDiskSnapshot(before)

  const resolved = resolveScanTarget(raw)
  if (!resolved) {
    outErr(
      `No installed app matched "${raw}". Try the exact bundle id (e.g. com.vendor.app) if the app was uninstalled.`,
    )
    process.exitCode = 1
    return
  }

  outLine(`${pc.bold('Target:')} ${pc.cyan(resolved.matchedLabel)}`)
  const scanned = withScanSpinner(
    (cb) => scanRemnantsForBundleIds(new Set(resolved.bundleIds), cb),
    `Scanning remnants: ${resolved.matchedLabel}…`,
  )

  const sizeByPath = new Map<string, number>()
  for (const c of scanned) sizeByPath.set(c.path, c.sizeBytes)

  if (scanned.length === 0) {
    outLine(pc.dim('No candidates found for this selection.'))
    return
  }

  intro(CLI_NAME)
  const ordered = sortCandidatesForPicker(scanned)
  const choice = await multiselect({
    message:
      'Select items to move to Trash (Space to toggle, Enter when done). Restorable in Finder.',
    options: ordered.map((c) => orphanTrashMultiselectOption(c)),
    required: false,
    maxItems: 14,
  })
  if (isCancel(choice)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
  const selected = choice as string[]
  if (selected.length === 0) {
    outro('Nothing selected.')
    return
  }
  const ok = await confirm({
    message: `Move ${selected.length} item(s) to Trash?`,
    initialValue: true,
  })
  if (isCancel(ok) || !ok) {
    cancel('Cancelled.')
    process.exit(0)
  }

  const totalSel = selected.reduce((a, p) => a + (sizeByPath.get(p) ?? 0), 0)

  if (opts.dryRun) {
    outLine(
      `${pc.yellow('Dry run:')} would move ${pc.bold(String(selected.length))} path(s), ~${pc.cyan(formatBytes(totalSel))} to Trash.`,
    )
    const after = await getDiskSnapshot()
    outDiskSnapshot(after)
    return
  }

  const trashResult = movePathsToTrashMacOS(selected)

  outLine(
    `\n${pc.green('Items moved to Trash.')} ${pc.dim('You can restore them from Finder.')}\n(${trashResult.ok.length} ok, ${trashResult.failed.length} failed)`,
  )
  if (trashResult.failed.length) {
    outErr(`Failed paths: ${trashResult.failed.join(', ')}`)
  }

  const after = await getDiskSnapshot()
  outDiskDelta(before, after)
  outDiskSnapshot(after)
}
