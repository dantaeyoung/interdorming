# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow: Spec → Code

THESE INSTRUCTIONS ARE CRITICAL!

They dramatically improve the quality of the work you create.

### Phase 1: Requirements First

When asked to implement any feature or make changes, ALWAYS start by asking:
"Should I create a Spec for this task first?"

IFF user agrees:

- Create a markdown file in `specs/FeatureName.md`
- Interview the user to clarify:
- Purpose & user problem
- Success criteria
- Scope & constraints
- Technical considerations
- Out of scope items

### Phase 2: Review & Refine

After drafting the Spec:

- Present it to the user
- Ask: "Does this capture your intent? Any changes needed?"
- Iterate until user approves
- End with: "Spec looks good? Type 'GO!' when ready to implement"

### Phase 3: Implementation

ONLY after user types "GO!" or explicitly approves:

- Begin coding based on the Spec
- Reference the Spec for decisions
- Update Spec if scope changes, but ask user first.

## Application Overview

The Blue Cliff Monastery Dorm Assignment Tool is a Vue 3 + TypeScript web application that streamlines the process of assigning 60-80 retreat guests to dormitory beds. It replaces a manual spreadsheet-based workflow used by monastery staff 1-2 times per month.

## Core Architecture

### Technology Stack
- **Vue 3** with Composition API and `<script setup>` SFCs
- **TypeScript** for type safety throughout
- **Pinia** for state management with `pinia-plugin-persistedstate` for localStorage persistence
- **Vite** for dev server and production builds
- **SCSS** scoped styling in components
- **driver.js** for guided tour/onboarding
- **Vitest** for unit testing

### Tab-Based Interface
The application operates across multiple top-level tabs:
- **All Reservations** (id `guest-data`): CSV import, guest table, data management. The id stays `guest-data` for localStorage compat — only the user-facing label changed.
- **Table View** (id `assignment`): Drag-and-drop / click-to-pick interface for assigning guests to beds. Includes a "View Date" filter (persisted in localStorage as `dormAssignments-viewDate`) that scopes the bed slots to one date so multi-assignment beds resolve to a single guest.
- **Timeline View** (id `timeline`): Visual timeline of guest arrivals/departures
- **Room Configuration** (id `configuration`): Dormitory and room layout management
- **Print** (id `print`): Print-friendly views (see Print sub-tabs below)
- **Settings** (id `settings`)

#### Print Sub-tabs
Persisted under `dormAssignments-printMode`:
- **List by Dorm** — full guest list grouped by dorm/room
- **List by A-Z** — alphabetical roster
- **Name Tags** — exportable name-tag CSV
- **Guestmaster** — compact two-column bed grid for hand-checking arrivals (landscape print)
- **Work Coordinator** — sequential roster sorted by gender (NB → F → M) then age, includes camping/commuter (portrait)
- **Check-in Slips** — one slip per guest, sized for paper-cutter slicing (7 slips per portrait page, uniform row heights, last-name highlighted yellow)

Each sub-tab has its own column-toggle preferences persisted under separate localStorage keys (`dormAssignments-guestmasterPrefs`, `…-workCoordinatorPrefs`, `…-checkInSlipsPrefs`). Print orientation is per-mode via an injected `@page` rule (see `applyPrintOrientation` in `PrintView.vue`).

### Data Model Hierarchy
```
Dormitories (top level) → Rooms → Beds → Bed Assignments → Guest
```

A bed can hold multiple `BedAssignment`s as long as their derived stays don't overlap (date-aware bed sharing).

### State Management (Pinia Stores)
- **`guestStore`**: Guest data from CSV import. Includes derived `assignableGuests` (excludes camping/commuter housing types).
- **`dormitoryStore`**: Dormitory/room/bed configuration. Beds use the new `assignments: BedAssignment[]` shape; legacy `assignedGuestId` is migrated on first load via the eager `migrateBedAssignments` watcher.
- **`assignmentStore`**: Guest-to-bed assignments map (`Map<guestId, bedId>`, kept in sync with `bed.assignments`), undo/redo history, suggestion accept/clear, swap helpers, and `getOverlappingAssignments` / `getAllOverlapConflicts` for the date-aware drop dialogs.
- **`settingsStore`**: User preferences (warnings, display, gender colors, auto-placement, group placement order, couple splitting, table column visibility per view)
- **`validationStore`**: Computed validation warnings (`dateOverlap`, gender, bunk, age, etc.). Date-scoped — only roommates whose stays overlap the candidate's stay count.
- **`timelineStore`**: Timeline view state

