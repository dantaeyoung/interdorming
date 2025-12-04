# Timeline View Specification

**Version:** 1.0
**Created:** 2025-12-03
**Status:** Draft - Pending Approval

## 1. Purpose & User Problem

### Problem Statement
Blue Cliff Monastery staff need to visualize guest occupancy across dates and manage bed assignments over time. The current Guest Assignment mode shows assignments at a single point in time but doesn't reveal:
- When beds are occupied vs. available across multiple dates
- Conflicts where multiple guests are assigned to the same bed on overlapping dates
- Opportunities to move guests between beds during their stay
- Overall occupancy patterns to optimize space utilization

### User Value
The Timeline View provides a calendar-style interface where staff can:
1. **Visualize** guest occupancy patterns across the retreat period
2. **Identify** scheduling conflicts and bed availability
3. **Manage** guest assignments by dragging guests between beds
4. **Handle** complex scenarios where guests may need to change beds mid-stay

### Success Criteria
- Staff can see at a glance which beds are occupied on any given date
- Drag-and-drop interface makes it easy to reassign guests to different beds
- Visual warnings clearly indicate conflicts (overlapping assignments, validation issues)
- Changes in Timeline View are immediately reflected in Guest Assignment mode
- Staff can navigate large datasets (60-80 guests across multiple dormitories) efficiently

---

## 2. Core Functionality

### 2.1 Data Model

**IMPORTANT: Single Source of Truth**
- Timeline View uses the **existing** `assignments` Map from `assignmentStore` (guestId → bedId)
- Guest arrival/departure dates come from `guest.arrival` and `guest.departure` fields
- **NO separate timeline assignments** - this avoids data duplication and sync issues
- Timeline is a **view layer** that visualizes assignments + dates, not a separate data store

**Data Flow:**
```javascript
// Assignment Store (single source of truth)
assignments: Map<guestId, bedId>

// Guest Store
guest: {
  id: string,
  arrival: Date,    // When guest arrives
  departure: Date   // When guest departs
}

// Timeline renders by combining:
// 1. Which bed guest is assigned to (from assignments)
// 2. Which dates guest occupies that bed (from guest.arrival/departure)
```

**Key Behaviors:**
- Dragging a guest in Timeline updates `assignmentStore.assignments` (same as Guest Assignment mode)
- Guest date ranges (arrival/departure) determine which columns the guest blob spans
- Changes in either view are immediately reflected in the other (same underlying data)
- Changes to guest arrival/departure dates trigger validation warnings if conflicts arise

### 2.2 Visual Layout

**Table Structure:**
```
┌─────────┬──────┬─────────┬──────┬──────┬──────┬──────┐
│ Dorm    │ Room │ Bed     │ 12/1 │ 12/2 │ 12/3 │ 12/4 │
├─────────┼──────┼─────────┼──────┼──────┼──────┼──────┤
│ Crystal │ R1   │ 1(Lower)│ [===John Smith====]       │
│ Sunshine│      │ 2(Upper)│      │ [===Jane Doe===]   │
│         │ R2   │ 1(Lower)│ [=====Alice Johnson=====] │
│         │      │ 2(Upper)│      │      │ [==Bob==]   │
├─────────┼──────┼─────────┼──────┼──────┼──────┼──────┤
│ Fresh   │ R1   │ 1(Lower)│      │      │ [=Mary==]   │
│ Rain    │      │ 2(Upper)│      │      │      │ [Tom] │
└─────────┴──────┴─────────┴──────┴──────┴──────┴──────┘
```

**Layout Components:**
- **Sticky left columns:** Dormitory, Room, Bed (freeze during horizontal scroll)
- **Sticky header row:** Dates (freeze during vertical scroll)
- **Rotated text:** Dormitory and Room names displayed vertically to save space
- **Guest cells:** Date columns where guest "blobs" are rendered
- **Guest blobs:** Colored chips that span multiple cells for multi-day stays

### 2.3 Collapse/Expand Feature

**Purpose:** Reduce vertical space when viewing many dormitories

