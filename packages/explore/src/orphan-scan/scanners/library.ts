import { existsSync, lstatSync, readdirSync, readlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import { readPlistStringField } from '@whirlpool/fs-meta'
import {
  type InstalledAppIndex,
  isBundleStillInstalled,
} from '@whirlpool/system-apps'
import {
  looksLikeBundleIdOrReverseDns,
  OrphanReason,
  type OrphanReasonId,
} from '@whirlpool/taxonomy'

import { type AddCandidate, candidateSize } from '../internal.ts'

export function scanDirChildrenBundleLike(
  dir: string,
  index: InstalledAppIndex,
  reason: OrphanReasonId,
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
    if (isBundleStillInstalled(name, index)) continue
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
      reason,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

export function scanPreferences(
  index: InstalledAppIndex,
  add: AddCandidate,
): void {
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
    if (isBundleStillInstalled(base, index)) continue
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
      reason: OrphanReason.NO_MATCHING_APP,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

export function scanLaunchAgents(
  index: InstalledAppIndex,
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
    if (isBundleStillInstalled(label, index)) continue
    let isDir = false
    try {
      const st = lstatSync(full)
      isDir = st.isDirectory()
    } catch {
      continue
    }
    add({
      path: full,
      reason: OrphanReason.LAUNCH_AGENT_RESIDUAL,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

export function scanGroupContainers(
  index: InstalledAppIndex,
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
    const candidate = m?.[1] ?? name
    if (!looksLikeBundleIdOrReverseDns(candidate)) continue
    if (isBundleStillInstalled(candidate, index)) continue
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
      reason: OrphanReason.NO_MATCHING_APP,
      sizeBytes: candidateSize(full, isDir),
    })
  }
}

export function scanBrokenSymlinksInLibrary(add: AddCandidate): void {
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
            reason: OrphanReason.BROKEN_SYMLINK,
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
