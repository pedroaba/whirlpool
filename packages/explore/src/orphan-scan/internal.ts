import { lstatSync } from 'node:fs'
import { join } from 'node:path'

import { getPathByteSize } from '@whirlpool/fs-meta'

import type { OrphanCandidate } from './types.ts'

export type AddCandidate = (c: OrphanCandidate) => void

/** Tilde-home path segment for progress display (e.g. `~/Library/Caches`). */
export function displayHomePath(relativeFromHome: string): string {
  return join('~', relativeFromHome)
}

export function candidateSize(path: string, isDir: boolean): number {
  if (!isDir) {
    try {
      return lstatSync(path).size
    } catch {
      return 0
    }
  }
  return getPathByteSize(path, { maxDepth: 20 })
}
