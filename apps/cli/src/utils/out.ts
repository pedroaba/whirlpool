import type { DiskSnapshot } from '@whirlpool/disk'
import {
  formatDeltaLine,
  formatDiskSnapshotLine,
  getDiskSnapshot,
} from '@whirlpool/disk'
import pc from 'picocolors'

/** User-facing CLI output on stdout (Pino uses stderr). */
export function outLine(message: string): void {
  process.stdout.write(`${message}\n`)
}

export function outMuted(message: string): void {
  outLine(pc.dim(message))
}

export function outWarn(message: string): void {
  outLine(pc.yellow(message))
}

export function outErr(message: string): void {
  outLine(pc.red(message))
}

export function outOk(message: string): void {
  outLine(pc.green(message))
}

export function outDiskSectionTitle(label: string): void {
  outLine(pc.dim(pc.bold(`\n— ${label} —`)))
}

/** Styled line from `formatDiskSnapshotLine` (bold cyan volume label + body). */
export function outDiskSnapshot(s: DiskSnapshot): void {
  const line = formatDiskSnapshotLine(s)
  const colon = line.indexOf(': ')
  if (colon < 0) {
    outLine(line)
    return
  }
  const head = line.slice(0, colon + 2)
  const tail = line.slice(colon + 2)
  outLine(pc.bold(pc.cyan(head)) + tail)
}

export function outDiskDelta(before: DiskSnapshot, after: DiskSnapshot): void {
  const gained = after.availBytes - before.availBytes
  const line = formatDeltaLine(before, after)
  outLine(gained >= 0 ? pc.green(line) : pc.yellow(line))
}

export async function printDiskBannerColored(
  label: string,
): Promise<DiskSnapshot> {
  const snap = await getDiskSnapshot()
  outDiskSectionTitle(label)
  outDiskSnapshot(snap)
  return snap
}
