# Settings Tab Specification

## Overview

The Settings Tab provides users with granular control over warning systems and display preferences in the Blue Cliff Monastery Dorm Assignment Tool. This interface allows monastery staff to customize validation rules and visual indicators to match their specific operational needs.

## User Problem

Currently, users cannot adjust warning sensitivity or customize the assignment validation system. The age gap warnings in particular can be too strict for some retreat scenarios, and users need the ability to:
- Turn off or adjust specific warning types
- Customize age gap thresholds for different retreat types
- See age distribution in rooms at a glance
- Save their preferred settings across sessions

## Success Criteria

- [ ] Users can toggle individual warning types on/off
- [ ] Users can adjust age gap threshold from 0-50 years with immediate effect
- [ ] Users can see small age histograms on room cards
- [ ] Settings persist across browser sessions via localStorage
- [ ] Settings can be imported/exported for sharing configurations
- [ ] Interface is intuitive and changes apply immediately
- [ ] Default settings have all warnings enabled

## Interface Design

### Tab Structure
- Add "Settings" as a third tab in the main tab bar
- Tab order: "Guest Assignment" | "Room Configuration" | "Settings"
- Settings tab uses same styling as existing tabs

### Settings Layout
Three main sections organized vertically:

#### 1. Age-Related Warnings
```
┌─ Age Gap Settings ──────────────────────────────────────┐
│ □ Enable age gap warnings                               │
│                                                         │
│ Age gap threshold: [====•====] 20 years                │
│ (Range: 0-50 years, current value displayed)           │
│                                                         │
│ □ Show age histograms on room cards                     │
└─────────────────────────────────────────────────────────┘
```

#### 2. Assignment Warnings
```
┌─ Assignment Validation ─────────────────────────────────┐
│ □ Gender mismatch warnings                              │
│ □ Bunk preference violations                            │
│ □ Family/group separation warnings                      │
│ □ Adult/minor conflict warnings                         │
│ □ Room availability warnings                            │
└─────────────────────────────────────────────────────────┘
```

#### 3. Settings Management
```
┌─ Configuration ─────────────────────────────────────────┐
│ [Reset to Defaults] [Import Settings] [Export Settings] │
└─────────────────────────────────────────────────────────┘
```

## Age Histogram Feature

### Location
- Display on room cards in the room header
- Position: Right of room info (after "M, 2/6 beds")
- Format: `M, 2/6 beds [▂▃▅▂▁]`

### Visual Design
- Small bar chart with 5 age buckets
- Height: 12px, Width: ~40px total
- Age ranges: <18, 18-30, 30-50, 50-65, 65+
- Colors: Gradient from blue (young) to red (old)
- Bars show relative height based on guest count in each bucket

### Interaction
- Hover tooltip shows: "Ages: <18: 1, 18-30: 2, 30-50: 1, 50-65: 0, 65+: 0"
- Only visible when "Show age histograms" is enabled
- Updates immediately when guests are assigned/unassigned

## Technical Implementation

### Settings Data Structure
```javascript
{
  warnings: {
    ageGap: {
      enabled: true,
      threshold: 20
    },
    genderMismatch: true,
    bunkPreference: true,
    familySeparation: true,
    adultMinor: true,
    roomAvailability: true
  },
  display: {
    showAgeHistograms: true
  },
  version: "1.0"
}
```

### localStorage Integration
- Key: `monasterySettings`
- Auto-save on any setting change
- Merge with defaults on app initialization
- Version control for future settings migrations

### Settings Import/Export
- Export: Generate JSON file with current settings
- Import: File picker accepting .json files
- Validation: Ensure imported settings match expected structure
- Error handling: Invalid imports show error message, don't corrupt existing settings

## Behavior Specifications

### Immediate Application
- Checkbox changes apply instantly (no save button)
- Age gap slider updates apply on mouse release
- Room displays update immediately when histogram setting changes
- Warning validations re-run when warning settings change

### Default Settings
All warnings enabled by default:
- Age gap warnings: ON (20 years threshold)
- Gender mismatch: ON
- Bunk preference: ON
- Family separation: ON
- Adult/minor conflicts: ON
- Room availability: ON
- Age histograms: ON

### Reset to Defaults
- One-click button to restore all settings to defaults
- Confirmation dialog: "Reset all settings to defaults?"
- Immediate application after confirmation

## Integration Points

### Validation System Updates
- Modify `getAssignmentWarnings()` to check settings before adding warnings
- Modify `getAssignmentWarningsForUnassignedGuest()` similarly
- Add settings parameter to warning methods

### Room Card Updates
- Extend room card rendering to include age histogram
- Add histogram calculation method
- Update CSS for histogram display

### Settings Persistence
- Extend localStorage save/load methods
- Add settings initialization in constructor
- Add settings validation and migration logic

## User Experience Considerations

### Accessibility
- All controls keyboard accessible
- Clear labels and descriptions
- Logical tab order through settings

### Performance
- Settings changes don't trigger expensive recalculations
- Histogram calculations cached per room
- Debounced slider updates (prevent excessive re-renders)

### Error Handling
- Import validation with clear error messages
- Graceful fallback to defaults if settings corrupted
- Non-blocking errors (app continues functioning)

## Out of Scope

### Future Enhancements (Not in This Implementation)
- Advanced warning customization (custom age ranges, room-specific rules)
- Warning explanations/tooltips (noted as separate feature)
- Settings presets for different retreat types
- Admin-level settings vs user-level settings
- Multi-language support for settings interface

### Technical Debt
- Settings interface uses existing CSS patterns
- No new external dependencies
- Maintains backward compatibility with existing localStorage data

## Acceptance Criteria

### Core Functionality
- [ ] Settings tab accessible from main navigation
- [ ] Age gap threshold slider (0-50 years) with immediate effect
- [ ] All warning types can be toggled on/off
- [ ] Settings persist across browser sessions
- [ ] Reset to defaults functionality works

### Age Histogram Feature
- [ ] Small bar charts appear on room cards when enabled
- [ ] Hover tooltips show age breakdown
- [ ] Histograms update when room assignments change
- [ ] Can be toggled on/off via settings

### Import/Export
- [ ] Export generates valid JSON file
- [ ] Import accepts and validates JSON files
- [ ] Invalid imports show error without corrupting settings
- [ ] Exported settings can be successfully imported

### Integration
- [ ] Warning system respects all setting toggles
- [ ] Age gap warnings use configured threshold
- [ ] Room displays update immediately when settings change
- [ ] No regression in existing functionality

## File Changes Required

### New Files
- None (integrate into existing files)

### Modified Files
- `index.html`: Add settings tab and interface elements
- `app.js`: Add settings management, histogram calculation, validation updates
- CSS: Add styles for settings interface and histograms

### Testing
- Manual testing with various setting combinations
- Edge case testing (threshold extremes, corrupted settings)
- Performance testing with large guest lists
- Import/export functionality verification