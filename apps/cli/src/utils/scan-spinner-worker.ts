/**
 * Runs outside the main thread so setInterval can animate while the scan blocks
 * the event loop (similar to async npm/pnpm keeping the main thread responsive).
 */
import { writeSync } from 'node:fs'
import { parentPort, workerData } from 'node:worker_threads'

import pc from 'picocolors'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

let message: string =
  typeof workerData?.initial === 'string'
    ? workerData.initial
    : pc.bold('Scanning…')
let frame = 0

parentPort?.on('message', (m: { text?: string; completePhase?: string }) => {
  if (typeof m?.completePhase === 'string') {
    try {
      writeSync(2, `\r\x1b[2K${pc.green('[DONE]:')} ${m.completePhase}\n`)
    } catch {
      /* ignore */
    }
    if (typeof m?.text === 'string') message = m.text
    return
  }
  if (typeof m?.text === 'string') message = m.text
})

function tick(): void {
  const sym = FRAMES[frame++ % FRAMES.length]!
  try {
    writeSync(2, `\r\x1b[2K${pc.magenta(sym)} ${message}`)
  } catch {
    /* ignore */
  }
}

setInterval(tick, 80)
tick()
