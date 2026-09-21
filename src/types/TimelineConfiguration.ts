/**
 * Timeline of full configurations (see `specs/ConfigurationCuts.md`).
 *
 * Replaces the "base + dated overrides + preset templates" model with
 * a flat sequence of independent configuration snapshots, each
 * covering its window between cut points.
 */

import type { Dormitory } from './Dormitory'

export interface TimelineConfiguration {
  id: string
  /**
   * Inclusive start date (ISO `YYYY-MM-DD`). `null` is the special
   * "from the start of time" marker — there is exactly ONE
   * configuration with `effectiveFrom: null` at all times (the
   * initial configuration). Sort order is `effectiveFrom` ascending
   * with the null one always first.
   */
  effectiveFrom: string | null
  /** Operator-visible name. Defaults to "Configuration N". */
  name: string
  /**
   * Full snapshot of the dormitory tree. Not a delta — every
   * configuration is independent of its neighbours.
   */
  dormitories: Dormitory[]
  createdAt: string
  updatedAt: string
}

export interface ConfigurationTemplate {
  id: string
  name: string
  description?: string
  dormitories: Dormitory[]
  createdAt: string
}
