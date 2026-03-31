import { existsSync, lstatSync, readdirSync, readlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { readPlistStringField } from '@whirlpool/fs-meta'
import {
  LIBRARY_SCAN_SUBDIRS,
  looksLikeBundleIdOrReverseDns,
  OrphanReason,
} from '@whirlpool/taxonomy'

import { type AddCandidate, candidateSize, displayHomePath } from './internal.ts'
import type { OrphanCandidate, ScanOrphansCallbacks } from './types.ts'

/** Known bundle id pairs for app migrations (e.g. classic vs new Teams). */
const BUNDLE_ID_ALIAS_PAIRS: readonly (readonly [string, string])[] = [
  ['com.microsoft.teams', 'com.microsoft.teams2'],
]

function expandRemnantTargetBundleIds(
  bundleIds: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>()
  for (const id of bundleIds) {
    const l = id.toLowerCase()
    out.add(l)
    for (const [a, b] of BUNDLE_ID_ALIAS_PAIRS) {
      if (l === a) out.add(b)
      if (l === b) out.add(a)
    }
  }
  return out
}

function segmentMatchesTarget(seg: string, targets: Set<string>): boolean {
  const sl = seg.toLowerCase()
  if (targets.has(sl)) return true
  if (sl.endsWith('.plist')) {
    const b = sl.slice(0, -'.plist'.length)
    if (targets.has(b)) return true
  }
  const m = /^[0-9A-Z]+\.(.+)$/.exec(seg)
  if (m?.[1] && targets.has(m[1].toLowerCase())) return true
  return false
}

function pathMentionsTargetBundleId(
  fullPath: string,
  targets: Set<string>,
): boolean {
  const segments = fullPath.split(/[/\\]/).filter(Boolean)
  for (const seg of segments) {
    if (segmentMatchesTarget(seg, targets)) return true
  }
  return false
}

function scanDirChildrenForTargets(
  dir: string,
  targets: Set<string>,
  add: AddCandidate,
): void {
  if (!existsSync(dir)) return
  let names: string[] = []
  try {
    names = readdirSync(dir)
  } catch {
    return
  }
  for (const name of names) {
    if (name.startsWith('.')) continue
    if (!looksLikeBundleIdOrReverseDns(name)) continue
    if (!targets.has(name.toLowerCase())) continue
    const full = join(dir, name)
    let isDir = false
    try {
      const st = lstatSync(full)
      isDir = st.isDirectory()
    } catch {
      continue
    }
    add({
      path: full,
      reason: OrphanReason.TARGETED_REMNANT,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

function scanPreferencesForTargets(targets: Set<string>, add: AddCandidate): void {
  const dir = join(homedir(), 'Library/Preferences')
  if (!existsSync(dir)) return
  let files: string[] = []
  try {
    files = readdirSync(dir)
  } catch {
    return
  }
  for (const name of files) {
    if (!name.endsWith('.plist')) continue
    const base = name.slice(0, -'.plist'.length)
    if (!looksLikeBundleIdOrReverseDns(base)) continue
    if (!targets.has(base.toLowerCase())) continue
    const full = join(dir, name)
    let isDir = false
    try {
      const st = lstatSync(full)
      isDir = st.isDirectory()
    } catch {
      continue
    }
    add({
      path: full,
      reason: OrphanReason.TARGETED_REMNANT,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

function scanLaunchAgentsForTargets(
  targets: Set<string>,
  add: AddCandidate,
): void {
  const dir = join(homedir(), 'Library/LaunchAgents')
  if (!existsSync(dir)) return
  let files: string[] = []
  try {
    files = readdirSync(dir)
  } catch {
    return
  }
  for (const name of files) {
    if (!name.endsWith('.plist')) continue
    const full = join(dir, name)
    const label =
      readPlistStringField(full, 'Label') ?? name.replace(/\.plist$/, '')
    if (!label.includes('.')) continue
    if (!looksLikeBundleIdOrReverseDns(label)) continue
    if (!targets.has(label.toLowerCase())) continue
    let isDir = false
    try {
      const st = lstatSync(full)
      isDir = st.isDirectory()
    } catch {
      continue
    }
    add({
      path: full,
      reason: OrphanReason.TARGETED_REMNANT,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

function scanGroupContainersForTargets(
  targets: Set<string>,
  add: AddCandidate,
): void {
  const dir = join(homedir(), 'Library/Group Containers')
  if (!existsSync(dir)) return
  let names: string[] = []
  try {
    names = readdirSync(dir)
  } catch {
    return
  }
  for (const name of names) {
    const m = /^[0-9A-Z]+\.(.+)$/.exec(name)
    const candidate = (m?.[1] ?? name).toLowerCase()
    if (!looksLikeBundleIdOrReverseDns(m?.[1] ?? name)) continue
    if (!targets.has(candidate)) continue
    const full = join(dir, name)
    let isDir = false
    try {
      const st = lstatSync(full)
      if (!st.isDirectory()) continue
      isDir = true
    } catch {
      continue
    }
    add({
      path: full,
      reason: OrphanReason.TARGETED_REMNANT,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

function scanBrokenSymlinksForTargets(
  targets: Set<string>,
  add: AddCandidate,
): void {
  const root = join(homedir(), 'Library')
  if (!existsSync(root)) return
  let checked = 0
  const maxChecks = 8000
  const walk = (p: string, depth: number): void => {
    if (checked >= maxChecks || depth > 9) return
    let entries: string[] = []
    try {
      entries = readdirSync(p)
    } catch {
      return
    }
    for (const n of entries) {
      if (checked >= maxChecks) return
      if (n === 'FontCollections') continue
      const full = join(p, n)
      let st
      try {
        st = lstatSync(full)
      } catch {
        continue
      }
      if (st.isSymbolicLink()) {
        checked++
        if (!pathMentionsTargetBundleId(full, targets)) continue
        let target: string
        try {
          target = readlinkSync(full)
        } catch {
          continue
        }
        const resolved = resolve(p, target)
        if (!existsSync(resolved)) {
          add({
            path: full,
            reason: OrphanReason.TARGETED_REMNANT,
            sizeBytes: 0,
          })
        }
        continue
      }
      if (st.isDirectory()) {
        walk(full, depth + 1)
      }
    }
  }
  walk(root, 0)
}

/**
 * Library remnants whose bundle-id-shaped paths match the given bundle ids
 * (after alias expansion). Does not consult installed-app heuristics.
 */
export function scanRemnantsForBundleIds(
  bundleIdsInput: ReadonlySet<string>,
  callbacks?: ScanOrphansCallbacks,
): OrphanCandidate[] {
  const targets = expandRemnantTargetBundleIds(bundleIdsInput)
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
      scanPreferencesForTargets(targets, add)
      continue
    }
    if (rel.endsWith('LaunchAgents')) {
      scanLaunchAgentsForTargets(targets, add)
      continue
    }
    if (rel.includes('Group Containers')) {
      scanGroupContainersForTargets(targets, add)
      continue
    }
    scanDirChildrenForTargets(full, targets, add)
  }

  onPhase(displayHomePath('Library'))
  scanBrokenSymlinksForTargets(targets, add)

  return out
}
