# Column Reorder & Hide/Show Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users drag-reorder and toggle visibility of table columns, with independent configs per tab (Guest Data vs Table View), persisted in localStorage.

**Architecture:** Define a `ColumnConfig` array in settingsStore that drives both header and cell rendering via `v-for` loops. Pinned columns (Actions, group-lines) stay outside the loop. A "Columns" dropdown button lets users toggle visibility. Drag-and-drop on `<th>` elements reorders the array.

**Tech Stack:** Vue 3, Pinia (persisted state), HTML5 Drag API, TypeScript

---

### Task 1: Define Column Config Types and DEFAULT_COLUMNS

**Files:**
- Modify: `src/types/Settings.ts`
- Modify: `src/types/index.ts`

**Step 1: Add ColumnConfig interface and DEFAULT_COLUMNS to Settings.ts**

Add after the `CoupleSettings` interface (line 53):

```ts
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

// Table View defaults: hide less-used columns for a compact assignment view
export const DEFAULT_TABLE_VIEW_COLUMNS: ColumnConfig[] = DEFAULT_GUEST_DATA_COLUMNS.map(col => ({
  ...col,
  visible: !['email', 'firstVisit', 'ratePerNight', 'priceQuoted', 'amountPaid', 'creationDate', 'arrivalTime', 'departureMeals', 'accommodationChoice'].includes(col.key),
}))
```

**Step 2: Export new types from index.ts**

Add to the Settings exports in `src/types/index.ts`:

```ts
export type { ColumnConfig } from './Settings'
export { DEFAULT_GUEST_DATA_COLUMNS, DEFAULT_TABLE_VIEW_COLUMNS } from './Settings'
```

**Step 3: Build to verify**

Run: `npm run build`
Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add src/types/Settings.ts src/types/index.ts
git commit -m "feat: add ColumnConfig type and default column definitions"
```

---

### Task 2: Add Column State to settingsStore

**Files:**
- Modify: `src/stores/settingsStore.ts`

**Step 1: Add column config state and migration**

Add imports at top:

```ts
import { DEFAULT_GUEST_DATA_COLUMNS, DEFAULT_TABLE_VIEW_COLUMNS } from '@/types'
import type { ColumnConfig } from '@/types'
```

Add new refs after `const settings = ref<Settings>(...)`:

```ts
const guestDataColumns = ref<ColumnConfig[]>([...DEFAULT_GUEST_DATA_COLUMNS.map(c => ({ ...c }))])
const tableViewColumns = ref<ColumnConfig[]>([...DEFAULT_TABLE_VIEW_COLUMNS.map(c => ({ ...c }))])
```

Add migration function (called on init, merges saved config with defaults):

```ts
function migrateColumns(saved: ColumnConfig[], defaults: ColumnConfig[]): ColumnConfig[] {
  const defaultKeys = new Set(defaults.map(c => c.key))
  const savedKeys = new Set(saved.map(c => c.key))

  // Keep saved columns that still exist in defaults (preserves order + visibility)
  const merged = saved.filter(c => defaultKeys.has(c.key))

  // Append any new default columns not in saved
  for (const def of defaults) {
    if (!savedKeys.has(def.key)) {
      merged.push({ ...def })
    }
  }

  return merged
}
```

Call migration on init (after other migrations):

```ts
guestDataColumns.value = migrateColumns(guestDataColumns.value, DEFAULT_GUEST_DATA_COLUMNS)
tableViewColumns.value = migrateColumns(tableViewColumns.value, DEFAULT_TABLE_VIEW_COLUMNS)
```

Add action functions:

```ts
function setColumnOrder(view: 'guestData' | 'tableView', columns: ColumnConfig[]) {
  if (view === 'guestData') {
    guestDataColumns.value = columns
  } else {
    tableViewColumns.value = columns
  }
}

function toggleColumnVisibility(view: 'guestData' | 'tableView', key: string) {
  const cols = view === 'guestData' ? guestDataColumns.value : tableViewColumns.value
  const col = cols.find(c => c.key === key)
  if (col) col.visible = !col.visible
}