All stores use `pinia-plugin-persistedstate` for automatic localStorage sync.

## File Structure

```
src/
├── App.vue                     # Root component: tabs, layout, CSV room import
├── main.ts                     # Entry point: Vue app, Pinia, plugins
├── types/                      # TypeScript types and constants
│   ├── Guest.ts, Bed.ts, Room.ts, Dormitory.ts, Assignment.ts
│   ├── Validation.ts, Settings.ts, Storage.ts
│   ├── Constants.ts            # CSV_FIELD_MAPPINGS, defaults, messages
│   └── index.ts                # Central re-export barrel
├── stores/                     # Pinia stores (see above)
├── features/                   # Feature modules (components + composables)
│   ├── assignments/            # useDragDrop, useAutoPlacement, useGroupClassification composables
│   ├── csv/                    # useCSV composable, GuestCSVUpload, RoomConfigCSV
│   ├── dormitories/            # RoomList, BedSlot, RoomConfigCard, RoomGroupLinesOverlay
│   ├── guest-data/             # GuestDataView (main guest table)
│   ├── guests/                 # GuestList, GuestRow, GuestSearch, GroupLinesOverlay
│   ├── hints/                  # useHints composable, HintBanner, EmptyState
│   ├── settings/               # SettingsPanel, AutoPlacementSettings
│   ├── timeline/               # TimelineView, GuestBlob, TimelineHeader
│   ├── print/                  # PrintView
│   ├── backup/                 # DataBackupControls
│   └── export/                 # Export functionality
├── shared/
│   ├── components/             # FloatingActionBar
│   └── composables/            # useDropValidation, useGroupConnections
└── OLD/                        # Legacy vanilla JS (reference only, not used)
```

## Key Technical Patterns

### CSV Handling (`src/features/csv/composables/useCSV.ts`)
- **Header detection**: Auto-skips preamble/metadata lines (e.g., "Reservations From: ...") by scanning for recognized column names
- **Flexible column mapping**: `CSV_FIELD_MAPPINGS` in `Constants.ts` maps field names to multiple variations (e.g., `firstName` matches `FIRST NAME`, `First Name`)
- **Two CSV types**: Guest data import and room configuration import/export
- **Status-based filtering** (`isActiveReservationStatus` / `isCancelledStatus` in `Constants.ts`): Only `Reserved` and `Reserved + Email address verified + confirmed` count as active reservations and get imported. Anything containing `cancel` (case-insensitive) is treated as a cancellation. Other statuses (e.g., `Not completed`) are silently skipped.
- **Add & Update is the only merge mode** — the old "Reset & Replace" choice was removed because operators have continuous data; a single misclick was wiping manual assignments. Full-wipe still exists in Settings → Danger Zone.
- **Match by Planyo `ID`** (or common variants in `CSV_FIELD_MAPPINGS.planyoId`), name as fallback. Same person across multiple retreats no longer collides.
- **Diff & surface**: re-uploads detect cancellations (was active, now cancelled), date changes, and bed-overlap conflicts caused by date shifts. All three are reported in the combined `ImportSummaryDialog`.

### Drag-and-Drop + Click-to-Pick (`src/features/assignments/composables/useDragDrop.ts`)
- Singleton shared state for drag tracking across components
- Native HTML5 drag-and-drop API with custom drag image
- Click-to-pick alternative: pick a guest, then click a bed to place (Escape to cancel)
- **Date-aware drop**: dropping on an empty bed (or one with non-overlapping cohorts) silently adds the assignment. Dropping where the new guest's stay overlaps an existing assignment opens `OverlapConfirmDialog` (Replace / Cancel). Group drops with any conflicting member open `GroupConflictDialog` (lists every conflict, no assignments made, Cancel-only).
- Mirror logic in Timeline view via `useTimelineDragDrop`.

