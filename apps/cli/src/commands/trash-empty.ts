import { cancel, confirm, intro, isCancel } from '@clack/prompts'
import {
  emptyTrashMacOS,
  TrashAccessError,
  trashTotalBytes,
} from '@whirlpool/cleanup'
import { getDiskSnapshot } from '@whirlpool/disk'
import { formatBytes } from '@whirlpool/format'
import type { WhirlpoolLogger } from '@whirlpool/logging'
import { openFullDiskAccessSettings } from '@whirlpool/platform'
import pc from 'picocolors'

import { CLI_NAME } from '../utils/constants.ts'
import { outDiskDelta, outDiskSnapshot, outLine } from '../utils/out.ts'

export async function runTrashEmpty(
  log: WhirlpoolLogger,
  yes: boolean,
): Promise<void> {
  const before = await getDiskSnapshot()
  outDiskSnapshot(before)
  let size: number
  try {
    size = trashTotalBytes()
  } catch (e) {
    if (e instanceof TrashAccessError) {
      outLine(pc.red(e.message))
      outLine('')
      outLine(
        pc.yellow(
          'Opening System Settings → Privacy & Security. Choose Full Disk Access, add this host app (e.g. Cursor or Terminal), then rerun the command.',
        ),
      )
      openFullDiskAccessSettings()
      process.exitCode = 1
      return
    }
    throw e
  }
  if (!yes) {
    intro(CLI_NAME)
    const ok = await confirm({
      message: `Empty Trash permanently? (${formatBytes(size)} will be freed.)`,
      initialValue: false,
    })
    if (isCancel(ok) || !ok) {
      cancel('Cancelled.')
      process.exit(0)
    }
  }
  const r = emptyTrashMacOS()
  if (!r.ok) {
    log.error({ stderr: r.stderr }, 'finder_empty_trash_failed')
    process.exit(1)
  }
  const after = await getDiskSnapshot()
  outDiskDelta(before, after)
  outDiskSnapshot(after)
}
