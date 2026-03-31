import { writeSync } from 'node:fs'
import { homedir } from 'node:os'
import { Worker } from 'node:worker_threads'

import type { ScanOrphansCallbacks } from '@whirlpool/explore'
import { formatBytes } from '@whirlpool/format'
import pc from 'picocolors'

import { outLine } from './out.ts'

function spinnerLine(pathOrDetail: string): string {
  return `${pc.bold(pc.cyan('[SCANNING]'))} ${pathOrDetail}`
}

function doneLine(label: string): string {
  return `${pc.green('[DONE]:')} ${label}`
}

/**
 * Progress sink: worker drives an in-place stderr spinner; main posts text updates.
 * `writeSync` needs no extra flush on a TTY (OS delivers immediately).
 */
export type LiveScanProgress = {
  /** Advance to scanning `nextPath`; if `completedPrevious` is set, print it as a finished line first. */
  phaseLine: (nextPath: string, completedPrevious?: string) => void
  candidateTick: (detail: string) => void
  stop: (lastPhasePath?: string) => void
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function createWorkerLineSpinner(initialMessage: string): LiveScanProgress {
  const worker = new Worker(
    new URL('./scan-spinner-worker.ts', import.meta.url),
    {
      workerData: { initial: pc.bold(initialMessage) },
    },
  )
  let lastCandidateWrite = 0

  return {
    phaseLine(nextPath: string, completedPrevious?: string) {
      const text = spinnerLine(nextPath)
      if (completedPrevious !== undefined) {
        worker.postMessage({ completePhase: completedPrevious, text })
      } else {
        worker.postMessage({ text })
      }
    },
    candidateTick(detail: string) {
      const now = Date.now()
      if (now - lastCandidateWrite < 280) return
      lastCandidateWrite = now
      worker.postMessage({ text: detail })
    },
    stop(lastPhasePath?: string) {
      void worker.terminate()
      const suffix =
        lastPhasePath !== undefined && lastPhasePath !== ''
          ? `\r\x1b[2K${doneLine(lastPhasePath)}\n`
          : '\n'
      try {
        writeSync(process.stderr.fd, suffix)
      } catch {
        process.stderr.write(suffix)
      }
    },
  }
}

/** When Workers are unavailable or stderr is not a TTY: one line per update (no in-place spin). */
function createNewlineFallbackProgress(
  initialMessage: string,
): LiveScanProgress {
  let frame = 0
  let lastCandidateWrite = 0

  function line(message: string): void {
    const sym = FRAMES[frame++ % FRAMES.length]!
    const out = `${pc.magenta(sym)} ${message}\n`
    try {
      writeSync(process.stderr.fd, out)
    } catch {
      process.stderr.write(out)
    }
  }

  line(pc.bold(initialMessage))

  return {
    phaseLine(nextPath: string, completedPrevious?: string) {
      if (completedPrevious !== undefined) {
        const done = `${doneLine(completedPrevious)}\n`
        try {
          writeSync(process.stderr.fd, done)
        } catch {
          process.stderr.write(done)
        }
      }
      line(spinnerLine(nextPath))
    },
    candidateTick(detail: string) {
      const now = Date.now()
      if (now - lastCandidateWrite < 280) return
      lastCandidateWrite = now
      line(detail)
    },
    stop(lastPhasePath?: string) {
      if (lastPhasePath !== undefined && lastPhasePath !== '') {
        const done = `${doneLine(lastPhasePath)}\n`
        try {
          writeSync(process.stderr.fd, done)
        } catch {
          process.stderr.write(done)
        }
      }
    },
  }
}

function createLiveScanProgress(initialMessage: string): LiveScanProgress {
  if (!process.stderr.isTTY) {
    return createNewlineFallbackProgress(initialMessage)
  }
  try {
    return createWorkerLineSpinner(initialMessage)
  } catch {
    return createNewlineFallbackProgress(initialMessage)
  }
}

/**
 * Runs synchronous cache sizing with the same stderr spinner as orphan scan;
 * `reportSizingTarget` should be passed to `planCacheClean({ onSizingTarget })`.
 */
export function withCacheSizingSpinner<T>(
  fn: (reportSizingTarget: (absolutePath: string) => void) => T,
  startMessage = 'Measuring ~/Library/Caches…',
): T {
  const live = createLiveScanProgress(startMessage)
  const home = homedir()
  let lastDisplay: string | undefined
  const reportSizingTarget = (absolutePath: string): void => {
    const display = absolutePath.startsWith(home)
      ? `~${absolutePath.slice(home.length)}`
      : absolutePath
    live.phaseLine(display, lastDisplay)
    lastDisplay = display
  }
  try {
    return fn(reportSizingTarget)
  } finally {
    live.stop(lastDisplay)
  }
}

/**
 * Runs a synchronous scan with a background-thread spinner on stderr (TTY) so
 * animation continues while fs work blocks the main thread.
 */
export function withScanSpinner<T>(
  scanFn: (callbacks?: ScanOrphansCallbacks) => T,
  startMessage = 'Scanning Library…',
): T {
  const live = createLiveScanProgress(startMessage)
  const progress = createScanProgressPrinter({ live })
  try {
    return scanFn({
      onPhase: progress.onPhase,
      onCandidate: (c) => progress.onCandidate(c),
    })
  } finally {
    progress.flushLastPhase()
    live.stop(progress.phasePathForStop())
  }
}

type ScanProgressCandidate = { path: string }

type CreateScanProgressOptions = {
  live?: LiveScanProgress
}

export function createScanProgressPrinter(opts?: CreateScanProgressOptions): {
  onPhase: (folderPath: string) => void
  onCandidate: (c: ScanProgressCandidate) => void
  flushLastPhase: () => void
  phasePathForStop: () => string | undefined
} {
  const live = opts?.live
  let anyPhaseStarted = false
  let countInPhase = 0
  let currentPhase = ''

  return {
    onPhase(folderPath: string) {
      const completedPrevious =
        anyPhaseStarted && currentPhase !== '' ? currentPhase : undefined
      currentPhase = folderPath
      if (live) {
        live.phaseLine(folderPath, completedPrevious)
        anyPhaseStarted = true
        countInPhase = 0
        return
      }
      if (completedPrevious !== undefined) {
        outLine(doneLine(completedPrevious))
      }
      if (anyPhaseStarted && countInPhase === 0) {
        outLine(pc.dim('…'))
      }
      anyPhaseStarted = true
      countInPhase = 0
      outLine(`${pc.bold(pc.cyan('[SCANNING]:'))} ${folderPath}`)
    },
    onCandidate(c: ScanProgressCandidate) {
      countInPhase++
      if (live) {
        live.candidateTick(
          spinnerLine(
            `${pc.dim(currentPhase)} ${pc.yellow('·')} ${countInPhase} candidate(s)`,
          ),
        )
        return
      }
      outLine(`  ${pc.dim(c.path)}`)
    },
    flushLastPhase() {
      if (live) return
      if (anyPhaseStarted && countInPhase === 0) {
        outLine(pc.dim('…'))
      }
    },
    phasePathForStop() {
      return anyPhaseStarted && currentPhase !== '' ? currentPhase : undefined
    },
  }
}

export function printScanDoneLine(
  candidateCount: number,
  totalBytes: number,
): void {
  outLine(
    `${pc.green('[DONE]:')} ${pc.bold(String(candidateCount))} candidate(s), ${pc.cyan(formatBytes(totalBytes))} ${pc.dim('(read-only)')}`,
  )
}