**Collapsed State:**
- Dormitory rows compress to ~5px height per bed
- Guest information not visible (just colored bars)
- Entire dormitory takes minimal vertical space
- Click to expand back to full view

**Expanded State (Default):**
- Full 50px height per bed row
- Guest names, icons, and metadata visible
- Room and bed labels clearly readable

**Interaction:**
- Click dormitory header to toggle collapse/expand
- Persist collapse state in localStorage
- Keyboard shortcut: `C` to collapse/expand focused dormitory

---

## 3. User Interactions

### 3.1 Drag-and-Drop Assignment

**Basic Behavior:**
- Click and drag a guest blob to move between bed rows
- **Entire stay** moves to the new bed (all dates from start to end)
- Drop target highlights on hover (green if valid, red if conflict exists)
- Visual feedback during drag (semi-transparent preview)

**Edge Cases:**
- **Overlapping assignments:** Show visual warning (yellow/red highlight) but allow
- **Gender mismatch:** Same warnings as Guest Assignment mode (non-blocking)
- **Invalid drops:** Cannot drop on date column headers or non-bed rows

### 3.2 Date Range Configuration

**Date Picker Controls:**
- **Start Date:** User-selectable calendar picker (default: earliest guest arrival)
- **End Date:** User-selectable calendar picker (default: latest guest departure)
- **Preset buttons:** "Auto-detect from guests", "Next 7 days", "Next 14 days", "This month"

**Date Display:**
- Column headers show date in `M/D` format (e.g., "12/1")
- Tooltip on hover shows full date (e.g., "Monday, December 1, 2025")
- Minimum column width: 150px to accommodate guest names

### 3.3 Unassigned Guests Panel (Optional Toggle)

**Default:** Hidden

**When Enabled:**
- Side panel on right showing guests without timeline assignments
- Grouped by arrival date
- Drag from panel onto timeline to assign
- Toggle button in toolbar: "Show Unassigned Guests"

### 3.4 Guest Blob Information Display

**Visual Elements in Guest Cells:**
- **Guest Name:** Primary text (preferredName or firstName)
- **Age/Gender Icons:** Small icons (👨👩 for gender, number badge for age)
- **Group Indicator:** Colored dot if part of a family/group (matching group color)
- **Special Needs Icons:** 🛏️ for lower bunk requirement, ♿ for accessibility

**Hover State:**
- Tooltip shows full guest details: full name, age, gender, arrival/departure dates, special needs
- Blob elevates slightly with shadow (already in mockup)
- Cursor changes to `move` to indicate draggability

**Color Coding:**
- Default: Blue gradient (current mockup)
- **Future enhancement:** Color by group, gender, or custom categories

---

## 4. Synchronization with Guest Assignment Mode

### 4.1 Real-Time Data Sync

**Guest Assignment → Timeline:**
- When guest is assigned to bed in Guest Assignment mode, create timeline assignment spanning arrival to departure dates
- If guest already has timeline assignment(s), prompt: "Guest already assigned on timeline. Replace existing assignments?"

**Timeline → Guest Assignment:**
- When guest is dragged in Timeline view, update primary `assignments` map to reflect the assignment
- If guest has multiple timeline assignments (different beds on different dates), Guest Assignment mode shows the **most recent** assignment

### 4.2 Date Change Handling

**Scenario:** Guest arrival/departure dates change in Guest Assignment mode (CSV re-import, manual edit)

**Behavior:**
1. Check if new dates conflict with existing timeline assignments
2. If conflict exists (e.g., assigned bed is occupied by another guest on new dates):
   - Show non-blocking warning: ⚠️ "Date change creates overlap with [Guest Name] on [Date Range]"
   - Highlight conflicting cells in red
   - Allow user to proceed (warning only, not blocking)
3. If no conflict, automatically adjust timeline assignment dates to match

### 4.3 Data Persistence

