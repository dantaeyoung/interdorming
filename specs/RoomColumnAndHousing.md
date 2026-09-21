# Room Column & Derived Housing Category

## Purpose

A newer registration CSV export carries a `Room` column, where guests
pick their own accommodation — a specific dorm bed, a camping category,
a canvas tent, and so on. The existing `Housing type` column is often
blank on exactly those rows, because the two columns are alternatives
rather than companions.

Today a blank `Housing type` means "assignable" (`guestStore.ts:175`),
so a guest who chose `CampingCouples` currently shows up in the
unassigned list demanding a dorm bed. This is a live data bug, not a
hypothetical one.

Two goals:

1. Import `Room` as a first-class guest field, surfaced in the UI.
2. Guarantee `Housing` is always populated, deriving it from `Room`
   when the CSV leaves it blank.

Bed-level matching (turning `- bed 7` into an actual bed assignment) is
explicitly **out of scope** — see the final section.

## Observed data

From `BIPOC 2026 Registrations Rooming …_ANON.csv` (14 data rows, 11
with a `Room` value). Five distinct shapes:

| Shape | Examples | Count |
|---|---|---|
| Dorm room + bed | `CrystalSunshine Rm 1 ( female only) - bed 7`<br>`CrystalSunshine Rm 2 ( female only) - bed 2L`<br>`FlameBlossom Rm 1 ( female only) - bed 6` | 3 |
| Canvas tent + bed | `Canvas Tent3-bed2`, `Canvas Tent3-bed1`, `Canvas Tent1-bed1` | 3 |
| RV + number | `RV Daffodil-1`, `RV Daffodil-2` | 2 |
| Camping category | `CampingMen`, `CampingCouples` | 2 |
| Blank | — | 3 |

A second sample (`…_ANON_v2.csv`, 23 rows) adds shapes the first lacked
and all parse correctly: a bare `Commuter`; the no-space-before-dash
variant `FlameBlossom Rm 00 ( female only)- bed 2S`; `( male only)` and
`(mixed/ group)` annotations; and `,Camping` — the leading-comma form
described under *Normalizing an existing Housing value*.

Critically: **every row with a `Room` value has a blank `Housing type`**
(the raw cell is `","`, a Planyo multi-select artifact that cleans to
empty). Every row with a populated `Housing type` (`Dorm,`, `Camping,`)
has a blank `Room`.

## Data model

New optional field on `Guest`:

```ts
/**
 * Raw accommodation choice from the registration CSV's `Room` column.
 * Free text — may name a dorm room and bed, a camping category, or a
 * tent. Used to derive `housingType` when the CSV leaves it blank.
 */
roomRequest?: string
```

Named `roomRequest`, not `room`, deliberately: in a bed-assignment app
`guest.room` reads as "the room they are assigned to", which is derived
from the bed and would be actively misleading. The **UI label is
"Room"** to match the CSV and what operators say.

CSV mapping added to `CSV_FIELD_MAPPINGS`:

```ts
roomRequest: ['roomRequest', 'Room', 'ROOM', 'room', 'Room Assignment'],
```

## Housing categories

The canonical set becomes four values:

- `Dorm`
- `Camping`
- `Commuter`
- `Canvas Tent`

`Constants.ts` gains an exported canonical list so the form select, the
derivation, and the assignability check all read from one place rather
than repeating string literals.

### Assignability

```ts
export const NON_ASSIGNABLE_HOUSING_TYPES = ['camping', 'commuter', 'canvas tent']
```

`Dorm` is the only assignable category. Canvas Tent is **label-only** —
tent occupants are excluded from the bed list even though the CSV names
tent beds (`Canvas Tent1-bed1`). Managing tent beds as real beds is out
of scope.

## Derivation rules

Applied to `Room` only when the row's `Housing type` is blank. Matching
is case-insensitive against the value with internal whitespace collapsed
and surrounding whitespace trimmed. **First match wins**, so order
matters:

| # | Pattern | → Housing | Matches |
|---|---|---|---|
| 1 | `/^comm+uter/` | `Commuter` | `Commuter`, `Commmuter` (tolerates the doubled-m typo seen in practice) |
| 2 | `/^camping/` | `Camping` | `CampingMen`, `CampingWomen`, `CampingCouples`, bare `Camping` |
| 3 | `/^canvas\s*tent/` | `Canvas Tent` | `Canvas Tent1-bed1`, `CanvasTent3-bed2` |
| 4 | *(anything else non-empty)* | `Dorm` | `CrystalSunshine Rm 1 …`, `RV Daffodil-1`, unrecognized room names |

Rule 4 is a deliberate catch-all: an unrecognized `Room` string means
the guest picked *something*, and the safe default is that they need a
bed and will therefore be visible to the operator. Failing toward
"visible in the unassigned list" beats failing toward "silently
disappears".

### Both columns blank

Set `Housing` to `Dorm`. This preserves today's behavior exactly —
`guestStore.ts:175` already treats a blank `housingType` as assignable —
while satisfying the "always filled in" requirement. It does write a
value the CSV did not contain; see Decisions.

### Normalizing an existing Housing value

When `Housing type` is non-blank, it is still normalized: strip Planyo's
multi-select commas, trim, then case-insensitively map to the canonical
casing (`camping` → `Camping`). A value that matches none of the four
canonical categories is preserved verbatim rather than forced into a
bucket — this protects legacy values like `BCM-RV`.

Planyo encodes the *empty* slots of a multi-select as commas, and which
side they land on depends on which slot was filled:

| Raw cell | Meaning |
|---|---|
| `,` | nothing chosen |
| `Dorm,` | first slot set |
| `,Camping` | second slot set |

