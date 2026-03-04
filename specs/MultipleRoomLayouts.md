# Spec: Multiple Room Configuration Layouts

**Status:** Draft
**Date:** 2026-03-04

## Purpose & User Problem

The monastery's dormitory layout isn't static — rooms may be reconfigured depending on the retreat type, season, or group size. For example:
- **Summer Mode**: All beds open, co-ed flexible
- **Winter Mode**: Some buildings closed, fewer beds active
- **Big Retreat**: Every available bed activated
- **Women's Only**: Gender-restricted layout

Currently there's a single room configuration. Staff must manually reconfigure rooms each time, or export/import CSV files. This feature adds **named layout presets** that can be created, saved, switched between, and exported/imported together.

## Current State

- `dormitoryStore` holds a single `dormitories: Dormitory[]` array and a `configName: string`
- Persisted to localStorage under key `dormAssignments-dormitories`
- CSV export flattens one layout to rows, with `# Config: {name}` header
- Assignments (`assignmentStore`) map `guestId → bedId` where bedId comes from the active layout
- There's already a `configName` text input in the Room Configuration tab

## Proposed Data Model

### Layout Type
```typescript
interface RoomLayout {
  id: string              // UUID
  name: string            // e.g., "Summer Mode"
  description: string     // Optional notes
  dormitories: Dormitory[] // Full dormitory/room/bed structure
  createdAt: string       // ISO date
  updatedAt: string       // ISO date
}
```

### Store Changes (dormitoryStore)
```typescript
// New state
layouts: RoomLayout[]           // All saved layouts
activeLayoutId: string | null   // Which layout is currently loaded

// Existing (unchanged)
dormitories: Dormitory[]        // The currently active layout's data (working copy)
configName: string              // Replaced by layout.name in the UI
```

The `dormitories` ref remains the "working copy" that the rest of the app reads from. Switching layouts swaps what's in `dormitories`.

### Persistence
```typescript
persist: {
  key: 'dormAssignments-dormitories',
  paths: ['dormitories', 'layouts', 'activeLayoutId'],
}
```

## UI Design

### Layout Selector (Room Configuration tab header)

Above the existing config UI, add a layout management bar:

```
┌─────────────────────────────────────────────────────────┐
│  Layout: [Summer Mode ▾]  [+ New] [Delete]              │
│  Description: All buildings open for summer retreats     │
├─────────────────────────────────────────────────────────┤
│  (existing dormitory/room/bed configuration below)       │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- **Dropdown selector**: Shows all layout names, switches on select
- **"+ New" button**: Creates a new layout (see flow below)
- **"Delete" button**: Deletes the active layout (with confirmation modal)
- **Name field**: Editable text input (replaces existing `configName`), auto-saves
- **Description field**: Optional single-line input, auto-saves

### Creating a New Layout

When user clicks "+ New":
1. Modal/dialog appears with:
   - Name input (required)
   - Description input (optional)
   - Starting point: **"Blank"** or **"Clone from: [dropdown]"**
2. On confirm, new layout is created and becomes active
3. If cloned, copies the source layout's dormitories
4. If blank, starts with empty dormitories array

### Switching Layouts

When user selects a different layout from the dropdown:
1. **Auto-save** the current layout's dormitory state first
2. Load the selected layout's dormitories into the working `dormitories` ref
3. **Clear all guest assignments** (assignments are not layout-aware)
4. Show a brief status message: "Switched to [Layout Name]"

> **Decision:** Assignments are cleared on layout switch. A warning modal confirms: "Switching layouts will clear all current guest assignments. Continue?"

### Deleting a Layout

When user clicks "Delete":
1. Confirmation modal: "Delete layout '[Name]'? This cannot be undone."
2. If it's the only layout, prevent deletion ("Cannot delete the last layout")
3. On confirm, delete and switch to another layout
4. Clear assignments

### Auto-Save Behavior

- Changes to dormitories auto-save to the active layout (debounced, e.g., 500ms after last change)
- No explicit "Save" button needed — saves are automatic and silent

## Export/Import

### Export Format

Switch from CSV to **JSON** for multi-layout export (CSV is awkward for nested multi-config data):

```json
{
  "version": 1,
  "exportedAt": "2026-03-04T16:00:00Z",
  "layouts": [
    {
      "id": "...",
      "name": "Summer Mode",
      "description": "All buildings open",
      "dormitories": [ ... ]
    },
    {
      "id": "...",
      "name": "Winter Mode",
      "description": "North wing closed",
      "dormitories": [ ... ]
    }
  ]
}
```

### Export Options
- **Export All Layouts** (default): Exports the full JSON with all layouts
- **Export Current Layout Only**: Exports just the active layout (still JSON, single-item array)
- **Legacy CSV Export**: Keep existing CSV export for single-layout compatibility

### Import Behavior
- **JSON import**: Detects `.json` file, offers to:
  - **Replace all layouts** with imported ones
  - **Merge/add** imported layouts alongside existing ones (skip duplicates by name, or rename)
- **CSV import**: Backwards-compatible, imports as a single new layout named from the `# Config:` header
- Confirmation dialog before replacing existing data

## Migration Strategy

For users with existing data (single layout in localStorage):

1. On first load after update, detect old format (no `layouts` array)
2. Auto-create a single layout from existing `dormitories` and `configName`
3. Set it as the active layout
4. Transparent to the user — their data is preserved

## Scope

### In Scope
- Layout CRUD (create, read, update, delete) in dormitoryStore
- Layout selector UI in Room Configuration tab
- Auto-save working copy to active layout
- Clear assignments on layout switch (with confirmation)
- JSON export/import for multiple layouts
- Legacy CSV import compatibility
- Data migration from single-layout format
- Confirmation dialogs for destructive actions

### Out of Scope (Future)
- Per-layout guest assignments (storing assignments within each layout)
- Layout diffing / comparison view
- Layout templates (pre-built starting configurations)
- Undo/redo for layout operations
- Layout sharing between users (beyond file export)

## Technical Considerations

### Affected Files
- **`dormitoryStore.ts`** — New `layouts` and `activeLayoutId` state, switch/save/delete actions
- **`ConfigRoomList.vue`** — Layout selector bar, name/description fields
- **`RoomConfigCSV.vue`** — JSON export/import, keep CSV for backwards compat
- **`assignmentStore.ts`** — Clear assignments on layout switch
- **`types/`** — New `RoomLayout` interface
- **`App.vue`** — May need to show active layout name in header

### Performance
- Each layout is a full copy of the dormitories array (typically small, <100 beds)
- No layout limit — localStorage can handle many layouts (~5MB limit, each layout is ~5-20KB)
- Debounced auto-save prevents excessive writes

### Data Safety
- Never delete the last layout
- Confirmation dialogs for delete and switch (when assignments exist)
- Migration preserves existing data seamlessly

## Success Criteria

- [ ] Can create a new layout (blank or cloned from existing)
- [ ] Can name and describe each layout
- [ ] Can switch between layouts via dropdown
- [ ] Switching clears assignments with confirmation
- [ ] Can delete a layout (except the last one) with confirmation
- [ ] Changes auto-save to the active layout
- [ ] JSON export includes all layouts
- [ ] JSON import can replace or merge layouts
- [ ] CSV import creates a new layout (backwards compatible)
- [ ] Existing single-layout data migrates automatically
- [ ] Layout selector is visible and intuitive in Room Configuration tab