**localStorage Structure Addition:**
```javascript
{
  // Existing stores (unchanged)
  guests: Guest[],
  assignments: Map<guestId, bedId>,  // Single source of truth
  dormitories: Dormitory[],

  // NEW: Timeline-specific UI config only (no duplicate assignment data)
  timelineConfig: {
    dateRangeStart: string,
    dateRangeEnd: string,
    collapsedDorms: string[],  // IDs of collapsed dormitories
    showUnassignedPanel: boolean
  }
}
```

**No Data Migration Needed:**
- Timeline uses existing `assignments` and `guests` stores
- Only adds `timelineConfig` for UI state (date range, collapsed dorms)
- No version bump required - backward compatible
- Date range defaults to auto-detect from guest data on first load

---

## 5. Validation & Warnings

### 5.1 Conflict Detection

**Visual Indicators:**
- **Red cell background:** Multiple guests assigned to same bed on same date
- **Yellow cell border:** Gender mismatch for room
- **Orange icon:** Bunk type violation (upper bunk for lower-bunk-required guest)
- **Purple icon:** Age compatibility issue (large age gap, minor with adults)

**Tooltip Warnings:**
Hover over highlighted cell to see:
- "⚠️ Double-booked: [Guest1], [Guest2] both assigned"
- "⚠️ Gender mismatch: Male guest in female room"
- "⚠️ [Guest] requires lower bunk but assigned to upper"

### 5.2 Non-Blocking Philosophy

**Principle:** All warnings are visual and informational only. No action is prevented.

**Rationale:** Staff may have valid reasons for unusual assignments (e.g., overnight stay, special circumstances). System should inform, not restrict.

---

## 6. Technical Implementation

### 6.1 Component Architecture (Vue 3)

**File Structure:**
```
src/features/timeline/
├── components/
│   ├── TimelineView.vue          (main container)
│   ├── TimelineHeader.vue        (date range picker, controls)
│   ├── TimelineTable.vue         (scrollable table grid)
│   ├── GuestBlob.vue             (draggable guest chip)
│   ├── UnassignedPanel.vue       (optional side panel)
│   └── index.ts
├── composables/
│   ├── useTimelineData.ts        (data fetching, sync logic)
│   ├── useTimelineDragDrop.ts    (drag-and-drop handling)
│   ├── useTimelineValidation.ts  (conflict detection)
│   └── useTimelineCollapse.ts    (collapse/expand state)
└── types/
    └── timeline.ts               (TypeScript interfaces)
```

### 6.2 Performance Considerations

**Rendering Optimization:**
- Virtual scrolling for large datasets (use `vue-virtual-scroller` or custom)
- Lazy render guest blobs (only render visible date range ±10 days buffer)
- Debounce drag events to reduce re-renders

**Data Structures:**
- Index timeline assignments by `bedId` and `date` for O(1) conflict lookups
- Cache date range calculations
- Use computed properties for filtered/sorted data

### 6.3 Accessibility

**Keyboard Navigation:**
- Tab through guest blobs
- Arrow keys to move focus between cells
- Enter to start drag, Spacebar to drop
- Escape to cancel drag operation

**Screen Reader Support:**
- ARIA labels for date columns and bed rows
- Announce drag-and-drop actions ("Moving [Guest] from [Bed A] to [Bed B]")
- Live region for validation warnings

---

## 7. Scope & Constraints

### 7.1 Phase 1 (MVP) - Must-Haves

1. ✅ **Basic date range display** with user-configurable start/end dates
2. ✅ **Guest blob rendering** with name display, spanning multiple date cells
3. ✅ **Drag-and-drop reassignment** to move guests between beds
4. ✅ **Real-time sync** with Guest Assignment mode
5. ✅ **Conflict warnings** (visual indicators for double-booking, gender mismatch)
6. ✅ **Sticky headers/columns** for easy navigation

### 7.2 Phase 2 - Nice-to-Haves (Future Enhancements)

- ⏸️ **Collapse/expand dormitories** to save vertical space
- ⏸️ **Unassigned guests panel** (optional toggle)
- ⏸️ **Additional guest info display** (age, gender icons, group indicators, special needs)
- ⏸️ **Split assignments** (different beds on different dates for same guest)
- ⏸️ **Undo/redo** for timeline assignment changes
- ⏸️ **CSV export** of timeline assignments
- ⏸️ **Color customization** for guest blobs (by group, gender, etc.)
- ⏸️ **Keyboard shortcuts** for power users

