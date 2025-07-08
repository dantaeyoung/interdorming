# File Split Refactoring Specification

## Overview

This specification outlines the process for refactoring the monolithic `app.js` file (~2,400 lines) into logical, maintainable modules while preserving all existing functionality and maintaining the zero-build-step simplicity of the current architecture.

## Goals

### Primary Objectives
- **Improve maintainability**: Separate concerns into logical modules
- **Enhance developer experience**: Make code easier to navigate and modify
- **Preserve simplicity**: No build step, no external dependencies
- **Maintain functionality**: 100% backward compatibility
- **Enable future growth**: Scalable architecture for new features

### Success Criteria
- [ ] Each file has a clear, single responsibility
- [ ] All existing functionality works identically
- [ ] No external dependencies added
- [ ] Development workflow remains simple (just refresh browser)
- [ ] File sizes are manageable (<500 lines each)
- [ ] Clear interfaces between modules

## Current State Analysis

### Current File Structure
```
interdorming/
├── index.html (590 lines with embedded CSS)
├── app.js (2,400+ lines - MONOLITHIC)
├── specs/ (documentation)
└── test files
```

### Current app.js Contents
- DormAssignmentTool class (main application)
- Settings system (400+ lines)
- Room configuration (500+ lines)
- Guest assignment logic (600+ lines)
- Warning/validation system (300+ lines)
- CSV import/export (200+ lines)
- localStorage persistence (150+ lines)
- Utility functions (250+ lines)

## Target Architecture

### New File Structure
```
interdorming/
├── index.html
├── js/
│   ├── app-core.js           (~300 lines) - Main class & initialization
│   ├── app-settings.js       (~400 lines) - Settings system
│   ├── app-rooms.js          (~500 lines) - Room configuration
│   ├── app-assignments.js    (~600 lines) - Guest assignment logic
│   ├── app-validation.js     (~300 lines) - Warning system
│   ├── app-storage.js        (~200 lines) - Data persistence
│   └── app-utils.js          (~100 lines) - Shared utilities
└── specs/ (unchanged)
```

### Module Responsibilities

#### 1. `app-core.js` - Main Application Class
**Purpose**: Core application structure, initialization, and coordination

**Contents**:
- `DormAssignmentTool` class definition and constructor
- Core properties initialization
- Main event binding coordination
- Tab switching logic
- Application lifecycle management
- Global app instance creation

**Key Methods**:
- `constructor()`
- `bindEvents()` (coordinates other modules)
- `switchTab()`
- Main initialization flow

**Dependencies**: None (this is the foundation)

#### 2. `app-settings.js` - Settings System
**Purpose**: Complete settings management and UI

**Contents**:
- Settings data structure and defaults
- Settings UI rendering and event handling
- Settings persistence and validation
- Import/export functionality
- Warning system configuration

**Key Methods**:
- `getDefaultSettings()`
- `renderSettings()`
- `updateSetting()`, `updateAgeGapThreshold()`
- `resetSettings()`, `exportSettings()`, `importSettings()`
- `saveSettingsToLocalStorage()`, `loadSettingsFromLocalStorage()`

**Dependencies**: `app-core.js`, `app-validation.js`

#### 3. `app-rooms.js` - Room Configuration
**Purpose**: Dormitory and room management functionality

**Contents**:
- Room configuration UI and logic
- Dormitory management (add, edit, remove)
- Bed configuration and management
- Room configuration CSV import/export
- Visual room layout rendering

**Key Methods**:
- `renderDormitories()`, `renderRoomConfiguration()`
- `addDormitory()`, `editDormitory()`, `removeDormitory()`
- `addRoom()`, `editRoom()`, `removeRoom()`
- `openBedConfiguration()`, `renderBedConfiguration()`
- `exportRoomConfig()`, `importRoomConfig()`

**Dependencies**: `app-core.js`, `app-storage.js`

#### 4. `app-assignments.js` - Guest Assignment Logic
**Purpose**: Guest management and room assignment functionality

**Contents**:
- Guest table rendering and management
- Drag and drop assignment logic
- Guest CSV import and processing
- Assignment history and undo functionality
- Guest filtering and sorting

**Key Methods**:
- `renderGuestsTable()`, `renderRooms()`
- `handleDragStart()`, `handleDragEnd()`, `handleDrop()`
- `assignGuestToBed()`, `unassignGuest()`
- `handleCSVUpload()`, `parseCSV()`
- `sortGuests()`, `groupGuestsByGroupName()`

**Dependencies**: `app-core.js`, `app-validation.js`, `app-storage.js`

#### 5. `app-validation.js` - Warning System
**Purpose**: Assignment validation and warning logic

