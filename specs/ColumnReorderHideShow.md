# Column Reorder & Hide/Show

## Overview

Allow users to drag-and-drop table column headers to reorder them, and toggle column visibility via a "Columns" dropdown button. Each tab (Guest Data, Table View) maintains its own independent column configuration, persisted in localStorage via settingsStore.

## Data Model

### ColumnConfig

```ts
interface ColumnConfig {
  key: string       // e.g. 'firstName', 'housingType'
  label: string     // e.g. 'Name', 'Housing'
  visible: boolean
}
```

### settingsStore additions

```ts
guestDataColumns: ColumnConfig[]   // Guest Data tab column config
tableViewColumns: ColumnConfig[]   // Table View tab column config
```

A `DEFAULT_COLUMNS` constant defines the full ordered list with default visibility. Array order = display order.

### Pinned columns

Actions and group-lines-cell are pinned — always visible, not hideable, not draggable. They stay fixed on the left outside the dynamic column loop.

## Refactoring GuestRow and GuestList

### GuestList.vue

Receives column config as a prop. Headers render via loop:

```html
<th v-for="col in visibleColumns" :key="col.key"
    draggable="true" @dragstart="..." @dragover="..." @drop="...">
  {{ col.label }}
</th>
```

### GuestRow.vue

Receives the same column config. Cells render via loop with special-case handling:

```html
<td v-for="col in visibleColumns" :key="col.key">
  <template v-if="col.key === 'housingType'"><!-- badge rendering --></template>
  <template v-else-if="col.key === 'gender'"><!-- gender badge --></template>
  <!-- ~4 more special cases (lowerBunk, group, notes, health fields) -->
  <template v-else>{{ guest[col.key] || '-' }}</template>
</td>
```

~6 columns have special rendering (badges, modals, click handlers). The other ~22 are plain text with a default renderer.

### Parent components

GuestDataView passes `guestDataColumns` from settingsStore (with `readonly=true`).
The assignment Table View passes `tableViewColumns` (with `readonly=false`).

## Columns Button & Dropdown

A "Columns" button sits next to the existing Sort button. Clicking opens a dropdown panel with:

- Checklist of all non-pinned columns with toggles (checkbox + label)
- Columns listed in their current display order
- "Reset to Default" link at the bottom
- Toggling a checkbox immediately updates the table (no apply/cancel)
- Dropdown closes when clicking outside

## Drag-to-Reorder on Headers

1. **Drag start**: Header gets `dragging-column` class (opacity reduction). Column key stored in `dataTransfer` with type `text/column-key`.
2. **Drag over**: Left border highlight on target header shows insertion point.
3. **Drop**: Column config array is spliced — remove from old position, insert at new position. settingsStore persists immediately.
4. **Pinned columns** are not draggable and don't accept drops.
5. **No conflict** with guest row drag — different `dataTransfer` types and different DOM elements (`<th>` vs `<tr>`).
6. **Cursor**: `grab` on draggable headers, `grabbing` during drag.

## Persistence & Migration

Column configs persist in settingsStore via `pinia-plugin-persistedstate`.

**First load**: No saved config → use `DEFAULT_COLUMNS` (all visible, default order).

**Forward compatibility**: On store init, merge saved config with `DEFAULT_COLUMNS`:
- Saved columns retain their order and visibility
- New columns (in defaults but not in saved) are appended at the end with `visible: true`
- Removed columns (in saved but not in defaults) are silently dropped

No explicit migration step needed — the merge handles it.

## Implementation Notes

- Work on the `development` branch
- The `colspan` on the empty-state row should use `visibleColumns.length + pinnedColumnCount` instead of a hardcoded number
- Sort functionality continues to work — clicking a header still sorts, dragging reorders. The sort click handler should check that the drag didn't just end (use a small flag/timeout to prevent sort-on-drop).
