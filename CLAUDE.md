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

The Blue Cliff Monastery Dorm Assignment Tool is a client-side web application that streamlines the process of assigning 60-80 retreat guests to dormitory beds. It replaces a manual spreadsheet-based workflow used by monastery staff 1-2 times per month.

## Core Architecture

### Dual-Mode Interface
The application operates in two primary modes accessed via tabs:
- **Guest Assignment Mode**: Drag-and-drop interface for assigning guests to beds
- **Room Configuration Mode**: Visual interface for managing dormitory layouts

### Data Model Hierarchy
```
Dormitories (top level) → Rooms → Beds → Guest Assignments
```

**Key Data Structures:**
- `dormitories[]`: Array of dormitory objects containing rooms
- `rooms[]`: Flat array generated from dormitories for backward compatibility  
- `assignments`: Map of guestId → bedId for tracking assignments
- `guests[]`: Array of guest objects from CSV import

### State Management
- **Primary State**: Stored in `DormAssignmentTool` class properties
- **Persistence**: localStorage with versioned data migration (v2.0 format)
- **History**: Assignment undo/redo system with 10-action limit
- **Synchronization**: Changes in room configuration immediately update assignment interface

## File Structure

### Core Application Files
- **`index.html`**: Single-page application with tab interface and modal components
- **`app.js`**: Main application logic (~1,900 lines, single class)
- **`.gitignore`**: Excludes CSV files to prevent committing guest data

### Testing & Sample Data
- **`test_persistence.js`**: Test script for localStorage and data migration functionality
- **`sample_room_config.csv`**: Example room configuration CSV for testing imports

### Documentation (`specs/` directory)
- **`spec.md`**: Original guest assignment tool specification
- **`room-configuration-spec.md`**: Room configuration interface specification  
- **`CSV_IMPORT_EXPORT_GUIDE.md`**: Guide for CSV operations
- **`PERSISTENCE_INTEGRATION.md`**: Technical documentation for data persistence
- **`CLAUDE.md`**: This file - development guidance

## Key Technical Patterns

### CSV Handling
The application handles two types of CSV files:
1. **Guest Data**: Flexible column mapping supports various naming conventions
2. **Room Configuration**: Export/import dormitory layouts with bed assignments

Column mapping system handles variations like:
- `firstName` / `FIRST NAME` / `First Name`
- `lowerBunk` / `Lower bunk?` / `Lower Bunk`

### Data Migration
Automatic migration from old room structure to new dormitory-based structure:
- Detects data version in localStorage
- Wraps legacy rooms in "Main Building" dormitory
- Preserves all guest assignments during migration

### Validation System
Non-blocking visual warnings for:
- Gender mismatches (male in female room)
- Bunk accessibility violations (upper bunk for lower-bunk-required guests)
- Family separation (same GroupName in different rooms)
- Age compatibility issues (large age gaps, minors with adults)

## Development Commands

Since this is a client-side application with no build system:

### Running the Application
```bash
# Serve files locally (any HTTP server)
python -m http.server 8000
# OR
npx serve .
```

### Testing
```bash
# Run persistence tests to validate localStorage and migration
node test_persistence.js

# Test CSV import functionality
# Use sample_room_config.csv to test room configuration import
```

### Git Workflow
```bash
# The application excludes CSV files from commits
git status  # Should never show .csv files
```

## Data Persistence

### localStorage Structure (v2.0)
```javascript
{
  guests: Guest[],
  assignments: [guestId, bedId][],
  dormitories: Dormitory[],
  assignmentHistory: HistoryState[],
  version: "2.0"
}
```

### Bed ID Generation
- Format: `[RoomPrefix][BedNumber]` (e.g., "MA01", "FR03")
- Auto-generated based on room name abbreviations
- Must be unique across all dormitories

## Important Implementation Notes

### Global App Reference
The main application instance is stored in global `app` variable for onclick handlers in dynamically generated HTML.

### Event Handling
- Tab switching updates `currentTab` property
- Modal interactions use both click-outside and ESC key
- Drag-and-drop uses native HTML5 API with visual feedback

### Performance Considerations
- Flat `rooms[]` array maintained for backward compatibility
- `getFlatRoomsList()` regenerates from dormitories when needed
- Large datasets (80+ guests) handled efficiently with selective re-rendering

### Data Safety
- Guest assignments preserved during room configuration changes
- Removed beds trigger guest unassignment to prevent data corruption
- Confirmation dialogs for destructive operations

## CSV Column Mappings

### Guest CSV Fields (Flexible)
Required: `firstName`, `lastName`, `gender`, `age`
Optional: `preferredName`, `groupName`, `lowerBunk`, `arrival`, `departure`, etc.

### Room Configuration CSV
Required: `Dormitory Name`
Optional: `Room Name`, `Room Gender`, `Bed ID`, `Bed Type`, `Bed Position`, `Active`

## Browser Compatibility
Targets modern browsers (Chrome, Firefox, Safari, Edge latest 2 versions)
Requires JavaScript and File API support for CSV operations.

## Deployment
This is a static client-side application with no server dependencies:
- Can be served from any HTTP server or CDN
- No database or backend services required
- All data stored in browser localStorage
- CSV files processed entirely client-side

## Common Pitfalls & Solutions

### Global App Variable
**Issue**: Dynamically generated HTML uses `onclick="app.methodName()"` 
**Solution**: The global `app` variable must be set in `document.addEventListener('DOMContentLoaded')`

### localStorage Data Migration
**Issue**: Old data format incompatibility
**Solution**: Check `data.version` and call `migrateFromOldStructure()` if needed

### Bed ID Uniqueness
**Issue**: Duplicate bed IDs cause assignment conflicts
**Solution**: Use `generateBedId()` method which creates unique IDs based on room names

### CSV Column Variations
**Issue**: CSV files have different column naming conventions
**Solution**: Use the `fieldMappings` object in CSV parsing to handle variations

## Validation Checklist
After making changes, verify:
- [ ] Can upload guest CSV files with various column names
- [ ] Drag-and-drop assignment works between guests and beds
- [ ] Room configuration changes update assignment interface
- [ ] Can export/import room configurations
- [ ] Undo functionality works for recent assignments
- [ ] Data persists across browser sessions
- [ ] Assignment warnings appear for violations (gender, age, bunk type)
- [ ] Tab switching works between Assignment and Room Configuration modes
