import { homedir } from 'node:os'
import { basename } from 'node:path'

import type { OrphanCandidate } from '@whirlpool/explore'
import { formatBytes } from '@whirlpool/format'
import type { OrphanReasonId } from '@whirlpool/taxonomy'
import pc from 'picocolors'

/** Short English gloss for taxonomy ids (picker UI). */
const REASON_LABEL: Record<OrphanReasonId, string> = {
  no_matching_app: 'No matching installed app',
  broken_symlink: 'Broken symlink',
  launch_agent_residual: 'LaunchAgents leftover',
  invalid_app_bundle_leftover: 'Damaged / invalid app bundle',
  targeted_remnant: 'Data matched to this app',
}

function displayPath(absolute: string): string {
  const home = homedir()
  if (absolute === home) return '~'
  if (absolute.startsWith(`${home}/`)) {
    return `~${absolute.slice(home.length)}`
  }
  return absolute
}

/** First segment under ~/Library/... (Caches, Preferences, …). */
function libraryBucket(absolute: string): string | undefined {
  const needle = `${homedir()}/Library/`
  if (!absolute.startsWith(needle)) return undefined
  const rest = absolute.slice(needle.length)
  const first = rest.split('/')[0]
  return first || undefined
}

/**
 * Build multiselect option: compact primary line + hint with reason and full path.
 */
export function orphanTrashMultiselectOption(c: OrphanCandidate): {
  value: string
  label: string
  hint: string
} {
  const name = basename(c.path)
  const size = formatBytes(c.sizeBytes)
  const reason = REASON_LABEL[c.reason] ?? c.reason
  const bucket = libraryBucket(c.path)
  const pathDisp = displayPath(c.path)

  const sep = pc.dim('  ·  ')
  const lead = bucket
    ? `${pc.bold(name)}${sep}${pc.cyan(bucket)}${sep}${pc.green(size)}`
    : `${pc.bold(name)}${sep}${pc.green(size)}`

  return {
    value: c.path,
    label: lead,
    hint: `${pc.dim(reason)} — ${pc.dim(pathDisp)}`,
  }
}

/** Largest first so heavy items are easy to find. */
export function sortCandidatesForPicker(
  candidates: OrphanCandidate[],
): OrphanCandidate[] {
  return [...candidates].sort((a, b) => b.sizeBytes - a.sizeBytes)
}