So commas are stripped from **both** ends. This is not cosmetic: a
surviving `,Camping` matches no canonical category, falls through to the
preserve-verbatim branch, and is then absent from
`NON_ASSIGNABLE_HOUSING_TYPES` — making the guest silently assignable,
which is the exact failure this feature exists to prevent.

An embedded comma that survives both-end stripping (`Dorm,Camping`, both
slots set) is genuinely ambiguous and is left verbatim rather than
guessed at. That keeps the guest assignable and therefore visible, with
the odd value on screen for the operator to correct.

## Conflicts

When `Housing type` is non-blank **and** the `Room` value would derive a
different category, **the existing `Housing type` wins** — the
registration system's explicit answer is never overwritten by inference.

Every such disagreement is collected and surfaced as a new section in
the existing `ImportSummaryDialog`, listing guest name, Planyo ID, the
stated Housing, and the category implied by Room. This makes the
disagreement the operator's decision rather than a silent resolution.

This is a fifth category in that dialog, alongside the existing
cancellations / date changes / bed conflicts / skipped rows.

## Re-import behavior

- `roomRequest` is a CSV-sourced field, so it follows the existing Add &
  Update merge rules: a non-empty incoming value overwrites, a blank one
  leaves the stored value alone.
- `Housing` is re-derived on every import. A stored guest whose Housing
  was previously derived as `Dorm` will update to `Camping` if a later
  CSV gives them `Room = CampingMen`. This is intended — the newer CSV
  is the newer truth.
- Neither field touches `internalNotes` or existing bed assignments. A
  guest who becomes non-assignable (e.g. Dorm → Camping) is **not**
  auto-unassigned; consistent with how cancellations are handled, the
  operator decides. The now-orphaned assignment is reported in the
  import summary.

## UI surfacing

- **All Reservations table** — new toggleable column, key `roomRequest`,
  label `Room`, `visible: true`. Placed immediately after `housingType`
  in `DEFAULT_GUEST_DATA_COLUMNS` so the stated category and the chosen
  room read side by side.
- **GuestFormModal** — editable text input labeled "Room", placed under
  Housing Type. The Housing Type `<select>` gains a `Canvas Tent`
  option; `BCM-RV` is retained so existing records round-trip.
- **Sorting** — `roomRequest` added to `useSortConfig` as a string sort.
- **Print views** — `roomRequest` becomes an optional, toggleable column
  labeled `Room`, wherever `roomPreference` already is: the shared
  `columns` toggles behind List by Dorm / A-Z, plus the separately
  persisted Guestmaster and Work Coordinator preference sets
  (`dormAssignments-guestmasterPrefs`,
  `…-workCoordinatorPrefs`). Default **off** in all of them, matching
  `roomPreference`'s existing default — an operator who wants it turns
  it on, and nobody's current printouts change shape.

## Tests

Added to `src/features/csv/composables/useCSV.test.ts`:

- Each derivation rule maps as specified, including `CampingMen` /
  `CampingWomen` / `CampingCouples` → `Camping`.
- `Commmuter` (doubled m) → `Commuter`.
- `Canvas Tent1-bed1` and `CanvasTent3-bed2` → `Canvas Tent`.
- `RV Daffodil-1` and `CrystalSunshine Rm 1 ( female only) - bed 7` →
  `Dorm`.
- A non-blank Housing wins over a conflicting Room, and the conflict is
  reported.
- Both blank → `Dorm`.
- `","` (the Planyo artifact) is treated as blank, not as a category.
- A CSV with no `Room` column at all imports unchanged — no crash, no
  behavior change for the existing format.

Added to `src/stores/guestStore.test.ts`:

- A `Canvas Tent` guest is excluded from `assignableGuests`.
- A `Dorm` guest is included.

## Out of scope

- **Bed-level matching, and auto-assignment generally.** Parsing
  `- bed 7`, `-bed2`, `-1`, and the `2L` bunk suffix into a real bed,
  and assigning to it.

  This is ruled out on the facts, not merely deferred: **the
  registration form's bed numbers do not come from the same source as
  the room configuration's `Bed Position`.** The two numbering schemes
  are independent, so `bed 7` in the CSV is not `Bed Position 7` in the
  app, and any automated mapping between them would silently place
  guests in the wrong beds — a worse outcome than leaving them
  unassigned, because it looks like a completed assignment.

  `roomRequest` is therefore carried as **operator-facing information
  only**. It is displayed so a human can read the guest's stated choice
  and place them by hand; nothing in this change writes a bed
  assignment. Revisiting this would require reconciling the two
  numbering schemes first.
- **Creating rooms for `RV Daffodil` / `Canvas Tent*`.** Neither exists
  in `default_room_config.csv`. Under these rules the two RV guests
  become `Dorm` and will appear in the unassigned list with nowhere to
  go until the operator adds those rooms.
- **Gender-conflict validation on the `( female only)` annotation.** Two
  sample guests are Non-binary/Other but chose female-only rooms. The
  existing gender validation already warns once they are assigned to a
  bed; no new check is added here.
- Normalizing the spacing mismatch (`CrystalSunshine` vs
  `Crystal Sunshine`) — only needed for bed-level matching.

## Decisions

1. **`RV Daffodil-*` derives `Dorm`**, not `BCM-RV`, even though
   `GuestFormModal.vue:86` already offers a `BCM-RV` option. `BCM-RV`
   stays in the select so existing records round-trip unchanged, but
   nothing derives it. Consequence, accepted: an RV guest is assignable
   and appears in the unassigned list with no `RV Daffodil` room in the
   configuration until the operator adds one.
2. **Both columns blank derives `Dorm`.** Writing a category the CSV
   never stated is acceptable; it matches the behavior a blank already
   produces today.
3. **`Room` is an optional print column** — see UI surfacing.
