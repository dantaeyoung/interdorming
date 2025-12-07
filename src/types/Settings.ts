/**
 * Settings data model
 * Application configuration and preferences
 */

export interface WarningSettings {
  genderMismatch: boolean
  bunkPreference: boolean
  familySeparation: boolean
  roomAvailability: boolean
}

export interface DisplaySettings {
  showAgeHistograms: boolean
}

export interface AutoPlacementPriority {
  name: string
  weight: number
  enabled: boolean
  label: string
}

export interface AutoPlacementSettings {
  enabled: boolean
  priorities: AutoPlacementPriority[]
  allowConstraintRelaxation: boolean
}

export interface Settings {
  warnings: WarningSettings
  display: DisplaySettings
  autoPlacement: AutoPlacementSettings
  version: string
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  warnings: {
    genderMismatch: true,
    bunkPreference: true,
    familySeparation: true,
    roomAvailability: true,
  },
  display: {
    showAgeHistograms: true,
  },
  autoPlacement: {
    enabled: true,
    priorities: [
      {
        name: 'genderedRoomPreference',
        weight: 9,
        enabled: true,
        label: 'Prefer Gendered Rooms over Co-ed',
      },
      { name: 'families', weight: 8, enabled: true, label: 'Keep Families Together' },
      {
        name: 'minimizeBuildings',
        weight: 5,
        enabled: true,
        label: 'Fill Up As Few Dorms As Possible',
      },
      { name: 'ageCompatibility', weight: 4, enabled: false, label: 'Age Compatibility' },
    ],
    allowConstraintRelaxation: true,
  },
  version: '1.0',
}
