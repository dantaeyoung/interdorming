# Vue 3 Refactor Specification

## Purpose & User Problem

**Current State:**
- Vanilla JavaScript application (~1,900 lines in single `app.js` file)
- Manual DOM manipulation and event handling
- No component structure or build tooling
- Basic localStorage persistence

**Why Refactor to Vue 3:**
- Developer familiarity: User knows Vue ecosystem
- Improved maintainability: Component-based architecture vs 1,900-line monolith
- Better developer experience: Hot module replacement, reactive state management
- Type safety: TypeScript integration for safer refactoring
- Modern tooling: Vite for faster development
- Scalability: Easier to add features in the future

**User Benefits:**
- Same functionality, better code organization
- Improved performance with Vue's reactivity system
- Easier future enhancements and bug fixes
- Better debugging with Vue DevTools

---

## Success Criteria

The refactored application must:
- [ ] Maintain 100% feature parity with current vanilla JS version
- [ ] Preserve all existing CSV import/export functionality
- [ ] Maintain localStorage compatibility (keep v2.0 data structure)
- [ ] Support all current validation warnings (gender, bunk, family, age)
- [ ] Provide same drag-and-drop assignment experience
- [ ] Keep existing visual design and styles
- [ ] Preserve undo/redo functionality (10-action limit)
- [ ] Support same browser compatibility (modern Chrome, Firefox, Safari, Edge)
- [ ] Remain client-side only (no backend dependencies)
- [ ] Successfully migrate existing localStorage data on first load

---

## Technical Stack

### Build Tooling
**✅ Vite** - Fast, modern build tool optimized for Vue 3

### State Management
**✅ Pinia** - Official Vue state management
- Handles complex interconnected state (guests, assignments, dormitories, rooms, beds)
- Excellent DevTools integration with time-travel debugging
- Plugin support for localStorage persistence (`pinia-plugin-persistedstate`)
- Centralized location for validation getters
- TypeScript support out of the box

### Component Library
**✅ None** - Build custom components matching existing design

### CSS Approach
**✅ SCSS with scoped styles**
- All `<style>` blocks will use `scoped` attribute
- SCSS for nested selectors and variables
- Maintain existing visual design from vanilla version

### TypeScript
**✅ Yes** - TypeScript for type safety
- Helps ensure complete migration of features
- Type definitions for Guest, Room, Dormitory, Bed, Assignment models
- Better IDE support and autocomplete
- Catches bugs at compile time

### Testing Infrastructure
**✅ Vitest setup** - Infrastructure only, tests written later as needed

### Project Directory Structure
**✅ Feature-based organization:**
```
src/
├── features/
│   ├── guests/          # Guest management
│   ├── dormitories/     # Dormitory/room/bed management
│   ├── assignments/     # Assignment logic & drag-drop
│   └── csv/             # CSV import/export
├── stores/              # Pinia stores
├── shared/              # Shared components & composables
├── assets/              # Styles, images
├── types/               # Shared TypeScript types
└── App.vue              # Root component
```

---

## Component Architecture

### Component Breakdown

**Root:**
- `App.vue` - Root component with tab navigation, global styles

**Assignment Feature (`/features/assignments/`):**
- `AssignmentTab.vue` - Main container for assignment mode
- `GuestList.vue` - Unassigned guests panel with search/filter
- `DormitoryView.vue` - Visual dormitory/room/bed layout
- `RoomCard.vue` - Individual room display with validation warnings
- `BedSlot.vue` - Draggable bed component (accepts guest drops)
- `GuestCard.vue` - Draggable guest card
- `AssignmentControls.vue` - Undo/redo, clear all, auto-assign buttons

**Dormitory/Room Feature (`/features/dormitories/`):**
- `RoomConfigTab.vue` - Main container for configuration mode
- `DormitoryList.vue` - List/manage dormitories
- `DormitoryEditor.vue` - Add/edit dormitory modal
- `RoomList.vue` - Rooms within a dormitory
- `RoomEditor.vue` - Add/edit room form/modal
- `BedEditor.vue` - Manage beds within a room

**Guest Feature (`/features/guests/`):**
- `GuestTable.vue` - Table view of all guests
- `GuestEditor.vue` - Edit guest details modal

**CSV Feature (`/features/csv/`):**
- `CSVImportButton.vue` - Generic CSV file upload handler
- `CSVExportButton.vue` - Generic CSV download handler
- `GuestCSVImport.vue` - Guest-specific import logic
- `RoomConfigCSVImport.vue` - Room config import logic
- `RoomConfigCSVExport.vue` - Room config export logic

**Shared Components (`/shared/components/`):**
- `Modal.vue` - Reusable modal dialog wrapper
- `ValidationWarning.vue` - Warning badge/tooltip component
- `ConfirmDialog.vue` - Confirmation dialog for destructive actions
- `TabNavigation.vue` - Tab switching component

