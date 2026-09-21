/**
 * Bed ID Generator Composable
 *
 * Format: `PREFIX-NN`
 *   - Multi-word room: first 2 chars of each word, e.g. "Maple Hall" → MAHA-01
 *   - Single-word room: first 4 chars (or fewer if name is shorter), e.g. "Library" → LIBR-01
 *   - Empty/whitespace name: falls back to `RM` so the format stays valid.
 *
 * The format change from the legacy `MH01` scheme was introduced to reduce
 * collisions between rooms whose names share leading characters (e.g.
 * "Maple Hall" vs "Magnolia House" both collapsed to MH under the old
 * 1-char-per-word rule). Coordinated with `dormitoryStore.migrateToBedIdFormatV2`
 * which rewrites existing bedIds + the assignment map.
 *
 * Collision avoidance is the caller's responsibility — the `existingIds`
 * arg must cover every reserved bedId across every cut and template, not
 * just the active dormitory tree. See `dormitoryStore.getAllBedIdsAcrossTrees`.
 */

const PREFIX_FALLBACK = 'RM'

export function useBedIdGenerator() {
  /** Compute the prefix portion (left of the dash) from a room name. */
  function computePrefix(roomName: string): string {
    const trimmed = (roomName || '').trim()
    if (trimmed.length === 0) return PREFIX_FALLBACK
    const words = trimmed.split(/\s+/).filter(w => w.length > 0)
    if (words.length === 0) return PREFIX_FALLBACK
    if (words.length >= 2) {
      // 2 chars per word
      return words.map(w => w.substring(0, 2)).join('').toUpperCase()
    }
    // Single word: first 4 chars (or fewer if shorter)
    return words[0].substring(0, Math.min(4, words[0].length)).toUpperCase()
  }

  /**
   * Generate a bedId for the Nth bed in a room (0-indexed). Result is
   * `PREFIX-NN` where NN is `bedCount + 1` zero-padded to 2 digits.
   */
  function generateBedId(roomName: string, bedCount: number): string {
    const prefix = computePrefix(roomName)
    const bedNumber = (bedCount + 1).toString().padStart(2, '0')
    return `${prefix}-${bedNumber}`
  }

  /**
   * Generate a bedId that doesn't conflict with `existingIds`. Caller is
   * responsible for seeding `existingIds` with every reserved bedId
   * across the entire system (active dormitories + every configuration's
   * tree + every template's tree + any pending in-flight beds).
   */
  function generateUniqueBedId(roomName: string, existingIds: string[]): string {
    const existingSet = new Set(existingIds)
    let bedCount = 0
    let bedId = generateBedId(roomName, bedCount)
    while (existingSet.has(bedId)) {
      bedCount++
      bedId = generateBedId(roomName, bedCount)
    }
    return bedId
  }

  return {
    computePrefix,
    generateBedId,
    generateUniqueBedId,
  }
}
