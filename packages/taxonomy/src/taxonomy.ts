/**
 * Frozen v1 taxonomy for orphan candidate reasons (PRD).
 */
export const OrphanReason = {
  NO_MATCHING_APP: 'no_matching_app',
  BROKEN_SYMLINK: 'broken_symlink',
  LAUNCH_AGENT_RESIDUAL: 'launch_agent_residual',
  INVALID_APP_BUNDLE_LEFT_OVER: 'invalid_app_bundle_leftover',
  /** User-targeted scan by app name or bundle id (not global orphan heuristic). */
  TARGETED_REMNANT: 'targeted_remnant',
} as const

export type OrphanReasonId = (typeof OrphanReason)[keyof typeof OrphanReason]

/**
 * ~/Library subpaths (relative to home) scanned for bundle-id-shaped items.
 */
export const LIBRARY_SCAN_SUBDIRS = [
  'Library/Application Support',
  'Library/Caches',
  'Library/Preferences',
  'Library/LaunchAgents',
  'Library/Saved Application State',
  'Library/Group Containers',
] as const

export type LibraryScanSubdir = (typeof LIBRARY_SCAN_SUBDIRS)[number]

/** Reverse-DNS style heuristic: at least one dot, safe charset. */
export function looksLikeBundleIdOrReverseDns(name: string): boolean {
  if (!name.includes('.')) return false
  return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(name)
}