### Pinia Stores (`/stores/`)

**`guestStore.ts`:**
- State: `guests[]` array
- Actions: `addGuest()`, `updateGuest()`, `deleteGuest()`, `importFromCSV()`
- Getters: `getGuestById()`, `unassignedGuests`, `guestsByGroup`

**`dormitoryStore.ts`:**
- State: `dormitories[]` array
- Actions: `addDormitory()`, `updateDormitory()`, `deleteDormitory()`, `addRoom()`, `updateRoom()`, `deleteRoom()`, `addBed()`, `deleteBed()`
- Getters: `getAllRooms()`, `getAllBeds()`, `getBedById()`, `roomsByDormitory`

**`assignmentStore.ts`:**
- State: `assignments` Map (guestId → bedId), `history[]` array
- Actions: `assignGuest()`, `unassignGuest()`, `undo()`, `redo()`, `clearHistory()`, `autoAssign()`
- Getters: `getAssignmentByGuest()`, `getAssignmentByBed()`, `canUndo`, `canRedo`

**`validationStore.ts`:**
- No state (uses other stores via composition)
- Getters: `getWarningsForBed()`, `getWarningsForGuest()`, `getAllWarnings()`
- Validation logic: gender mismatches, bunk violations, family separation, age compatibility

### Composables

**`/shared/composables/useLocalStorage.ts`:**
- `loadFromLocalStorage()` - Load and migrate v2.0 data
- `saveToLocalStorage()` - Persist state
- `clearLocalStorage()` - Clear all data

**`/features/assignments/composables/useDragDrop.ts`:**
- `useDraggableGuest()` - Guest drag logic
- `useDroppableBed()` - Bed drop zone logic
- Handles drag events, visual feedback

**`/features/csv/composables/useCSV.ts`:**
- `parseCSV(file)` - Parse CSV file to objects
- `generateCSV(data)` - Convert objects to CSV string
- `downloadCSV(content, filename)` - Trigger download
- `mapColumns(headers)` - Handle column name variations

**`/features/dormitories/composables/useBedIdGenerator.ts`:**
- `generateUniqueBedId(roomName, existingIds)` - Create unique bed IDs

---

## Migration Strategy

### Important: Preserve Original Files
**⚠️ Do NOT overwrite existing files during refactor**
- Move existing `index.html`, `app.js`, `styles.css` to `/OLD` directory
- Keep original files as reference during migration
- Allows side-by-side comparison and validation
- Original files remain accessible for porting logic

### Phase 1: Project Setup
- [ ] Create `/OLD` directory and move existing vanilla JS files there
- [ ] Initialize Vue 3 + Vite + TypeScript project
- [ ] Set up feature-based directory structure
- [ ] Configure linting/formatting (ESLint, Prettier)
- [ ] Install dependencies (Vue 3, Pinia, SCSS, Vitest)
- [ ] Configure `pinia-plugin-persistedstate`

### Phase 2: TypeScript Types & Data Models
- [ ] Create TypeScript interfaces in `/types` (`Guest.ts`, `Dormitory.ts`, `Room.ts`, `Bed.ts`, `Assignment.ts`)
- [ ] Port field mappings and CSV column variations
- [ ] Define validation warning types

### Phase 3: Pinia Stores
- [ ] Create `guestStore.ts` - port guest management logic from app.js
- [ ] Create `dormitoryStore.ts` - port dormitory/room/bed logic
- [ ] Create `assignmentStore.ts` - port assignment logic and history
- [ ] Create `validationStore.ts` - port validation rules
- [ ] Implement localStorage persistence with plugin
- [ ] Test data migration from v2.0 format

### Phase 4: Composables & Utilities
- [ ] `useLocalStorage.ts` - localStorage operations
- [ ] `useCSV.ts` - CSV parsing/generation logic from app.js
- [ ] `useDragDrop.ts` - Drag-and-drop event handlers
- [ ] `useBedIdGenerator.ts` - Bed ID generation logic

### Phase 5: Shared Components
- [ ] `Modal.vue` - Extract modal logic from index.html
- [ ] `ValidationWarning.vue` - Warning display component
- [ ] `ConfirmDialog.vue` - Confirmation dialogs
- [ ] `TabNavigation.vue` - Tab switching component

### Phase 6: CSV Feature
- [ ] `CSVImportButton.vue` - Generic upload handler
- [ ] `CSVExportButton.vue` - Generic download handler
- [ ] `GuestCSVImport.vue` - Guest import with column mapping
- [ ] `RoomConfigCSVExport.vue` - Room config export
- [ ] Test various CSV column name variations

### Phase 7: Guest Feature
- [ ] `GuestTable.vue` - Port guest table from index.html
- [ ] `GuestEditor.vue` - Guest editing modal