### 7.3 Out of Scope (Not Planned)

- ❌ Automatic conflict resolution (system won't auto-reassign guests)
- ❌ Predictive scheduling or optimization algorithms
- ❌ Calendar integration (iCal, Google Calendar)
- ❌ Email notifications for assignment changes
- ❌ Multi-user collaboration or real-time sync between devices
- ❌ Mobile-specific interface (focus on desktop browser only)

### 7.4 Technical Constraints

- **Client-side only:** All logic runs in browser, no backend API
- **localStorage limits:** ~10MB total storage (adequate for 60-80 guests)
- **Browser compatibility:** Modern browsers only (Chrome, Firefox, Safari, Edge latest 2 versions)
- **No external dependencies:** Prefer vanilla Vue 3 + TypeScript, minimal third-party libraries

---

## 8. User Stories

### Story 1: Visualize Occupancy
**As a** monastery staff member
**I want to** see which beds are occupied on each date
**So that** I can quickly identify availability and plan for new arrivals

**Acceptance Criteria:**
- Timeline table displays all beds (rows) and dates (columns)
- Guest names appear as colored chips spanning their stay dates
- Empty cells are clearly distinguishable from occupied cells
- I can scroll horizontally to view more dates and vertically to view more beds

### Story 2: Reassign Guest to Different Bed
**As a** monastery staff member
**I want to** drag a guest from one bed to another in the timeline
**So that** I can resolve conflicts or accommodate special requests

**Acceptance Criteria:**
- I can click and drag a guest blob to a different bed row
- Drop target highlights to show where guest will be placed
- Guest's entire stay moves to the new bed
- Change is immediately reflected in Guest Assignment mode
- Visual warning appears if new bed has conflicts (gender, double-booking)

### Story 3: Configure Date Range
**As a** monastery staff member
**I want to** set the date range displayed in the timeline
**So that** I can focus on upcoming retreats or specific time periods

**Acceptance Criteria:**
- Date range picker allows me to select start and end dates
- Preset buttons (e.g., "Next 7 days") quickly set common ranges
- "Auto-detect" button sets range based on guest arrival/departure dates
- Timeline updates immediately when date range changes

### Story 4: Detect Scheduling Conflicts
**As a** monastery staff member
**I want to** see visual warnings when assignments conflict
**So that** I can identify and resolve double-bookings or validation issues

**Acceptance Criteria:**
- Red background highlights cells where multiple guests share same bed on same date
- Yellow borders indicate gender mismatches
- Tooltip on hover explains the specific conflict
- Warnings are informational only (don't prevent assignment)
- Conflicts are recalculated in real-time as I make changes

---

## 9. Design Mockup Reference

The current mockup (`TimelineView.vue`) demonstrates:
- ✅ Table layout with sticky headers and left columns
- ✅ Rotated text for dormitory and room labels
- ✅ Guest blobs spanning multiple date cells using absolute positioning
- ✅ Visual styling with gradient backgrounds, shadows, hover effects
- ✅ Responsive column widths (150px minimum for date columns)

**Mockup Improvements Needed for Implementation:**
1. Replace hardcoded mock data with dynamic rendering from state
2. Implement drag-and-drop handlers on guest blobs
3. Add date range picker controls in header
4. Implement conflict detection and visual warning styles
5. Add localStorage integration for timeline assignments
6. Sync with main application state (guests, dormitories, assignments)

---

## 10. Open Questions / Decisions Needed

### Q1: Guest Name Display
**Issue:** Some guest names are long and may not fit in narrow cells
**Options:**
- A) Truncate with ellipsis ("John Smith..." )
- B) Show abbreviated name ("J. Smith")
- C) Allow blob width to expand slightly if needed
- **Decision:** [User to decide]

