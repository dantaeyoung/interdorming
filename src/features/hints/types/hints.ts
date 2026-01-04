/**
 * Hint Types
 * Type definitions for the contextual hints system
 */

export type HintId =
  | 'no-rooms'
  | 'no-guests'
  | 'no-assignments'
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
}

export interface HintState {
  currentHint: Hint | null
  dismissedThisSession: Set<HintId>
  isCollapsed: boolean
}
