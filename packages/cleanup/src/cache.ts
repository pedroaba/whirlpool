import { existsSync, readdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type { WhirlpoolConfig } from '@whirlpool/config'
import { getPathByteSize } from '@whirlpool/fs-meta'

function isIgnored(target: string, ignores: string[]): boolean {
  const norm = target.replace(/\/$/, '')
  for (const ign of ignores) {
    const i = ign.replace(/\/$/, '')
    if (norm === i || norm.startsWith(`${i}/`)) return true
  }
  return false
}

function userCachesDir(): string {
  return join(homedir(), 'Library/Caches')
}

/**
 * Extra cache-like paths (often under Application Support) included only with --browsers.
 */
export function browserExtraCachePaths(): string[] {
  const h = homedir()
  return [
    join(h, 'Library/Application Support/Google/Chrome/Default/Cache'),
    join(h, 'Library/Application Support/Google/Chrome/Default/Code Cache'),
    join(h, 'Library/Application Support/Google/Chrome/Default/GPUCache'),
    join(h, 'Library/Application Support/Microsoft Edge/Default/Cache'),
    join(h, 'Library/Application Support/Microsoft Edge/Default/Code Cache'),
    join(h, 'Library/Application Support/Microsoft Edge/Default/GPUCache'),
  ]
}

export type CacheCleanPlan = {
  targets: string[]
  totalBytes: number
}

export function planCacheClean(opts: {
  config: WhirlpoolConfig
  includeBrowsers: boolean
  /** Called before sizing each target (e.g. CLI progress). */
  onSizingTarget?: (absolutePath: string) => void
}): CacheCleanPlan {
  const ignores = opts.config.cache?.ignore ?? []
  const targets: string[] = []
  let totalBytes = 0
  const seen = new Set<string>()

  const pushTarget = (full: string): void => {
    if (!existsSync(full) || isIgnored(full, ignores)) return
    const norm = full.replace(/\/$/, '')
    if (seen.has(norm)) return
    seen.add(norm)
    opts.onSizingTarget?.(full)
    const size = getPathByteSize(full, { maxDepth: 25 })
    targets.push(full)
    totalBytes += size
  }

  const main = userCachesDir()
  if (existsSync(main) && !isIgnored(main, ignores)) {
    let entries: string[] = []
    try {
      entries = readdirSync(main)
    } catch {
      /* skip */
    }
    for (const name of entries) {
      if (name.startsWith('.')) continue
      const full = join(main, name)
      pushTarget(full)
    }
  }

  if (opts.includeBrowsers) {
    for (const full of browserExtraCachePaths()) {
      pushTarget(full)
    }
  }

  return { targets, totalBytes }
}

export function executeCacheClean(targets: string[], dryRun: boolean): number {
  let removedBytes = 0
  for (const full of targets) {
    let size = 0
    try {
      size = getPathByteSize(full, { maxDepth: 25 })
    } catch {
      /* ignore */
    }
    if (!existsSync(full)) continue
    if (dryRun) {
      removedBytes += size
      continue
    }
    try {
      rmSync(full, { recursive: true, force: true })
      removedBytes += size
    } catch {
      /* skip */
    }
  }
  return removedBytes
}
