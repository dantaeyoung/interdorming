# CSV Status Tracking & Re-Import Diff

## Purpose

Planyo (the upstream reservation system) emits a CSV column for the
reservation `Status`. Existing values include:

- `Reserved + Email address verified + confirmed` — **active**
- `Reserved` — **active**
- `Not completed` — **inactive** (incomplete booking)
- `Cancelled by admin` — **inactive** (cancelled)

Today, Interdorming imports every row regardless of status. That brings
in cancelled and incomplete reservations as if they were real guests.
And when the operator re-uploads a fresh CSV later, the system has no
way to know that someone's reservation got cancelled or that their dates
shifted.

This change adds three things:

1. **Filter on import**: only `Reserved` and
   `Reserved + Email address verified + confirmed` actually create
   guests in the system.
2. **Match by Planyo ID, not name**: the same person can have multiple
   reservations across retreats — `firstName + lastName` is not unique.
   The Planyo `ID` column is the canonical match key. Name is used as
   a fallback when an existing guest pre-dates this feature.
3. **Diff & surface**: on re-upload, detect cancellations and date
   changes versus the current data and surface them in the existing
   import-summary modal.

## Data model

New optional fields on `Guest`:

- `planyoId?: string` — the canonical reservation ID from Planyo. Used
  to match the same reservation across re-uploads.
- `status?: string` — the raw status string from the most recent CSV
  import. Stored as-is (informational).
- `isCancelled?: boolean` — derived from `status`. Set to `true` when
  the status is non-active. Cleared when status returns to active.

## Active-status check

```ts
const ACTIVE_STATUSES = new Set([
  'reserved',
  'reserved + email address verified + confirmed',
])
function isActiveStatus(s?: string): boolean {
  if (!s) return true   // No status column = legacy data, treat as active
  return ACTIVE_STATUSES.has(s.trim().toLowerCase())
}
```

The `s == null` fallback exists so a CSV without a status column still
imports normally — backwards compat for monasteries / sources that don't
expose a status field.

## CSV column mapping

`CSV_FIELD_MAPPINGS` gains:

- `planyoId`: `['ID', 'Reservation ID', 'Reservation #', 'Planyo ID', 'Booking ID', 'Reservation Number']`
- `status`: `['Status', 'Reservation Status']`

## First-time import (Reset & Replace)

Cancelled / not-completed rows are dropped at parse time. The operator
sees a counter ("Imported 38 guests, skipped 4 cancelled / incomplete")
in the existing CSVWarningModal.

## Re-upload (Add & Update) — the main flow

1. Parse the CSV. Keep all rows including non-active ones for the diff.
2. Build a lookup map from existing guests:
   `existingByPlanyoId: Map<planyoId, Guest>`
3. Walk the new CSV rows. For each:
   - Prefer match by `planyoId`. If both old and new have one and they
     match → it's the same reservation.
   - Else fall back to case-insensitive `firstName + lastName`. If
     matched this way, populate the existing guest's `planyoId` from
     the new row (one-time backfill).
4. Compare old vs new for matched pairs:
   - **Cancellation**: was active, is now non-active → flag.
   - **Reactivation**: was cancelled, is now active → silently clear
     the flag (operator can see the row is no longer highlighted).
   - **Date change**: arrival or departure differs → flag.
5. Apply mutations:
   - For active rows: merge fields like today, clear `isCancelled`.
   - For non-active rows where a matched existing guest was previously
     active: KEEP the guest record, set `isCancelled = true`, update
     `status`. **Do NOT auto-unassign their bed** — the operator decides.
   - For non-active rows with no matching existing guest: skip entirely.
   - For new active rows with no matching existing: add as before.
6. Re-detect bed-overlap conflicts (existing logic from Stage 9).
7. Surface a single combined modal with sections:
   - Cancellations (X)
   - Date changes (Y)
   - Bed conflicts (Z) — merges the existing ImportConflictDialog

## Visual indicator for cancelled guests

Cancelled guests stay in the data so the operator can manually decide
what to do. They get visual treatment everywhere they appear:

- **GuestRow** (Guest Data table): row gets a soft red/amber background;
  guest name is rendered with strikethrough; a small "CANCELLED" badge.
- **BedSlot** (Assignment view): the assignment card gets a dashed red
  border; guest name is strikethrough; small "CANCELLED" tag near the
  name. Bed is still considered occupied for conflict detection.
- **Timeline view**: the guest blob gets the same red/dashed treatment.

Once the operator unassigns the cancelled guest manually (or deletes
them), the indicator naturally disappears.

## Modal copy

Single dialog title: "CSV import summary"

Sections (rendered only if non-empty):

```
🚫 N cancellations
   • Alice Cohen  (was 4/10–4/15 in Crystal Sunshine 1)
   • Bob Lee      (was 4/12–4/14 in Heavenly Music 2)

📅 N date changes
   • Carlos Diaz  4/10–4/15 → 4/11–4/15
   • Dana Kim     5/01–5/05 → 5/02–5/05

⚠️  N new bed conflicts (need resolution)
   • Bed MA01: Alice Cohen overlaps Bob Lee
```

Single button: [Got it].

## Out of scope

- Surfacing field changes other than dates (group, age, room
  preference). Could add later.
- "Reactivation" notifications.
- Status history / audit trail.
- Server-side polling for changes.
- Auto-removing cancelled guests after N days.
