# Room Configuration Management Interface - Product Specification

## 1. Overview

### 1.1 Purpose
A visual room configuration editor that allows monastery staff to modify the available bed slots and rooms that guests can be assigned to in the existing drag-and-drop dorm assignment tool. This replaces the hardcoded room structure with a flexible, configurable system.

### 1.2 Primary Users
- 1-2 monastery staff members who need to adjust room layouts per retreat
- Single-user workflow (no simultaneous editing required)

### 1.3 Success Criteria
- **Easy room management** compared to modifying JavaScript code
- **Visual interface** for adding/removing rooms and beds
- **Seamless integration** with existing guest assignment tool
- **Flexible configurations** that can change between retreats

## 2. Core Features

### 2.1 Room Configuration Interface
- **New Tab/Mode**: Separate interface focused only on room layout (no guest assignments visible)
- **Visual Room Builder**: Simple visual representation of dormitories, rooms, and beds
- **Dormitory Management**: Add/remove dormitory buildings (Crystal Sunshine, Heavenly Music, RVs, Canvas Tents, etc.)
- **Room Management**: Add/remove individual rooms within dormitories

### 2.2 Bed Configuration
- **Bed Management**: Add/remove individual bed slots within rooms
- **Bed Type Selection**: Specify upper, lower, or single for each bed
- **Position Assignment**: Automatic bed numbering/positioning
- **Gender Designation**: Set room gender (M/F/Coed) per room

### 2.3 Room Status Management
- **Active/Inactive Rooms**: Mark rooms as unused without deleting them
- **Bulk Operations**: Quick enable/disable of multiple rooms

## 3. Data Model

### 3.1 Enhanced Room Structure
```
Dormitory {
  dormitoryName: string
  rooms: Room[]
  active: boolean
}

Room {
  roomName: string
  dormitoryName: string
  roomGender: "M" | "F" | "Coed"
  beds: Bed[]
  active: boolean
}

Bed {
  bedId: string (auto-generated)
  bedType: "upper" | "lower" | "single"
  assignedGuestId: string | null
  position: number (auto-assigned)
}
```

### 3.2 Configuration Management
```
RoomConfiguration {
  configName: string
  createdDate: date
  dormitories: Dormitory[]
}
```

## 4. User Interface Requirements

### 4.1 Layout
- **Tab-Based Interface**: Add "Room Configuration" tab to existing assignment tool
- **Three-Panel Layout**: 
  - Left: Dormitory list with add/remove controls
  - Center: Room layout for selected dormitory
  - Right: Bed configuration for selected room
- **Clean Focus**: No guest assignments visible in this mode

### 4.2 Visual Design Elements
- **Dormitory Cards**: Visual containers showing room count and status
- **Room Grid**: Visual representation of rooms within dormitory
- **Bed Layout**: Simple bed icons showing type (upper/lower/single)
- **Status Indicators**: Active/inactive visual states
- **Quick Actions**: Add/remove buttons for each level

### 4.3 Interaction Patterns
- **Click to Select**: Click dormitory → show rooms → click room → show beds
- **Inline Editing**: Click to rename rooms/dormitories
- **Drag to Reorder**: Optional bed reordering within rooms
- **Right-click Menus**: Context actions (duplicate, delete, toggle active)

## 5. Technical Requirements

### 5.1 Integration
- **Live Updates**: Changes immediately reflect in guest assignment interface
- **Guest Preservation**: Assigned guests remain unless bed is removed
- **Graceful Fallback**: Removed beds return guests to unassigned table

### 5.2 Data Persistence
- **localStorage**: Save configurations locally
- **CSV Export/Import**: Export room configurations as CSV
- **Configuration Names**: Save multiple named configurations
- **Default Recovery**: Always maintain a valid room structure

## 6. Functional Requirements

### 6.1 Configuration Workflow
1. User switches to "Room Configuration" tab
2. User selects dormitory to modify (or creates new one)
3. User adds/removes/modifies rooms within dormitory
4. User configures beds within each room
5. Changes automatically save and update assignment interface
6. User can export configuration or switch back to assignment mode

### 6.2 Room Management Operations
- **Add Dormitory**: Create new dormitory with default empty state
- **Add Room**: Create new room with configurable gender and bed count
- **Modify Room**: Change gender designation, add/remove beds
- **Remove Room**: Delete room (guests return to unassigned)
- **Toggle Active**: Temporarily disable rooms without deleting

### 6.3 Bed Management Operations
- **Add Bed**: Create new bed with type selection
- **Change Bed Type**: Convert between upper/lower/single
- **Remove Bed**: Delete bed (guest returns to unassigned if assigned)
- **Bulk Bed Creation**: Add multiple beds at once with type selection

## 7. Data Management

### 7.1 Configuration Storage
- **Named Configurations**: Save configurations with custom names
- **Default Configuration**: Always maintain current active configuration
- **Import/Export**: CSV format matching existing room data structure
- **Backup Recovery**: Ability to reset to last known good configuration

### 7.2 Integration Handling
- **Real-time Sync**: Room changes immediately available in assignment tool
- **Guest Assignment Preservation**: Maintain assignments when possible
- **Conflict Resolution**: Simple rule - removed beds unassign guests

## 8. Out of Scope (MVP)

### 8.1 Not Included
- **Validation Rules**: No enforcement of bed limits or configurations
- **Multi-user Editing**: Single user modification only
- **Advanced Templates**: No pre-built room templates
- **Historical Tracking**: No change history or audit trail
- **Capacity Planning**: No occupancy analytics or warnings
- **Integration with External Systems**: No booking system integration

### 8.2 Future Enhancements
- **Configuration Templates**: Common room layout templates
- **Bulk Import**: Import room configurations from external sources
- **Change History**: Track modifications and allow rollback
- **Multi-configuration Management**: Easy switching between saved layouts
- **Room Utilization Analytics**: Track usage patterns across configurations

## 9. Acceptance Criteria

### 9.1 Core Functionality
- [ ] Tab interface allows switching between assignment and configuration modes
- [ ] Visual interface shows dormitories, rooms, and beds clearly
- [ ] Add/remove operations work for dormitories, rooms, and beds
- [ ] Room gender designation can be modified
- [ ] Bed types (upper/lower/single) can be specified and changed
- [ ] Active/inactive status can be toggled for rooms

### 9.2 Integration
- [ ] Changes in configuration immediately reflect in assignment interface
- [ ] Existing guest assignments preserved when possible
- [ ] Guests unassigned when beds are removed
- [ ] localStorage persistence works correctly
- [ ] CSV export/import functions properly

### 9.3 User Experience
- [ ] Interface is intuitive for first-time users
- [ ] Room configuration is faster than editing code
- [ ] Visual feedback clearly shows current configuration
- [ ] No data loss during normal operations
- [ ] Can easily switch between configuration and assignment modes

## 10. Implementation Notes

### 10.1 Development Approach
- **Start Simple**: Basic add/remove functionality first
- **Visual Progression**: Build visual interface incrementally
- **Integration Focus**: Ensure seamless connection with existing tool
- **Data Safety**: Prioritize data preservation and recovery

### 10.2 Key Technical Considerations
- **State Management**: Maintain consistent state between modes
- **Performance**: Efficient rendering for large room configurations
- **Data Integrity**: Prevent corruption during configuration changes
- **User Experience**: Smooth transitions between configuration and assignment modes