**Contents**:
- Warning calculation algorithms
- Validation rule implementations
- Warning display logic
- Settings-aware validation

**Key Methods**:
- `getAssignmentWarnings()`
- `getAssignmentWarningsForUnassignedGuest()`
- Warning-specific validation functions
- Settings integration for conditional warnings

**Dependencies**: `app-core.js`

#### 6. `app-storage.js` - Data Persistence
**Purpose**: localStorage management and data migration

**Contents**:
- localStorage save/load operations
- Data format versioning and migration
- Backup and recovery functionality
- Data structure validation

**Key Methods**:
- `saveToLocalStorage()`, `loadFromLocalStorage()`
- `migrateFromOldStructure()`
- Data validation and error handling
- Version management

**Dependencies**: `app-core.js`

#### 7. `app-utils.js` - Shared Utilities
**Purpose**: Common utility functions used across modules

**Contents**:
- CSV parsing utilities
- Date formatting functions
- ID generation functions
- Common validation helpers

**Key Methods**:
- `parseValue()`, `generateBedId()`
- Date/time utilities
- String manipulation helpers
- Validation utilities

**Dependencies**: None (pure utilities)

## Implementation Strategy

### Phase 1: Preparation
1. **Create directory structure**: Add `js/` folder
2. **Backup current state**: Ensure git commit of working version
3. **Create template files**: Empty module files with basic structure

### Phase 2: Extract Utilities (Safest First)
1. **Extract `app-utils.js`**: Move pure utility functions
2. **Update references**: Ensure all calls work
3. **Test functionality**: Verify no regression

### Phase 3: Extract Core Structure
1. **Create `app-core.js`**: Move main class definition
2. **Extract constructor and initialization**
3. **Keep coordination methods**
4. **Test basic functionality**

### Phase 4: Extract Independent Modules
1. **Extract `app-storage.js`**: Data persistence (fewest dependencies)
2. **Extract `app-validation.js`**: Warning system
3. **Test after each extraction**

### Phase 5: Extract Feature Modules
1. **Extract `app-settings.js`**: Settings system
2. **Extract `app-rooms.js`**: Room configuration
3. **Extract `app-assignments.js`**: Guest assignment logic
4. **Test full application functionality**

### Phase 6: Cleanup and Optimization
1. **Remove empty original `app.js`**
2. **Optimize module interfaces**
3. **Add module documentation**
4. **Final testing**

## Module Interface Design

### Communication Pattern
```javascript
// Each module extends the core class with mixins pattern
// app-settings.js
Object.assign(DormAssignmentTool.prototype, {
    getDefaultSettings() { /* ... */ },
    renderSettings() { /* ... */ },
    // ... other settings methods
});

// app-rooms.js  
Object.assign(DormAssignmentTool.prototype, {
    renderDormitories() { /* ... */ },
    addDormitory() { /* ... */ },
    // ... other room methods
});
```

### HTML Script Loading Order
```html
<!-- Core foundation -->
<script src="js/app-core.js"></script>

<!-- Utilities (no dependencies) -->
<script src="js/app-utils.js"></script>

<!-- Independent modules -->
<script src="js/app-storage.js"></script>
<script src="js/app-validation.js"></script>

<!-- Feature modules (depend on above) -->
<script src="js/app-settings.js"></script>
<script src="js/app-rooms.js"></script>
<script src="js/app-assignments.js"></script>

<!-- Application initialization -->
<script>
    // Global app instance creation
    let app;
    document.addEventListener('DOMContentLoaded', () => {
        app = new DormAssignmentTool();
    });
</script>
```

## File Split Guidelines

### Module Extraction Checklist
For each module extraction:

#### Before Extraction
- [ ] Identify all methods belonging to the module
- [ ] Map dependencies between methods
- [ ] Identify shared state/properties needed
- [ ] Note any cross-module method calls

#### During Extraction
- [ ] Copy methods to new module file
- [ ] Use `Object.assign(DormAssignmentTool.prototype, { ... })` pattern
- [ ] Maintain exact method signatures
- [ ] Preserve all comments and documentation
- [ ] Keep method implementations unchanged

#### After Extraction
- [ ] Remove methods from original file
- [ ] Add script tag to HTML in correct order
- [ ] Test affected functionality thoroughly
- [ ] Verify no console errors
- [ ] Check all related features work

### Code Style Consistency
- **Maintain existing patterns**: Don't refactor logic during split
- **Preserve comments**: Keep all existing documentation
- **Consistent indentation**: Match current code style
- **Method grouping**: Group related methods within modules
- **Clear module headers**: Add descriptive comments at top of each file

