import { homedir } from 'node:os'
import { join } from 'node:path'

import { getInstalledAppIndex } from '@whirlpool/system-apps'
import { LIBRARY_SCAN_SUBDIRS, OrphanReason } from '@whirlpool/taxonomy'

import { type AddCandidate, displayHomePath } from './internal.ts'
import {
  scanBrokenSymlinksInLibrary,
  scanDirChildrenBundleLike,
  scanGroupContainers,
  scanLaunchAgents,
  scanPreferences,
} from './scanners/library.ts'
import { scanUserApplicationsLeftovers } from './scanners/user-applications.ts'
import type { OrphanCandidate, ScanOrphansCallbacks } from './types.ts'

export function scanOrphans(
  callbacks?: ScanOrphansCallbacks,
): OrphanCandidate[] {
  const index = getInstalledAppIndex()
  const out: OrphanCandidate[] = []
  const seen = new Set<string>()
  let currentFolderPath = ''

  const onPhase = (folderPath: string): void => {
    currentFolderPath = folderPath
    callbacks?.onPhase?.(folderPath)
  }

  const add: AddCandidate = (c: OrphanCandidate) => {
    if (seen.has(c.path)) return
    seen.add(c.path)
    out.push(c)
    callbacks?.onCandidate?.(c, currentFolderPath)
  }

  const home = homedir()

  for (const rel of LIBRARY_SCAN_SUBDIRS) {
    const full = join(home, rel)
    onPhase(displayHomePath(rel))

    if (rel.endsWith('Preferences')) {
      scanPreferences(index, add)
      continue
    }
    if (rel.endsWith('LaunchAgents')) {
      scanLaunchAgents(index, add)
      continue
    }
    if (rel.includes('Group Containers')) {
      scanGroupContainers(index, add)
      continue
    }
    scanDirChildrenBundleLike(full, index, OrphanReason.NO_MATCHING_APP, add)
  }

  onPhase(displayHomePath('Library'))
  scanBrokenSymlinksInLibrary(add)

  onPhase(displayHomePath('Applications'))
  scanUserApplicationsLeftovers(index, add)

  return out
}