### Date-Aware Bed Sharing
- `bed.assignments: BedAssignment[]` (one entry per cohort) replaces the legacy single `assignedGuestId`. Dates are derived at read time from the guest's `arrival` / `departure` (single source of truth — editing guest dates updates the assignment automatically).
- Two stays overlap iff `staysOverlap(a, b)` in `useUtils.ts` — half-open intervals, departure-day is bed-available, missing dates = "always present".
- Auto-placement helpers (`getAvailableBeds`, `isBedAvailableForGuest`, `isBedAvailableForGroup`, `scoreAgeCompatibility`, etc.) all respect the candidate's stay so a March guest can be placed on the same bed an April guest already holds.
- Migration runs on first load (eager watcher in `dormitoryStore`) — converts legacy `bed.assignedGuestId` shape to the new array shape and clears persisted undo history.

### Validation (`src/stores/validationStore.ts`)
Non-blocking visual warnings for:
- **Date overlap** — two assignments on the same bed whose stays collide
- Gender mismatches (male in female room)
- Bunk accessibility violations (upper bunk for lower-bunk-required guests)
- Family separation (same GroupName in different rooms)
- Age compatibility issues (large age gaps, minors with adults)

Gender / bunk / age warnings are date-scoped — only roommates whose stays overlap the candidate's stay are considered.

### Internal Notes
- Separate `internalNotes` field on `Guest`, distinct from CSV-imported `notes`. Operator-only, never overwritten by CSV re-imports.
- Editable in `GuestFormModal`. Surfaced in `BedSlot` and `GuestRow` via the 📝 icon (a small dark-purple dot indicates internal notes exist). Hover triggers a Teleported popover that lists "Notes from guest" + "Internal" sections.
- Optional column in the All Reservations table.

### Cancelled Reservations
- Cancelled guests are kept in the data so the operator can review and unassign manually — the import flow does NOT auto-unassign them.
- Visual treatment: All Reservations table row gets opacity 0.4 + line-through on every cell + grayscale on badges; sorted to the bottom of the unassigned list (after camping/commuter, which also tier-sort to the bottom).
- BedSlot guest name gets line-through.
- All print views skip cancelled guests entirely.

### Auto-Placement (`src/features/assignments/composables/useAutoPlacement.ts`)
- **Two-stage algorithm**: Stage 1 places groups as whole units (largest/hardest first), Stage 2 fills remaining beds with individuals
- **Group classification** (`useGroupClassification.ts`): 5-tier system — families with minors → groups with minors → families (adults) → groups (adults) → individuals. Tier order is configurable in settings.
- **Couple handling**: Mixed-gender pairs of 2 adults are split into gendered dorms by default; elderly couples (configurable age threshold) and those with mobility needs stay together in coed rooms
- **Coed room preservation**: Same-gender groups are penalized for using coed rooms, reserving them for mixed-gender families
- **3-pass constraint relaxation**: Strict → relaxed → emergency, each running both stages
- **Room-specific auto-place** (`autoPlaceGuestsInRoom`): Individual-only, unchanged from original algorithm

