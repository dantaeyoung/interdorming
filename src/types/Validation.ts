/**
 * Validation warning types
 * Defines warning messages and validation results
 */

export type WarningType =
  | 'genderMismatch'
  | 'bunkPreference'
  | 'familySeparation'
  | 'ageCompatibility'
  | 'roomAvailability'

export interface ValidationWarning {
  type: WarningType
  message: string
  severity?: 'error' | 'warning' | 'info'
}

/**
 * Validation result for a guest assignment
 */
export interface ValidationResult {
  valid: boolean
  warnings: string[]
}
