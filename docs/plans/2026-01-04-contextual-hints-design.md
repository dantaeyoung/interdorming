# Contextual Hints System Design

## Overview

A context-aware guidance system that shows relevant "next step" hints based on the current state of the application. Designed for infrequent users (1-2x/month) who need workflow guidance without sitting through a formal tutorial.

## Goals

- Help new users understand the workflow without a linear tour
- Help returning users quickly remember what to do next
- Guide users through: Load guests → Configure rooms → Assign beds → Export

## UI Components

### 1. Floating Banner

**Position:** Fixed below header, top of content area

**Behavior:**
- Shows the most relevant hint based on app state
- Subtle background (light blue/purple matching theme)
- Icon + message + optional action button
- Dismiss (X) hides that hint for the session
- Collapses to small "?" icon when dismissed, can re-expand

### 2. Inline Empty States

**Position:** Centered within empty panels/lists

**Behavior:**
- Appears when a section has no data
- Provides direct action buttons (e.g., "Upload CSV" in empty guest list)
- Replaces generic "No data" messages with guided next steps

## State Detection

Priority order (highest priority hint wins):

| Priority | State | Detection |
|----------|-------|-----------|
| 1 | No rooms | `dormitoryStore.dormitories.length === 0` |
| 2 | No guests | `guestStore.guests.length === 0` |
| 3 | No assignments | Guests exist, `assignmentStore.assignments.size === 0` |
| 4 | Has warnings | `validationStore.getAllWarnings` has entries |
| 5 | Partial assignments | Some guests assigned, some not |
| 6 | All assigned | All guests have beds (success state) |

## Hint Content

| State | Icon | Message | Action |
|-------|------|---------|--------|
| No rooms | house | "Set up your dormitories and beds first" | "Go to Room Config" |
| No guests | users | "Upload your guest list to get started" | "Upload CSV" / "Load Sample" |
| No assignments | arrows | "Drag guests onto beds to assign them" | (instructional only) |
| Partial | clipboard | "X of Y guests assigned" | "View unassigned" |
| Has warnings | warning | "X assignments have conflicts" | "Review warnings" |
| All assigned | check | "All guests assigned!" | "Export assignments" |

## Technical Implementation

### New Files

```
src/
  features/
    hints/
      components/
        HintBanner.vue       # Floating banner component
        EmptyState.vue       # Reusable empty state component
        index.ts
      composables/
        useHints.ts          # State detection and hint logic
      types/
        hints.ts             # Hint type definitions
```

### Hint Type Definition

```typescript
interface Hint {
  id: string
  icon: string
  message: string
  action?: {
    label: string
    handler: () => void
  }
  priority: number
}
```

### State Persistence

- `hints.dismissedThisSession: string[]` - hints dismissed (session only, not persisted)
- No localStorage needed - hints should always re-evaluate on fresh visit

## Integration Points

1. **App.vue** - Add `<HintBanner />` below header
2. **GuestList.vue** - Replace empty state with `<EmptyState />`
3. **RoomList.vue** - Replace empty state with `<EmptyState />`
4. **GuestDataView.vue** - Replace empty state with `<EmptyState />`

## Future Enhancements (Not in MVP)

- Formal spotlight tour for feature discovery
- "Don't show hints" toggle in Settings
- Contextual hints within modals
- Animated pointer to relevant UI elements
