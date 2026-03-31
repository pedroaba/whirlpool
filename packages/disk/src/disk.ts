import { statfs } from 'node:fs/promises'

import { formatBytes } from '@whirlpool/format'

export type DiskSnapshot = {
  mountPoint: string
  totalBytes: number
  availBytes: number
  usedBytes: number
}

export async function getDiskSnapshot(mountPoint = '/'): Promise<DiskSnapshot> {
  const s = await statfs(mountPoint)
  const bsize = Number(s.bsize)
  const blocks = Number(s.blocks)
  const bavail = Number(s.bavail)
  const totalBytes = blocks * bsize
  const availBytes = bavail * bsize
  const usedBytes = Math.max(0, totalBytes - availBytes)
  return { mountPoint, totalBytes, availBytes, usedBytes }
}

export function formatDiskSnapshotLine(s: DiskSnapshot): string {
  const pct =
    s.totalBytes > 0 ? ((s.usedBytes / s.totalBytes) * 100).toFixed(1) : '0.0'
  return `Disk ${s.mountPoint}: ${formatBytes(s.usedBytes)} used / ${formatBytes(s.totalBytes)} total (${pct}% used), ${formatBytes(s.availBytes)} available`
}

export function formatDeltaLine(
  before: DiskSnapshot,
  after: DiskSnapshot,
): string {
  const gained = after.availBytes - before.availBytes
  const sign = gained >= 0 ? '+' : ''
  return `Available space change: ${sign}${formatBytes(gained)} (before ${formatBytes(before.availBytes)} → after ${formatBytes(after.availBytes)})`
}

/**
 * Prints disk status to stdout (or `writeLine`) and returns the snapshot.
 * Avoids console.* so CLI can separate user output from Pino on stderr.
 */
export async function printDiskBanner(
  label?: string,
  writeLine: (line: string) => void = (line) => {
    process.stdout.write(`${line}\n`)
  },
): Promise<DiskSnapshot> {
  const snap = await getDiskSnapshot()
  if (label) {
    writeLine(`\n— ${label} —`)
  }
  writeLine(formatDiskSnapshotLine(snap))
  return snap
}
