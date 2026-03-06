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

export interface GenderColorSettings {
  male: string
  female: string
  nonBinary: string
}

export interface AutoPlacementPriority {
  name: string
  weight: number
  enabled: boolean
  label: string
}

export type GroupType =
  | 'familyWithMinors'
  | 'groupWithMinors'
  | 'familyWithoutMinors'
  | 'groupWithoutMinors'

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  familyWithMinors: 'Families with minors',
  groupWithMinors: 'Groups with minors',
  familyWithoutMinors: 'Families (adults only)',
  groupWithoutMinors: 'Groups (adults only)',
}

export const DEFAULT_GROUP_PLACEMENT_ORDER: GroupType[] = [
  'familyWithMinors',
  'groupWithMinors',
  'familyWithoutMinors',
  'groupWithoutMinors',
]

export interface CoupleSettings {
  splitMixedGenderCouples: boolean
  keepTogetherAge: number
}

export interface AutoPlacementSettings {
  enabled: boolean
  priorities: AutoPlacementPriority[]
  allowConstraintRelaxation: boolean
  groupPlacementOrder: GroupType[]
  couples: CoupleSettings
}

export interface Settings {
  warnings: WarningSettings
  display: DisplaySettings
  autoPlacement: AutoPlacementSettings
  genderColors: GenderColorSettings
  developerMode: boolean
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
  genderColors: {
    male: '#93c5fd',
    female: '#f9a8d4',
    nonBinary: '#c084fc',
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
        name: 'roomFit',
        weight: 6,
        enabled: true,
        label: 'Prefer Rooms That Fit Group Size',
      },
      {
        name: 'minimizeBuildings',
        weight: 5,
        enabled: true,
        label: 'Fill Up As Few Dorms As Possible',
      },
      { name: 'ageCompatibility', weight: 4, enabled: false, label: 'Age Compatibility' },
    ],
    allowConstraintRelaxation: true,
    groupPlacementOrder: [...DEFAULT_GROUP_PLACEMENT_ORDER],
    couples: {
      splitMixedGenderCouples: true,
      keepTogetherAge: 65,
    },
  },
  developerMode: false,
  version: '1.0',
}
