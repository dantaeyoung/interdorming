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
The application operates across multiple tabs:
- **Guest Data**: CSV import, guest table, data management
- **Assignment**: Drag-and-drop / click-to-pick interface for assigning guests to beds
- **Timeline**: Visual timeline of guest arrivals/departures
- **Configuration**: Dormitory and room layout management
- **Print**: Print-friendly view of assignments

### Data Model Hierarchy
```
Dormitories (top level) → Rooms → Beds → Guest Assignments
```

### State Management (Pinia Stores)
- **`guestStore`**: Guest data from CSV import
- **`dormitoryStore`**: Dormitory/room/bed configuration
- **`assignmentStore`**: Guest-to-bed assignments, undo/redo history, swaps
- **`settingsStore`**: User preferences (warnings, display, gender colors, auto-placement, group placement order, couple splitting)
- **`validationStore`**: Computed validation warnings for assignments
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

### Drag-and-Drop + Click-to-Pick (`src/features/assignments/composables/useDragDrop.ts`)
- Singleton shared state for drag tracking across components
- Native HTML5 drag-and-drop API with custom drag image
- Click-to-pick alternative: pick a guest, then click a bed to place (Escape to cancel)
- Supports swap when dropping on occupied bed

### Validation (`src/stores/validationStore.ts`)
Non-blocking visual warnings for:
- Gender mismatches (male in female room)
- Bunk accessibility violations (upper bunk for lower-bunk-required guests)
- Family separation (same GroupName in different rooms)
- Age compatibility issues (large age gaps, minors with adults)

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
A version tag (e.g., `v260225-16:45`) is displayed in the header for deployment verification. Update it in `App.vue` when deploying.

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

Key fields for auto-placement: `groupName` (shared group ID), `indivGrp` ("individual"/"group"/"family/friends"), `gender`, `age`, `lowerBunk`.

See `CSV_FIELD_MAPPINGS` in `src/types/Constants.ts` for all recognized variations.

### Room Configuration CSV
Required: `Dormitory Name`
Optional: `Room Name`, `Room Gender`, `Bed ID`, `Bed Type`, `Bed Position`, `Active`

## Validation Checklist
After making changes, verify:
- [ ] Can upload guest CSV files with various column names (including with preamble lines)
- [ ] Drag-and-drop assignment works between guests and beds
- [ ] Click-to-pick assignment works as alternative to drag-and-drop
- [ ] Room configuration changes update assignment interface
- [ ] Can export/import room configurations
- [ ] Undo functionality works for recent assignments
- [ ] Data persists across browser sessions
- [ ] Assignment warnings appear for violations (gender, age, bunk type)
- [ ] Tab switching works between all modes
- [ ] Timeline view displays guest arrival/departure data
- [ ] Auto-place keeps groups/families together in one room
- [ ] Auto-place respects group placement order from settings
- [ ] Mixed-gender couple splitting works per age threshold setting
- [ ] Same-gender groups prefer gendered rooms over coed