function reorderColumn(view: 'guestData' | 'tableView', fromKey: string, toKey: string) {
  const cols = view === 'guestData' ? guestDataColumns.value : tableViewColumns.value
  const fromIndex = cols.findIndex(c => c.key === fromKey)
  const toIndex = cols.findIndex(c => c.key === toKey)
  if (fromIndex === -1 || toIndex === -1) return

  const [removed] = cols.splice(fromIndex, 1)
  cols.splice(toIndex, 0, removed)
}

function resetColumns(view: 'guestData' | 'tableView') {
  if (view === 'guestData') {
    guestDataColumns.value = [...DEFAULT_GUEST_DATA_COLUMNS.map(c => ({ ...c }))]
  } else {
    tableViewColumns.value = [...DEFAULT_TABLE_VIEW_COLUMNS.map(c => ({ ...c }))]
  }
}
```

Add to return object:

```ts
guestDataColumns,
tableViewColumns,
setColumnOrder,
toggleColumnVisibility,
reorderColumn,
resetColumns,
```

Update persist config to include columns:

```ts
persist: {
  key: 'dormAssignments-settings',
  paths: ['settings', 'guestDataColumns', 'tableViewColumns'],
},
```

**Step 2: Build to verify**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/stores/settingsStore.ts
git commit -m "feat: add column config state with persistence and migration"
```

---

### Task 3: Refactor GuestRow to Data-Driven Columns

**Files:**
- Modify: `src/features/guests/components/GuestRow.vue`

This is the biggest refactor. Replace the 26 hardcoded `<td>` elements (lines 28-121, between the actions cell and the teleport) with a `v-for` loop over `visibleColumns`.

**Step 1: Add columns prop and computed**

Add to Props interface:

```ts
import type { Guest, ColumnConfig } from '@/types'

interface Props {
  guest: Guest
  columns: ColumnConfig[]  // NEW
  familyPosition?: 'none' | 'first' | 'middle' | 'last' | 'only'
  readonly?: boolean
}
```

Add computed:

```ts
const visibleColumns = computed(() => props.columns.filter(c => c.visible))
```

**Step 2: Replace hardcoded cells with v-for loop**

Replace all `<td>` elements between the actions cell and the group-lines-cell with:

```html
    <td class="actions-cell">
      <!-- keep existing actions content unchanged -->
    </td>
    <template v-for="col in visibleColumns" :key="col.key">
      <!-- Special: importOrder -->
      <td v-if="col.key === 'importOrder'" class="order-cell">{{ guest.importOrder || '-' }}</td>

      <!-- Special: housingType badge -->
      <td v-else-if="col.key === 'housingType'">
        <span v-if="guest.housingType" class="badge" :class="isAssignable ? 'badge-housing-assignable' : 'badge-housing-other'">
          {{ guest.housingType }}
        </span>
        <span v-else>-</span>
      </td>

      <!-- Special: firstName with suggestion indicator -->
      <td v-else-if="col.key === 'firstName'">
        <div class="name-cell">
          <span class="name-text">{{ displayName }}</span>
          <span v-if="hasSuggestion" class="suggestion-indicator" title="Has suggested placement">
            ✨
          </span>
        </div>
      </td>

      <!-- Special: gender badge -->
      <td v-else-if="col.key === 'gender'">
        <span class="badge badge-gender" :style="genderBadgeStyle">
          {{ guest.gender }}
        </span>
      </td>

      <!-- Special: lowerBunk badge -->
      <td v-else-if="col.key === 'lowerBunk'">
        <span v-if="guest.lowerBunk" class="badge badge-info">Yes</span>
        <span v-else class="text-muted">No</span>
      </td>

      <!-- Special: groupName with click/hover handlers -->
      <td v-else-if="col.key === 'groupName'"
        class="group-cell"
        :class="{ 'long-group-name': guest.groupName && guest.groupName.length > 15, 'has-group': !!guest.groupName && !readonly }"
        @mouseenter="handleGroupCellMouseEnter"
        @mouseleave="handleGroupCellMouseLeave"
        @click.stop="handleGroupCellClick"
      >
        {{ guest.groupName || '-' }}
      </td>

      <!-- Special: notes with truncation and hover modal -->
      <td v-else-if="col.key === 'notes'" class="notes-cell">
        <span
          v-if="guest.notes"
          ref="notesCellRef"
          class="notes-text"
          @mouseenter="handleNotesMouseEnter"
          @mouseleave="showNotesModal = false"
        >
          {{ truncateNotes(guest.notes) }}
        </span>
        <span v-else>-</span>
      </td>

      <!-- Special: mentalHealth with truncation -->
      <td v-else-if="col.key === 'mentalHealth'" class="notes-cell">
        <span
          v-if="guest.mentalHealth"
          class="notes-text"
          @mouseenter="handleLongTextMouseEnter($event, guest.mentalHealth)"
          @mouseleave="showLongTextModal = false"
        >
          {{ truncateNotes(guest.mentalHealth) }}
        </span>
        <span v-else>-</span>
      </td>

      <!-- Special: physicalHealth with truncation -->
      <td v-else-if="col.key === 'physicalHealth'" class="notes-cell">
        <span
          v-if="guest.physicalHealth"
          class="notes-text"
          @mouseenter="handleLongTextMouseEnter($event, guest.physicalHealth)"
          @mouseleave="showLongTextModal = false"
        >
          {{ truncateNotes(guest.physicalHealth) }}
        </span>
        <span v-else>-</span>
      </td>

      <!-- Special: retreat with min-width -->
      <td v-else-if="col.key === 'retreat'" class="retreat-cell">{{ guest.retreat || '-' }}</td>

      <!-- Default: plain text -->
      <td v-else>{{ (guest as any)[col.key] || '-' }}</td>
    </template>
    <td
      class="group-lines-cell"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <!-- SVG overlay handles group line visualization -->
    </td>
    <td>
      <ValidationWarning v-if="warnings.length > 0" :warnings="warnings" />
    </td>
```

