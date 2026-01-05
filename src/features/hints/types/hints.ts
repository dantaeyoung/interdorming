/**
 * Hint Types
 * Type definitions for the contextual hints system
 */

export type HintId =
  | 'no-rooms'
  | 'no-rooms-on-config'
  | 'no-rooms-in-dorm'
  | 'no-beds'
  | 'no-beds-in-rooms'
  | 'no-guests'
  | 'no-guests-on-data'
  | 'no-assignments'
  | 'no-assignments-on-table'
  | 'partial-assignments'
  | 'has-warnings'
  | 'all-assigned'

export interface HintAction {
  label: string
  /** Tab to navigate to, or 'upload-csv' / 'load-sample' for special actions */
  action: string
}

export interface Hint {
  id: HintId
  icon: string
  message: string
  action?: HintAction
  secondaryAction?: HintAction
  priority: number
  /** Tab to highlight (instead of navigating) */
  targetTab?: string
  /** Element to highlight (e.g., 'add-dormitory', 'upload-csv') */
  targetElement?: string
}

export interface HintState {
  currentHint: Hint | null
  dismissedThisSession: Set<HintId>
  isCollapsed: boolean
}
