import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  type InstalledAppIndex,
  isBundleStillInstalled,
} from '@whirlpool/system-apps'
import {
  looksLikeBundleIdOrReverseDns,
  OrphanReason,
} from '@whirlpool/taxonomy'

import { type AddCandidate, candidateSize } from '../internal.ts'

export function scanUserApplicationsLeftovers(
  index: InstalledAppIndex,
  add: AddCandidate,
): void {
  const root = join(homedir(), 'Applications')
  if (!existsSync(root)) return
  let names: string[] = []
  try {
    names = readdirSync(root)
  } catch {
    return
  }
  for (const name of names) {
    const full = join(root, name)
    if (name.endsWith('.app')) {
      const info = join(full, 'Contents', 'Info.plist')
      if (!existsSync(info)) {
        add({
          path: full,
          reason: OrphanReason.INVALID_APP_BUNDLE_LEFT_OVER,
          sizeBytes: candidateSize(full, true),
        })
      }
      continue
    }
    try {
      const st = lstatSync(full)
      if (
        st.isDirectory() &&
        looksLikeBundleIdOrReverseDns(name) &&
        !isBundleStillInstalled(name, index)
      ) {
        add({
          path: full,
          reason: OrphanReason.NO_MATCHING_APP,
          sizeBytes: candidateSize(full, true),
        })
      }
    } catch {
      /* skip */
    }
  }
}
