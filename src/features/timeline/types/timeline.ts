/**
 * Timeline View Type Definitions
 *
 * Data structures for the Timeline View feature that visualizes
 * guest occupancy across dates and manages bed assignments over time.
 */

export interface TimelineAssignment {
  /** Unique guest identifier */
  guestId: string;

  /** Bed identifier (e.g., "MA01", "FR03") */
  bedId: string;

  /** Assignment start date (guest arrival or reassignment date) */
  startDate: Date;

  /** Assignment end date (guest departure or reassignment end) */
  endDate: Date;

  /** Optional metadata for tracking */
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface TimelineConfig {
  /** Start date for timeline display range */
  dateRangeStart: Date;

  /** End date for timeline display range */
  dateRangeEnd: Date;

  /** Array of dormitory IDs that are currently collapsed */
  collapsedDorms: string[];

  /** Whether to show the unassigned guests panel */
  showUnassignedPanel: boolean;
}

export interface DateColumn {
  /** Date object for this column */
  date: Date;

  /** Display label (e.g., "12/1") */
  label: string;

  /** Weekday abbreviation (e.g., "M", "Tu", "W") */
  weekday: string;

  /** Full date string for tooltips (e.g., "Monday, December 1, 2025") */
  fullLabel: string;

  /** Column index (0-based) */
  index: number;
}

export interface TimelineBedRow {
  /** Dormitory information */
  dormitory: {
    id: string;
    name: string;
    color?: string;
  };

  /** Room information */
  room: {
    id: string;
    name: string;
    gender: 'male' | 'female' | 'any';
  };

  /** Bed information */
  bed: {
    id: string;
    bedNumber: number;
    bedType: 'upper' | 'lower';
    position?: number;
  };

  /** Whether this row's dormitory is collapsed */
  isCollapsed: boolean;
}

export interface GuestBlobData {
  /** Guest identifier */
  guestId: string;

  /** Guest display name */
  displayName: string;

  /** Bed this guest is assigned to */
  bedId: string;

  /** Starting date column index */
  startColIndex: number;

  /** Ending date column index */
  endColIndex: number;

  /** Number of columns this blob spans */
  spanCount: number;

  /** Full guest data for tooltips and icons */
  guest: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    age: number;
    gender: 'male' | 'female' | 'non-binary';
    groupName?: string;
    lowerBunk?: boolean;
    arrival: Date;
    departure: Date;
    notes?: string;
  };
}

export interface ConflictWarning {
  /** Type of conflict */
  type: 'double-booking' | 'gender-mismatch' | 'bunk-type' | 'age-compatibility';

  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** Bed ID where conflict occurs */
  bedId: string;

  /** Date where conflict occurs */
  date: Date;

  /** Guest IDs involved in conflict */
  guestIds: string[];

  /** Human-readable message */
  message: string;
}

export interface DragDropState {
  /** Whether a drag operation is in progress */
  isDragging: boolean;

  /** Guest being dragged */
  draggedGuestId: string | null;

  /** Original bed ID where drag started */
  sourceBedId: string | null;

  /** Current drop target bed ID (if hovering over valid target) */
  targetBedId: string | null;

  /** Whether current drop target is valid */
  isValidTarget: boolean;
}

/**
 * Preset date range options for quick selection
 */
export enum DateRangePreset {
  AUTO_DETECT = 'auto-detect',
  NEXT_7_DAYS = 'next-7-days',
  NEXT_14_DAYS = 'next-14-days',
  THIS_MONTH = 'this-month',
  CUSTOM = 'custom'
}

/**
 * Storage format for timeline data in localStorage (v2.1)
 */
export interface TimelineStorageData {
  /** Array of timeline assignments */
  timelineAssignments: {
    guestId: string;
    bedId: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
  }[];

  /** Timeline configuration */
  timelineConfig: {
    dateRangeStart: string; // ISO string
    dateRangeEnd: string;   // ISO string
    collapsedDorms: string[];
    showUnassignedPanel: boolean;
  };
}
