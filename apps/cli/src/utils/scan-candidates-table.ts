import { statSync } from 'node:fs'
import { basename } from 'node:path'

import type { OrphanCandidate } from '@whirlpool/explore'
import { formatBytes } from '@whirlpool/format'
import { inferLikelyApp, readMdls } from '@whirlpool/fs-meta'
import pc from 'picocolors'

import { outLine } from './out.ts'

/** Stable key to merge orphan paths that belong to the same logical app. */
function orphanGroupKey(path: string): string {
  const base = basename(path)
  const gc = /^[0-9A-Z]+\.(.+)$/.exec(base)
  if (gc?.[1]) return gc[1]
  if (base.endsWith('.plist')) return base.slice(0, -'.plist'.length)
  return base
}

/** Best-effort display name: Spotlight display name, then fs-meta guess. */
export function orphanAppDisplayName(path: string): string {
  const base = basename(path)
  const md = readMdls(path)
  const display = md['kMDItemDisplayName']?.trim()
  if (display) return display
  const fsName = md['kMDItemFSName']?.trim()
  if (fsName && fsName !== base) return fsName
  return inferLikelyApp(md, base)
}

function earliestCreatedMs(path: string): number | undefined {
  try {
    const st = statSync(path)
    const b = st.birthtimeMs
    if (b > 0 && !Number.isNaN(b)) return b
    const c = st.ctimeMs
    if (c > 0 && !Number.isNaN(c)) return c
  } catch {
    /* missing path (e.g. broken link target only) */
  }
  return undefined
}

function formatCreatedEn(ms: number | undefined): string {
  if (ms === undefined) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
    new Date(ms),
  )
}

type AggregatedRow = {
  app: string
  totalBytes: number
  createdMs: number | undefined
}

function aggregateByApp(candidates: OrphanCandidate[]): AggregatedRow[] {
  const groups = new Map<
    string,
    {
      totalBytes: number
      bestPath: string
      bestPathBytes: number
      created?: number
    }
  >()

  for (const c of candidates) {
    const key = orphanGroupKey(c.path)
    let g = groups.get(key)
    if (!g) {
      g = {
        totalBytes: 0,
        bestPath: c.path,
        bestPathBytes: -1,
        created: undefined,
      }
    }
    g.totalBytes += c.sizeBytes
    if (c.sizeBytes > g.bestPathBytes) {
      g.bestPathBytes = c.sizeBytes
      g.bestPath = c.path
    }
    const t = earliestCreatedMs(c.path)
    if (t !== undefined) {
      g.created = g.created === undefined ? t : Math.min(g.created, t)
    }
    groups.set(key, g)
  }

  return [...groups.values()]
    .map((g) => ({
      app: orphanAppDisplayName(g.bestPath),
      totalBytes: g.totalBytes,
      createdMs: g.created,
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes)
}

/**
 * Prints one line per app: name, total footprint, earliest file birth/ctime in the group.
 */
export function printOrphansAppTable(
  candidates: OrphanCandidate[],
  summaryTitle = 'Per-app summary (aggregated orphans):',
): void {
  if (candidates.length === 0) {
    outLine('')
    outLine(pc.dim('(Nothing to list.)'))
    return
  }

  const rows = aggregateByApp(candidates)
  const maxNameLen = Math.max(8, ...rows.map((r) => r.app.length))

  outLine('')
  outLine(pc.bold(pc.cyan(summaryTitle)))
  for (const r of rows) {
    const name =
      r.app.length > maxNameLen ? `${r.app.slice(0, maxNameLen - 1)}…` : r.app
    const size = formatBytes(r.totalBytes)
    const created = formatCreatedEn(r.createdMs)
    outLine(
      `${pc.dim('-')} ${pc.bold(name.padEnd(maxNameLen))} ${pc.dim('|')} ${pc.green(size)} ${pc.dim('| created')} ${pc.dim(created)}`,
    )
  }
}
