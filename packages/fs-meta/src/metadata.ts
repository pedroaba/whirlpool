import { spawnSync } from 'node:child_process'
import { lstatSync, readlinkSync } from 'node:fs'

export type FileStatMeta = {
  mode: string
  uid: number
  gid: number
  size: number
  mtimeMs: number
  birthtimeMs?: number
  isSymlink: boolean
  symlinkTarget?: string
}

export function readStatMeta(path: string): FileStatMeta | null {
  try {
    const st = lstatSync(path)
    let symlinkTarget: string | undefined
    if (st.isSymbolicLink()) {
      try {
        symlinkTarget = readlinkSync(path)
      } catch {
        symlinkTarget = undefined
      }
    }
    return {
      mode: st.mode.toString(8),
      uid: st.uid,
      gid: st.gid,
      size: st.size,
      mtimeMs: st.mtimeMs,
      birthtimeMs: st.birthtimeMs,
      isSymlink: st.isSymbolicLink(),
      symlinkTarget,
    }
  } catch {
    return null
  }
}

export type SpotlightMeta = Record<string, string>

export function readMdls(path: string): SpotlightMeta {
  const r = spawnSync('/usr/bin/mdls', [path], { encoding: 'utf8' })
  if (r.status !== 0 || !r.stdout) return {}
  const meta: SpotlightMeta = {}
  for (const line of r.stdout.split('\n')) {
    const m = /^([^=]+)=\s*(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]?.trim()
    const val = m[2]?.trim().replace(/^"(.*)"$/, '$1')
    if (key && val !== undefined) meta[key] = val
  }
  return meta
}

export function inferLikelyApp(
  md: SpotlightMeta,
  basenameHint: string,
): string {
  const kind = md['kMDItemKind']
  const where = md['kMDItemWhereFroms']
  if (where && where.length > 0) return `download:${where.slice(0, 80)}`
  if (kind) return `kind:${kind}`
  if (looksLikeBundleToken(basenameHint))
    return `path:${basenameHint.slice(0, 80)}`
  return 'unknown'
}

function looksLikeBundleToken(s: string): boolean {
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+$/.test(s)
}
