import type { OrphanReasonId } from '@whirlpool/taxonomy'

export type OrphanCandidate = {
  path: string
  reason: OrphanReasonId
  sizeBytes: number
}

/** Optional hooks for progress UI (e.g. CLI installer-style output). */
export type ScanOrphansCallbacks = {
  /** Called when the scanner enters another folder; `folderPath` is e.g. `~/Library/Caches`. */
  onPhase?: (folderPath: string) => void
  /**
   * Called for each unique orphan candidate only (same folderPath as the latest `onPhase`).
   */
  onCandidate?: (c: OrphanCandidate, folderPath: string) => void
}