**Step 3: Build to verify**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/features/guests/components/GuestRow.vue
git commit -m "refactor: make GuestRow columns data-driven via v-for"
```

---

### Task 4: Refactor GuestList Headers to Data-Driven

**Files:**
- Modify: `src/features/guests/components/GuestList.vue`

**Step 1: Add columns prop**

Add to Props interface:

```ts
import type { ColumnConfig } from '@/types'

interface Props {
  showAssigned?: boolean
  emptyTitle?: string
  emptyMessage?: string
  readonly?: boolean
  columns: ColumnConfig[]  // NEW
}
```

Add computed:

```ts
const visibleColumns = computed(() => props.columns.filter(c => c.visible))
```

**Step 2: Replace hardcoded headers with v-for loop**

Replace the entire `<thead>` content (lines 6-114) with:

```html
<thead>
  <tr>
    <th>Actions</th>
    <th
      v-for="col in visibleColumns"
      :key="col.key"
      @click="handleSort(col.key as keyof Guest)"
    >
      {{ col.label }}
      <SortIndicator :active="sortColumn === col.key" :direction="sortDirection" />
    </th>
    <th class="group-lines-header"></th>
    <th>Warnings</th>
  </tr>
</thead>
```

**Step 3: Pass columns prop to GuestRow**

Update the GuestRow usage:

```html
<GuestRow
  v-for="(guest, index) in guests"
  :key="guest.id"
  :guest="guest"
  :columns="columns"
  :family-position="getFamilyPosition(guest, index)"
  :readonly="props.readonly"
  @edit="handleEditGuest"
/>
```

**Step 4: Update colspan to be dynamic**

```html
<td :colspan="visibleColumns.length + 3" class="empty-cell">
```

(+3 for Actions, group-lines, Warnings)

**Step 5: Build and test**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/features/guests/components/GuestList.vue
git commit -m "refactor: make GuestList headers data-driven via v-for"
```

---

### Task 5: Wire Up Column Config from Parent Components

**Files:**
- Modify: `src/features/guest-data/components/GuestDataView.vue`
- Modify: `src/App.vue`

**Step 1: Pass guestDataColumns to GuestList in GuestDataView.vue**

At line 65, add the columns prop:

```html
<GuestList
  ref="guestListRef"
  :show-assigned="true"
  :readonly="true"
  :columns="settingsStore.guestDataColumns"
  empty-title="No guests loaded"
  empty-message="Upload a CSV file or load test data to get started."
/>
```

Import settingsStore if not already imported:

```ts
import { useSettingsStore } from '@/stores/settingsStore'
const settingsStore = useSettingsStore()
```

**Step 2: Pass tableViewColumns to GuestList in App.vue**

