import { listTrashEntries, TrashAccessError } from '@whirlpool/cleanup'
import { getDiskSnapshot } from '@whirlpool/disk'
import { formatBytes } from '@whirlpool/format'
import { inferLikelyApp, readMdls, readStatMeta } from '@whirlpool/fs-meta'
import { openFullDiskAccessSettings } from '@whirlpool/platform'
import pc from 'picocolors'

import {
  outDiskSnapshot,
  outLine,
  printDiskBannerColored,
} from '../utils/out.ts'

export async function runTrashList(): Promise<void> {
  await printDiskBannerColored('Disk status')
  let entries
  try {
    entries = listTrashEntries()
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
      outDiskSnapshot(await getDiskSnapshot())
      process.exitCode = 1
      return
    }
    throw e
  }
  if (entries.length === 0) {
    outLine(pc.dim('Trash is empty.'))
    outDiskSnapshot(await getDiskSnapshot())
    return
  }
  for (const e of entries) {
    const st = readStatMeta(e.path)
    const md = readMdls(e.path)
    const guess = inferLikelyApp(md, e.name)
    const mtime = st?.mtimeMs ? new Date(st.mtimeMs).toISOString() : '—'
    const birth = st?.birthtimeMs ? new Date(st.birthtimeMs).toISOString() : '—'
    outLine(pc.dim('—'))
    outLine(
      `${pc.bold(e.name)} ${pc.dim('(')}${pc.green(formatBytes(e.sizeBytes))}${pc.dim(')')}`,
    )
    outLine(`  ${pc.dim('path:')} ${e.path}`)
    outLine(`  ${pc.dim('inferred:')} ${pc.cyan(guess)}`)
    if (st) {
      outLine(`  ${pc.dim(`uid/gid: ${st.uid}/${st.gid} mode: ${st.mode}`)}`)
      outLine(`  ${pc.dim(`created: ${birth} modified: ${mtime}`)}`)
    }
  }
  const totalBytes = entries.reduce((a, e) => a + e.sizeBytes, 0)
  outLine(
    `\n${pc.bold('Total in Trash:')} ${pc.green(formatBytes(totalBytes))}`,
  )
  outDiskSnapshot(await getDiskSnapshot())
}
