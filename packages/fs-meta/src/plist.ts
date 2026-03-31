import { spawnSync } from 'node:child_process'

export function readPlistStringField(
  plistPath: string,
  field: string,
): string | null {
  const r = spawnSync('/usr/bin/defaults', ['read', plistPath, field], {
    encoding: 'utf8',
  })
  if (r.status !== 0 || !r.stdout) return null
  const v = r.stdout.trim()
  return v || null
}
