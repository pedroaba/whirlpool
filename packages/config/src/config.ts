import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { parse } from 'smol-toml'

export type WhirlpoolConfig = {
  version?: number
  scan?: {
    /** Extra roots (absolute or ~-prefixed expanded). */
    roots?: string[]
  }
  cache?: {
    ignore?: string[]
    browsers?: {
      enabled?: boolean
    }
  }
}

const DEFAULT_CONFIG: WhirlpoolConfig = {
  version: 1,
  scan: { roots: [] },
  cache: { ignore: [], browsers: { enabled: false } },
}

function expandHome(p: string): string {
  if (p === '~' || p.startsWith('~/')) {
    return join(homedir(), p.slice(1).replace(/^\//, ''))
  }
  return p
}

function configPaths(): string[] {
  const home = homedir()
  return [
    join(home, '.config', 'whirlpool', 'config.toml'),
    join(home, '.whirlpool.toml'),
  ]
}

export function loadConfig(): WhirlpoolConfig {
  const merged: WhirlpoolConfig = structuredClone(DEFAULT_CONFIG)
  for (const path of configPaths()) {
    if (!existsSync(path)) continue
    try {
      const raw = readFileSync(path, 'utf8')
      const parsed = parse(raw) as WhirlpoolConfig
      merged.version = parsed.version ?? merged.version
      merged.scan = {
        roots: [
          ...(merged.scan?.roots ?? []),
          ...(parsed.scan?.roots ?? []).map(expandHome),
        ],
      }
      merged.cache = {
        ignore: [
          ...(merged.cache?.ignore ?? []),
          ...(parsed.cache?.ignore ?? []).map(expandHome),
        ],
        browsers: {
          enabled:
            parsed.cache?.browsers?.enabled ??
            merged.cache?.browsers?.enabled ??
            false,
        },
      }
    } catch {
      // Ignore invalid file; could log in verbose mode later
    }
  }
  return merged
}