### Hints System (`src/features/hints/`)
- Contextual hints that highlight UI elements based on current state
- Element-level targeting via `data-hint-target` attributes
- Guided tour using driver.js

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Type-check (vue-tsc) and build for production
npm run preview   # Preview production build (http://localhost:4173)
npm run test      # Run tests with Vitest
```

### Git Workflow
```bash
# CSV files are excluded from commits via .gitignore
git status  # Should never show .csv files
```

### Deployment
Deployed as a static site. See [DEPLOYMENT.md](DEPLOYMENT.md) for Netlify/Vercel/Apache/Nginx configuration.

## Data Persistence

### localStorage (via Pinia Persisted State)
Each store persists independently under its own key. The `assignmentStore` manages:
- Guest-to-bed assignment map
- Assignment history for undo/redo (10-action limit)

### Bed ID Generation
- Format: `[RoomPrefix][BedNumber]` (e.g., "MA01", "FR03")
- Auto-generated based on room name abbreviations
- Must be unique across all dormitories

## Important Implementation Notes

### Version Tag
A version tag (e.g., `v260225-16:45`) is displayed in the header for deployment verification. It lives in `App.vue` inside `<span class="version-tag">…</span>`.

**MUST: bump it automatically on every merge to `main`.** Whenever you're about to merge `development` (or any branch) into `main`, do this without being asked:
1. Run `date "+v%y%m%d-%H:%M"` to get the current stamp.
2. Edit the `<span class="version-tag">…</span>` value in `App.vue` to that stamp.
3. Stage and commit the bump as its own commit (subject: `Bump version tag to vYYMMDD-HH:MM`).
4. Then perform the merge and push.

This applies even when the user just says "merge to main" without mentioning the version. The intent is that production reflects when the merge happened, so the user never has to remind you.

### Singleton Composables
`useDragDrop` uses module-level singleton refs so drag/pick state is shared across all components that call the composable.

### Performance Considerations
- Flat room arrays regenerated from dormitories via `getFlatRoomsList()` when needed
- Large datasets (80+ guests) handled with selective re-rendering

### Data Safety
- Guest assignments preserved during room configuration changes
- Removed beds trigger guest unassignment to prevent data corruption
- Confirmation dialogs for destructive operations

## CSV Column Mappings

### Guest CSV Fields (Flexible)
Required: `firstName`, `lastName`, `gender`, `age`
Optional: `preferredName`, `groupName`, `lowerBunk`, `arrival`, `departure`, `indivGrp`, etc.
Planyo-specific: `planyoId` (matches `ID`, `Reservation ID`, `Reservation #`, `Booking ID`, etc.) and `status` (matches `Status`, `Reservation Status`).

Key fields for auto-placement: `groupName` (shared group ID), `indivGrp` ("individual"/"group"/"family/friends"), `gender`, `age`, `lowerBunk`.

See `CSV_FIELD_MAPPINGS` in `src/types/Constants.ts` for all recognized variations.

### Room Configuration CSV
Required: `Dormitory Name`
Optional: `Room Name`, `Room Gender`, `Bed ID`, `Bed Type`, `Bed Position`, `Active`

## Validation Checklist
After making changes, verify:
- [ ] Can upload guest CSV files with various column names (including with preamble lines)
- [ ] CSV import filters by status — only `Reserved` / `Reserved + Email address verified + confirmed` create guests
- [ ] Re-uploading a CSV detects cancellations (status containing `cancel`) and date changes; surfaces them in `ImportSummaryDialog`
- [ ] Same Planyo `ID` matches across re-uploads (not by name)
- [ ] Drag-and-drop assignment works between guests and beds
- [ ] Click-to-pick assignment works as alternative to drag-and-drop
- [ ] Dropping on a bed with overlapping cohort opens `OverlapConfirmDialog`; non-overlapping cohorts can share a bed silently
- [ ] Group drop with any conflicting member opens `GroupConflictDialog` (no assignments made)
- [ ] Room configuration changes update assignment interface
- [ ] Can export/import room configurations
- [ ] Undo functionality works for recent assignments
- [ ] Data persists across browser sessions (including View Date in Table View, print sub-tab choice, and per-sub-tab column toggles)
- [ ] Assignment warnings appear for violations (gender, age, bunk type, **date overlap**)
- [ ] Tab switching works between all modes (Table View / Timeline View / Room Configuration / Print / Settings / All Reservations)
- [ ] Timeline view displays guest arrival/departure data
- [ ] Auto-place keeps groups/families together in one room
- [ ] Auto-place respects group placement order from settings
- [ ] Auto-place is date-aware: a March guest can be placed on a bed an April guest already holds
- [ ] Mixed-gender couple splitting works per age threshold setting
- [ ] Same-gender groups prefer gendered rooms over coed
- [ ] Cancelled guests are visually faded with line-through and sort to the bottom of the unassigned list
- [ ] All print sub-tabs (List by Dorm / A-Z / Name Tags / Guestmaster / Work Coordinator / Check-in Slips) skip cancelled guests
- [ ] Check-in Slips: 7 slips per portrait letter page, all uniform height, no inter-slip gap
- [ ] Internal Notes survive CSV re-imports (not overwritten); 📝 icon shows dark-purple dot when present
