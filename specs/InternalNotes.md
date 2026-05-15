# Internal Notes (Operator-Created)

## Purpose

Add a second notes field on each guest, distinct from the existing CSV-
imported `notes` column. The CSV field reflects what was sent by the
upstream system (Planyo); the internal field is for the operator's own
running observations — things the CSV doesn't carry, things they want to
remember between sessions, scratchpad context.

CSV re-imports overwrite the CSV field but never touch the internal
field. The two coexist visibly.

## Data model

- New optional field on `Guest`: `internalNotes?: string`.
- Stored in the same Pinia guest store and persisted to localStorage.
- NOT present in CSV import / export round-trips — purely an in-app
  field.

## Editing

- Added to `GuestFormModal` as a textarea, placed directly below the
  existing "Notes" textarea.
- Labeled "Internal Notes" with a sub-hint "Operator-only — not from CSV".
- Saved as part of the same Save flow (no separate persist step).
- Surfaces in unsaved-changes detection.

## Surfacing

- **BedSlot** (Assignment view): the existing 📝 icon's hover popover
  shows BOTH notes when present, with section headers ("From CSV" /
  "Internal"). A bed slot is considered to "have notes" if either field
  has content. The icon visually indicates internal notes exist via a
  small pin badge.
- **Guest Data table**: a new optional column (`internalNotes`),
  toggleable from the columns dropdown. Off by default.

## CSV merge

- The existing Add & Update flow already merges only non-empty fields
  from the incoming CSV onto existing guests. Since CSV never carries
  `internalNotes`, the field is preserved automatically — no extra
  handling needed.

## Out of scope

- Per-assignment notes (notes tied to a specific bed assignment, not
  the guest record). Already tracked as issue #11.
- Markdown / rich-text editing.
- Notes history / audit trail.