### Phase 8: Dormitory/Room Feature
- [ ] `RoomConfigTab.vue` - Main config tab container
- [ ] `DormitoryList.vue` & `DormitoryEditor.vue`
- [ ] `RoomList.vue` & `RoomEditor.vue`
- [ ] `BedEditor.vue` - Bed management
- [ ] Port all room configuration logic

### Phase 9: Assignment Feature
- [ ] `AssignmentTab.vue` - Main assignment tab
- [ ] `GuestList.vue` - Unassigned guests panel with search
- [ ] `DormitoryView.vue` - Visual layout
- [ ] `RoomCard.vue` - Individual room display
- [ ] `BedSlot.vue` - Draggable bed (drop target)
- [ ] `GuestCard.vue` - Draggable guest card
- [ ] `AssignmentControls.vue` - Undo/redo/auto-assign
- [ ] Implement drag-and-drop functionality
- [ ] Port auto-assignment algorithm

### Phase 10: Root App
- [ ] `App.vue` - Tab navigation, global layout
- [ ] Port global styles from styles.css to SCSS
- [ ] Wire up all routes/tabs

### Phase 11: Testing & Validation
- [ ] Test guest CSV import with various column formats
- [ ] Test room config CSV import/export
- [ ] Test drag-and-drop assignment
- [ ] Test all validation warnings appear correctly
- [ ] Test undo/redo functionality
- [ ] Test localStorage persistence across sessions
- [ ] Test with sample_room_config.csv
- [ ] Browser compatibility testing

### Phase 12: Polish & Deployment
- [ ] Build optimization (Vite production build)
- [ ] Update documentation (README, CLAUDE.md)
- [ ] Create deployment instructions
- [ ] Final validation checklist

---

## Scope & Constraints

### In Scope
- Complete rewrite using Vue 3 with `<script setup>` syntax and TypeScript
- All components using scoped SCSS styles
- 100% feature parity with existing vanilla JS application
- Data backward compatibility (localStorage v2.0 format)
- Move original files to `/OLD` directory for reference
- Maintain existing visual design and user experience
- Client-side-only architecture (no backend)

### Constraints
- Must remain a static, client-side-only application
- Must maintain localStorage v2.0 data structure for backward compatibility
- Must support same CSV formats with flexible column mapping
- Must work in same browsers (modern Chrome, Firefox, Safari, Edge)
- Cannot add new features - pure migration only
- Must preserve all validation logic exactly as-is
- Must maintain undo/redo with 10-action limit

---

## Out of Scope

**Explicitly NOT included in this refactor:**
- Backend/server implementation
- Database integration
- User authentication/authorization
- Multi-user/real-time collaboration
- Mobile app versions (native or PWA)
- New features or functionality beyond what exists
- UI/UX redesign (keep existing design)
- Accessibility improvements (maintain current level)
- Internationalization/localization
- Advanced testing suite (infrastructure only)

---

## Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vue 3 | User familiarity, excellent DX |
| Build Tool | Vite | Fast, modern, optimized for Vue |
| Language | TypeScript | Type safety during migration |
| State Mgmt | Pinia | Complex state, DevTools, persistence plugins |
| Styling | SCSS (scoped) | Nested selectors, maintain current design |
| Components | Custom | Match existing design exactly |
| Structure | Feature-based | Clear domain separation |
| Testing | Vitest (setup only) | Infrastructure for future tests |
| Persistence | pinia-plugin-persistedstate | Automatic localStorage sync |

---

## Migration Approach

**Strategy:** Incremental feature-by-feature migration
1. Move old files to `/OLD` for reference
2. Build foundation: types → stores → composables
3. Build UI: shared components → features → root app
4. Test thoroughly with existing data
5. Deploy as replacement

**Reference:** Original files in `/OLD` directory remain accessible throughout

---

## Success Definition

Refactor is complete when:
- ✅ All features from vanilla version work identically
- ✅ Existing localStorage data loads and works
- ✅ All CSV imports/exports function with column variations
- ✅ Drag-and-drop assignment feels the same
- ✅ All validation warnings appear correctly
- ✅ Undo/redo works with 10-action history
- ✅ Visual design matches original
- ✅ Production build deploys as static site

---

## Next Steps

**When user types "GO!":**
1. Begin Phase 1: Move files to `/OLD`, initialize Vite project
2. Set up TypeScript types and Pinia stores
3. Build composables and shared components
4. Implement feature components (CSV → Guests → Dormitories → Assignments)
5. Wire up root App.vue
6. Test thoroughly against success criteria
7. Update documentation

---

**Spec Status:** COMPLETE - Ready for approval
**Created:** 2025-12-01
**Last Updated:** 2025-12-01
**Branch:** `vue3-refactor`
