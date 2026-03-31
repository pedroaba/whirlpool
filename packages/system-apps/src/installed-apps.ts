import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

import { looksLikeBundleIdOrReverseDns } from '@whirlpool/taxonomy'

export type InstalledAppIndex = {
  bundleIds: Set<string>
  /** Basenames without .app */
  appBasenames: Set<string>
}

export type InstalledAppRecord = {
  /** Lowercase CFBundleIdentifier when readable */
  bundleId: string | null
  appPath: string
  /** CFBundleName from Info.plist when readable */
  bundleName: string | null
}

function defaultsReadField(
  infoPlistPath: string,
  field: string,
): string | null {
  const r = spawnSync('/usr/bin/defaults', ['read', infoPlistPath, field], {
    encoding: 'utf8',
  })
  if (r.status !== 0 || !r.stdout) return null
  const v = r.stdout.trim()
  return v || null
}

function readBundleId(infoPlistPath: string): string | null {
  return defaultsReadField(infoPlistPath, 'CFBundleIdentifier')
}

function readBundleName(infoPlistPath: string): string | null {
  return defaultsReadField(infoPlistPath, 'CFBundleName')
}

function collectAppRecordsFromRoot(
  root: string,
  out: InstalledAppRecord[],
): void {
  if (!existsSync(root)) return
  let entries: string[] = []
  try {
    entries = readdirSync(root)
  } catch {
    return
  }
  for (const name of entries) {
    if (!name.endsWith('.app')) continue
    const appPath = join(root, name)
    const info = join(appPath, 'Contents', 'Info.plist')
    let bundleId: string | null = null
    let bundleName: string | null = null
    if (existsSync(info)) {
      const bid = readBundleId(info)
      if (bid) bundleId = bid.toLowerCase()
      bundleName = readBundleName(info)
    }
    out.push({ bundleId, bundleName, appPath })
  }
}

/** All .app bundles under /Applications and ~/Applications. */
export function getInstalledAppCatalog(): InstalledAppRecord[] {
  const out: InstalledAppRecord[] = []
  collectAppRecordsFromRoot('/Applications', out)
  collectAppRecordsFromRoot(join(homedir(), 'Applications'), out)
  return out
}

export function getInstalledAppIndex(): InstalledAppIndex {
  const index: InstalledAppIndex = {
    bundleIds: new Set(),
    appBasenames: new Set(),
  }
  for (const r of getInstalledAppCatalog()) {
    if (r.bundleId) index.bundleIds.add(r.bundleId)
    const base = basename(r.appPath)
    if (base.endsWith('.app')) {
      index.appBasenames.add(base.slice(0, -'.app'.length).toLowerCase())
    }
  }
  return index
}

function recordMatchesNameQuery(r: InstalledAppRecord, q: string): boolean {
  const parts = q.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length === 0) return false

  const base = basename(r.appPath).replace(/\.app$/i, '').toLowerCase()
  const name = (r.bundleName ?? '').toLowerCase()
  const bid = (r.bundleId ?? '').toLowerCase()
  const hay = `${base} ${name} ${bid}`

  return parts.every((p) => hay.includes(p))
}

/**
 * Resolve a single user string: either a bundle id (reverse-DNS heuristic) or an installed app name.
 * Returns all matching bundle ids when several apps match the name.
 */
export function resolveScanTarget(input: string): {
  bundleIds: string[]
  matchedLabel: string
} | null {
  const raw = input.trim()
  if (!raw) return null

  if (looksLikeBundleIdOrReverseDns(raw)) {
    return { bundleIds: [raw.toLowerCase()], matchedLabel: raw }
  }

  const q = raw.toLowerCase()
  const catalog = getInstalledAppCatalog()
  const matches = catalog.filter((r) => recordMatchesNameQuery(r, q))
  if (matches.length === 0) return null

  const ids = [
    ...new Set(
      matches.map((m) => m.bundleId).filter((id): id is string => id != null),
    ),
  ]
  if (ids.length === 0) return null

  const labels = matches.map(
    (m) => m.bundleName ?? basename(m.appPath).replace(/\.app$/i, ''),
  )
  const matchedLabel =
    labels.length === 1
      ? (labels[0] ?? raw)
      : `${labels.length} apps: ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? '…' : ''}`

  return { bundleIds: ids, matchedLabel }
}

export function isBundleStillInstalled(
  candidateId: string,
  index: InstalledAppIndex,
): boolean {
  const lower = candidateId.toLowerCase()
  if (index.bundleIds.has(lower)) return true
  for (const id of index.bundleIds) {
    if (id.startsWith(`${lower}.`) || lower.startsWith(`${id}.`)) return true
  }
  if (index.appBasenames.has(lower)) return true
  return false
}
