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

export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
}

export const DEFAULT_GUEST_DATA_COLUMNS: ColumnConfig[] = [
  { key: 'importOrder', label: '#', visible: true },
  { key: 'housingType', label: 'Housing', visible: true },
  { key: 'firstName', label: 'Name', visible: true },
  { key: 'lastName', label: 'Last Name', visible: true },
  { key: 'gender', label: 'Gender', visible: true },
  { key: 'age', label: 'Age', visible: true },
  { key: 'lowerBunk', label: 'Lower Bunk', visible: true },
  { key: 'groupName', label: 'Group', visible: true },
  { key: 'arrival', label: 'Arrival', visible: true },
  { key: 'departure', label: 'Departure', visible: true },
  { key: 'indivGrp', label: 'Indiv/Grp?', visible: true },
  { key: 'groupOrIndiv', label: 'Group/Indiv', visible: true },
  { key: 'notes', label: 'Notes', visible: true },
  { key: 'email', label: 'Email', visible: true },
  { key: 'firstVisit', label: 'First Visit', visible: true },
  { key: 'roomPreference', label: 'Rm Preference', visible: true },
  { key: 'retreat', label: 'Retreat', visible: true },
  { key: 'ratePerNight', label: 'Rate/Night', visible: true },
  { key: 'priceQuoted', label: 'Price Quoted', visible: true },
  { key: 'amountPaid', label: 'Amount Paid', visible: true },
  { key: 'creationDate', label: 'Created', visible: true },
  { key: 'arrivalTime', label: 'Arrival Time', visible: true },
  { key: 'departureMeals', label: 'Dept Meals', visible: true },
  { key: 'mentalHealth', label: 'Mental Health', visible: true },
  { key: 'physicalHealth', label: 'Physical Health', visible: true },
  { key: 'accommodationChoice', label: 'Accomm Choice', visible: true },
]

export const DEFAULT_TABLE_VIEW_COLUMNS: ColumnConfig[] = DEFAULT_GUEST_DATA_COLUMNS.map(col => ({
  ...col,
  visible: !['email', 'firstVisit', 'ratePerNight', 'priceQuoted', 'amountPaid', 'creationDate', 'arrivalTime', 'departureMeals', 'accommodationChoice'].includes(col.key),
}))

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