At line 82, add the columns prop:

```html
<GuestList
  ref="guestListRef"
  :show-assigned="false"
  :columns="settingsStore.tableViewColumns"
  empty-title="No guests loaded"
  empty-message="Upload a CSV file to begin assigning guests to dormitory beds."
/>
```

settingsStore is already imported in App.vue.

**Step 3: Build and test in browser**

Run: `npm run build`
Expected: PASS — table should render identically to before

**Step 4: Commit**

```bash
git add src/features/guest-data/components/GuestDataView.vue src/App.vue
git commit -m "feat: wire column config from settingsStore to GuestList"
```

---

### Task 6: Add Columns Dropdown Button

**Files:**
- Create: `src/features/guests/components/ColumnsDropdown.vue`
- Modify: `src/features/guests/components/GuestList.vue`

**Step 1: Create ColumnsDropdown component**

```vue
<template>
  <div class="columns-dropdown" ref="dropdownRef">
    <button class="btn-columns" @click="isOpen = !isOpen">
      ⊞ Columns
    </button>
    <div v-if="isOpen" class="columns-panel">
      <div class="columns-panel-header">
        <span>Show/Hide Columns</span>
        <button class="btn-reset" @click="$emit('reset')">Reset</button>
      </div>
      <div class="columns-panel-list">
        <label
          v-for="col in columns"
          :key="col.key"
          class="column-toggle"
        >
          <input
            type="checkbox"
            :checked="col.visible"
            @change="$emit('toggle', col.key)"
          />
          {{ col.label }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { ColumnConfig } from '@/types'

interface Props {
  columns: ColumnConfig[]
}

defineProps<Props>()
defineEmits<{
  (e: 'toggle', key: string): void
  (e: 'reset'): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped lang="scss">
.columns-dropdown {
  position: relative;
  display: inline-block;
}

.btn-columns {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: #f3f4f6;
  }
}

.columns-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 4px;
}

.columns-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.85rem;
}

.btn-reset {
  padding: 2px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.75rem;
  color: #6b7280;

  &:hover {
    background: #f3f4f6;
  }
}

.columns-panel-list {
  padding: 8px 0;
}

.column-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background: #f9fafb;
  }

  input[type="checkbox"] {
    cursor: pointer;
  }
}
</style>
```

**Step 2: Add ColumnsDropdown to GuestList.vue**

This component needs to be added next to the Sort button area. The GuestList doesn't currently have a toolbar — the Sort button is rendered by the parent. However, we can emit events up or add the dropdown inline.

Better approach: add it inside GuestList's template, right before the table. Add a small toolbar row:

After the search/controls area and before the `<table>`, or add as a slot. Since GuestList already has the search bar area managed externally, the simplest approach is to add the ColumnsDropdown inside GuestList right before the table, as an internal toolbar:

Import and add inside GuestList template, right after `<div class="table-wrapper" ...>` and before `<table>`:

Actually, simpler: add it as part of the `<thead>` — put a small button row. Or better yet, expose it as part of the GuestList and let the parent place it. 

The cleanest approach: add a named slot in GuestList for toolbar additions, or simply add the ColumnsDropdown inside GuestList since it owns the column config.

Add to GuestList template, just inside the `<div class="guest-list">`, before `<div class="table-wrapper">`:

```html
<div class="column-controls">
  <ColumnsDropdown
    :columns="columns"
    @toggle="handleToggleColumn"
    @reset="handleResetColumns"
  />
</div>
```

Add handlers in script:

```ts
import ColumnsDropdown from './ColumnsDropdown.vue'

function handleToggleColumn(key: string) {
  const view = props.readonly ? 'guestData' : 'tableView'
  settingsStore.toggleColumnVisibility(view, key)
}

function handleResetColumns() {
  const view = props.readonly ? 'guestData' : 'tableView'
  settingsStore.resetColumns(view)
}
```

Note: using `props.readonly` as a proxy for which view we're in — Guest Data uses `readonly=true`, Table View uses `readonly=false`. This is a pragmatic shortcut since we don't want to add another prop just for this. If a third view is added later, add a `viewName` prop.

Add minimal styling:

```scss
.column-controls {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0;
}
```

**Step 3: Export from index.ts if needed**

