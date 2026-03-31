import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { getPathByteSize } from '@whirlpool/fs-meta'

export function trashDir(): string {
  return join(homedir(), '.Trash')
}

/**
 * Move paths to the user's Trash using Finder (native macOS behavior).
 */
export function movePathsToTrashMacOS(paths: string[]): {
  ok: string[]
  failed: string[]
} {
  const ok: string[] = []
  const failed: string[] = []
  if (paths.length === 0) return { ok, failed }

  const posixList = paths
    .map((p) => p.replace(/"/g, '\\"'))
    .map((p) => `POSIX file "${p}"`)
    .join(', ')

  const script = `
tell application "Finder"
  delete { ${posixList} }
end tell
`.trim()

  const r = spawnSync('/usr/bin/osascript', ['-e', script], {
    encoding: 'utf8',
  })
  if (r.status === 0) {
    ok.push(...paths)
  } else {
    failed.push(...paths)
  }
  return { ok, failed }
}

export function emptyTrashMacOS(): { ok: boolean; stderr: string } {
  const r = spawnSync(
    '/usr/bin/osascript',
    ['-e', 'tell application "Finder" to empty trash'],
    { encoding: 'utf8' },
  )
  return { ok: r.status === 0, stderr: r.stderr ?? '' }
}

export type TrashEntry = {
  name: string
  path: string
  sizeBytes: number
  isDirectory: boolean
}

/** Thrown when ~/.Trash cannot be read (macOS privacy / Full Disk Access). */
export class TrashAccessError extends Error {
  readonly errnoCode: string

  constructor(errnoCode: string, dir: string) {
    super(
      `Cannot read Trash (${dir}): ${errnoCode}. On macOS, enable Full Disk Access for Terminal, iTerm, or Cursor (whichever runs this CLI) in System Settings → Privacy & Security → Full Disk Access, then try again.`,
    )
    this.name = 'TrashAccessError'
    this.errnoCode = errnoCode
  }
}

function readdirTrashOrThrow(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'EPERM' || err.code === 'EACCES') {
      throw new TrashAccessError(err.code ?? 'EPERM', dir)
    }
    throw e
  }
}

export function listTrashEntries(): TrashEntry[] {
  const dir = trashDir()
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true })
    } catch {
      /* ignore */
    }
    return []
  }
  const names = readdirTrashOrThrow(dir)
  const out: TrashEntry[] = []
  for (const name of names) {
    const full = join(dir, name)
    try {
      const st = lstatSync(full)
      const sizeBytes = st.isDirectory()
        ? getPathByteSize(full, { maxDepth: 12 })
        : st.size
      out.push({
        name,
        path: full,
        sizeBytes,
        isDirectory: st.isDirectory(),
      })
    } catch {
      /* skip */
    }
  }
  return out
}

export function trashTotalBytes(): number {
  return listTrashEntries().reduce((a, e) => a + e.sizeBytes, 0)
}

/**
 * Fallback: recursive delete of ~/.Trash contents (use only after confirmation).
 */
export function purgeTrashFolderContents(): void {
  const dir = trashDir()
  if (!existsSync(dir)) return
  for (const name of readdirTrashOrThrow(dir)) {
    const full = join(dir, name)
    rmSync(full, { recursive: true, force: true })
  }
}