## Testing Strategy

### Manual Testing Checklist
After each module extraction, verify:

#### Core Functionality
- [ ] Application loads without errors
- [ ] All tabs switch correctly
- [ ] Main interface renders properly

#### Guest Assignment Features
- [ ] CSV upload works
- [ ] Guest table displays correctly
- [ ] Drag and drop assignment functions
- [ ] Undo/redo works
- [ ] Warning system displays correctly

#### Room Configuration Features
- [ ] Room configuration tab loads
- [ ] Can add/edit/remove dormitories
- [ ] Bed configuration works
- [ ] Room CSV import/export functions

#### Settings Features
- [ ] Settings tab loads correctly
- [ ] All setting toggles work
- [ ] Settings persist across sessions
- [ ] Import/export settings functions

#### Data Persistence
- [ ] Data saves to localStorage
- [ ] Data loads correctly on refresh
- [ ] No data loss during split process

### Automated Testing
Consider adding basic automated tests:
```javascript
// test-module-loading.js
function testAllModulesLoaded() {
    const requiredMethods = [
        'getDefaultSettings',    // app-settings.js
        'renderDormitories',     // app-rooms.js
        'renderGuestsTable',     // app-assignments.js
        'getAssignmentWarnings', // app-validation.js
        'saveToLocalStorage'     // app-storage.js
    ];
    
    return requiredMethods.every(method => 
        typeof app[method] === 'function'
    );
}
```

## Risk Mitigation

### Potential Issues and Solutions

#### Issue: Broken References
**Risk**: Method calls to extracted functions fail
**Solution**: Systematic testing after each extraction, maintain method signatures exactly

#### Issue: Dependency Cycles
**Risk**: Module A needs Module B which needs Module A
**Solution**: Careful dependency mapping before extraction, use event-driven communication if needed

#### Issue: Shared State Problems
**Risk**: Modules can't access needed properties
**Solution**: All modules extend the same class, so `this.property` access remains unchanged

#### Issue: Loading Order Problems
**Risk**: Module B loads before Module A but depends on it
**Solution**: Document and enforce script loading order in HTML

### Rollback Strategy
If issues arise:
1. **Git revert**: Each extraction is a separate commit
2. **Gradual rollback**: Can revert individual modules
3. **Merge back**: Can easily merge files back together
4. **Keep original backup**: Maintain copy of working monolithic version

## Benefits After Completion

### Developer Experience
- **Faster navigation**: Find settings code in `app-settings.js`
- **Easier debugging**: Isolate issues to specific modules
- **Parallel development**: Multiple people can work on different modules
- **Cleaner diffs**: Changes isolated to relevant files

### Maintainability
- **Single responsibility**: Each file has one clear purpose
- **Easier testing**: Can test modules in isolation
- **Future features**: Clear place to add new functionality
- **Code reviews**: Smaller, focused changes

### Performance
- **Unchanged runtime**: No performance impact
- **Better caching**: Browsers can cache unchanged modules
- **Selective loading**: Could lazy-load modules in future

## Future Enhancements Enabled

### Possible Next Steps (After File Split)
1. **ES6 Modules**: Convert to native ES modules (still no build step)
2. **Web Components**: Extract UI components to custom elements
3. **TypeScript**: Add type safety without complex build
4. **Progressive Enhancement**: Add frameworks incrementally

### Architecture Flexibility
The file split creates a foundation that supports:
- Adding new feature modules easily
- Extracting common functionality
- Migrating to frameworks gradually
- Implementing micro-frontend patterns

## Implementation Timeline

### Estimated Effort
- **Phase 1 (Preparation)**: 1 hour
- **Phase 2 (Utilities)**: 2 hours  
- **Phase 3 (Core)**: 3 hours
- **Phase 4 (Independent modules)**: 4 hours
- **Phase 5 (Feature modules)**: 6 hours
- **Phase 6 (Cleanup)**: 2 hours
- **Total**: ~18 hours of focused work

### Recommended Schedule
- **Week 1**: Phases 1-3 (Foundation)
- **Week 2**: Phase 4 (Independent modules)  
- **Week 3**: Phase 5 (Feature modules)
- **Week 4**: Phase 6 (Cleanup and testing)

This allows for thorough testing between phases and reduces risk of introducing bugs.

## Conclusion

The file split refactoring will significantly improve the maintainability and developer experience of the monastery dorm assignment tool while preserving its simplicity and zero-build-step architecture. The modular structure will also provide a solid foundation for future enhancements and features.

The systematic approach outlined in this specification ensures a safe, gradual transition that minimizes risk while maximizing the benefits of a well-organized codebase.