No export needed — ColumnsDropdown is only used by GuestList.

**Step 4: Build and test in browser**

Run: `npm run build`
Expected: PASS — "Columns" button visible, dropdown toggles work

**Step 5: Commit**

```bash
git add src/features/guests/components/ColumnsDropdown.vue src/features/guests/components/GuestList.vue
git commit -m "feat: add Columns dropdown for toggling column visibility"
```

---

### Task 7: Add Drag-to-Reorder on Column Headers

**Files:**
- Modify: `src/features/guests/components/GuestList.vue`

**Step 1: Add drag state and handlers**

Add refs:

```ts
const draggedColumnKey = ref<string | null>(null)
const dragOverColumnKey = ref<string | null>(null)
```

Add handlers:

```ts
function handleColumnDragStart(event: DragEvent, key: string) {
  draggedColumnKey.value = key
  event.dataTransfer?.setData('text/column-key', key)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleColumnDragOver(event: DragEvent, key: string) {
  // Only accept column drags (not guest drags)
  if (!event.dataTransfer?.types.includes('text/column-key')) return
  event.preventDefault()
  dragOverColumnKey.value = key
}

function handleColumnDragLeave() {
  dragOverColumnKey.value = null
}

function handleColumnDrop(event: DragEvent, toKey: string) {
  event.preventDefault()
  const fromKey = event.dataTransfer?.getData('text/column-key')
  if (fromKey && fromKey !== toKey) {
    const view = props.readonly ? 'guestData' : 'tableView'
    settingsStore.reorderColumn(view, fromKey, toKey)
  }
  draggedColumnKey.value = null
  dragOverColumnKey.value = null
}

function handleColumnDragEnd() {
  draggedColumnKey.value = null
  dragOverColumnKey.value = null
}
```

**Step 2: Add a flag to prevent sort-on-drop**

When a drag ends on a header, the click event also fires (triggering sort). Prevent this:

```ts
const justDropped = ref(false)
```

In `handleColumnDrop`, add:

```ts
justDropped.value = true
setTimeout(() => { justDropped.value = false }, 100)
```

In `handleSort`, add at the top:

```ts
if (justDropped.value) return
```

**Step 3: Update header template with drag attributes**

```html
<th
  v-for="col in visibleColumns"
  :key="col.key"
  :class="{
    'dragging-column': draggedColumnKey === col.key,
    'drag-over-column': dragOverColumnKey === col.key,
  }"
  draggable="true"
  @click="handleSort(col.key as keyof Guest)"
  @dragstart="handleColumnDragStart($event, col.key)"
  @dragover="handleColumnDragOver($event, col.key)"
  @dragleave="handleColumnDragLeave"
  @drop="handleColumnDrop($event, col.key)"
  @dragend="handleColumnDragEnd"
>
  {{ col.label }}
  <SortIndicator :active="sortColumn === col.key" :direction="sortDirection" />
</th>
```

**Step 4: Add CSS for drag states**

```scss
th {
  cursor: grab;

  &.dragging-column {
    opacity: 0.4;
  }

  &.drag-over-column {
    border-left: 3px solid #3b82f6;
  }

  &:active {
    cursor: grabbing;
  }
}
```

**Step 5: Build and test in browser**

Run: `npm run build`
Expected: PASS — drag headers to reorder columns, sort still works on click

**Step 6: Commit**

```bash
git add src/features/guests/components/GuestList.vue
git commit -m "feat: add drag-to-reorder on column headers"
```

---

### Task 8: Final Verification & Cleanup

**Step 1: Full manual test checklist**

- [ ] Guest Data tab shows all columns in default order
- [ ] Table View shows compact default (some columns hidden)
- [ ] Columns dropdown toggles visibility immediately
- [ ] Reset to Default restores original config
- [ ] Drag headers to reorder — columns move
- [ ] Sort still works (click header, indicator shows)
- [ ] Drag doesn't trigger sort
- [ ] Refresh browser — column config persists
- [ ] Upload CSV — new data renders correctly with custom column order
- [ ] Guest Data and Table View have independent configs

**Step 2: Build for production**

Run: `npm run build`
Expected: PASS

**Step 3: Commit any cleanup**

```bash
git add -A
git commit -m "chore: final cleanup for column reorder feature"
```
