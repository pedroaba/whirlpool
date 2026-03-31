import { spawnSync } from 'node:child_process'

export function assertMacOS(): void {
  if (process.platform !== 'darwin') {
    const msg = 'whirlpool only supports macOS in v1.'
    const color =
      process.stderr.isTTY &&
      process.env.NO_COLOR == null &&
      process.env.FORCE_COLOR !== '0'
    if (color) {
      process.stderr.write(`\x1b[31m${msg}\x1b[0m\n`)
    } else {
      process.stderr.write(`${msg}\n`)
    }
    process.exit(1)
  }
}

/**
 * Opens System Settings / Preferences near **Full Disk Access** via `open` and
 * Apple’s `x-apple.systempreferences:` scheme so the user can grant access to
 * the host app (Terminal, Cursor, iTerm, etc.).
 */
export function openFullDiskAccessSettings(): void {
  if (process.platform !== 'darwin') return
  spawnSync(
    '/usr/bin/open',
    ['x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension'],
    { stdio: 'ignore' },
  )
}