### Q2: Conflict Resolution Workflow
**Issue:** When double-booking detected, what actions should user be able to take?
**Options:**
- A) Manual only (user drags one guest to different bed)
- B) Show "Resolve Conflict" button that suggests alternative beds
- C) Allow assigning same bed to multiple guests if intentional (e.g., family)
- **Decision:** [User to decide]

### Q3: Multi-Assignment Editing
**Issue:** Future enhancement to support guest changing beds mid-stay
**Options:**
- A) Right-click guest blob → "Split assignment at date X"
- B) Drag blob edges to resize date range (like calendar event)
- C) Click blob → modal to edit start/end dates per assignment
- **Decision:** Defer to Phase 2

---

## 11. Testing Plan

### Unit Tests
- `useTimelineData.ts`: Test data fetching, assignment creation, sync logic
- `useTimelineValidation.ts`: Test conflict detection algorithms
- `useTimelineDragDrop.ts`: Test drag-and-drop state management

### Integration Tests
- Timeline View ↔ Guest Assignment mode synchronization
- localStorage persistence and migration (v2.0 → v2.1)
- CSV import → timeline assignment creation

### Manual Testing Checklist
- [ ] Load guest CSV with 60-80 guests, verify timeline renders correctly
- [ ] Drag guest to different bed, verify assignment updates in both views
- [ ] Create double-booking scenario, verify red warning appears
- [ ] Change date range, verify only relevant dates display
- [ ] Test with multiple dormitories (collapsed/expanded)
- [ ] Test with guests having various arrival/departure date patterns
- [ ] Refresh browser, verify timeline state persists from localStorage
- [ ] Test horizontal/vertical scrolling with sticky headers/columns
- [ ] Test accessibility: keyboard navigation, screen reader announcements

---

## 12. Implementation Phases

### Phase 1A: Foundation (MVP Core)
1. Create component structure (TimelineView, TimelineTable, GuestBlob)
2. Implement date range picker and configuration state
3. Render dynamic table grid based on dormitories/rooms/beds and date range
4. Render guest blobs based on guest assignments (arrival → departure)
5. Basic styling to match mockup

### Phase 1B: Interactivity
1. Implement drag-and-drop on guest blobs
2. Update timeline assignment on drop
3. Sync with Guest Assignment mode (bidirectional)
4. Add localStorage persistence (migrate to v2.1)

### Phase 1C: Validation & Polish
1. Implement conflict detection (double-booking, gender, bunk type)
2. Add visual warning indicators (red cells, yellow borders, tooltips)
3. Handle date change scenarios (warn on conflicts)
4. Accessibility improvements (keyboard nav, ARIA labels)

### Phase 2: Enhancements (Post-MVP)
1. Collapse/expand dormitories feature
2. Unassigned guests panel (optional toggle)
3. Enhanced guest info display (icons for age, gender, group, special needs)
4. Undo/redo for timeline assignments
5. CSV export of timeline data

---

## 13. Glossary

- **Guest Blob:** Visual element (colored chip) representing a guest's occupancy of a bed across dates
- **Timeline Assignment:** Data record linking a guest to a bed for a specific date range
- **Conflict:** Situation where validation rules are violated (e.g., double-booking, gender mismatch)
- **Sticky Column/Header:** UI element that remains visible during scrolling (frozen in place)
- **Collapse/Expand:** UI interaction to minimize/maximize vertical space used by a dormitory
- **Drop Target:** Bed row where a dragged guest blob can be dropped to reassign
- **Date Range:** User-configurable start and end dates determining which columns display in timeline

---

## 14. Approval & Next Steps

**Spec Review Checklist:**
- [ ] Purpose and user value clearly defined
- [ ] Success criteria are measurable
- [ ] Core functionality and interactions specified
- [ ] Data model and synchronization logic detailed
- [ ] Scope boundaries set (MVP vs. future enhancements)
- [ ] Technical constraints acknowledged
- [ ] Open questions identified for user decisions

**Once Approved:**
1. User types **"GO!"** to begin implementation
2. Create Phase 1A tasks in todo list
3. Begin coding TimelineView component with dynamic data
4. Iterate through implementation phases
5. Test and validate against success criteria

---

**End of Specification**
