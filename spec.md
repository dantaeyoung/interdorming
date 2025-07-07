# Blue Cliff Monastery Dorm Assignment Tool - Product Specification

## 1. Overview

### 1.1 Purpose
The Blue Cliff Monastery Dorm Assignment Tool is a web-based drag-and-drop interface designed to streamline the manual process of assigning 60-80 guests to dormitory beds. The tool replaces the current time-consuming spreadsheet-based workflow used by monastery staff 1-2 times per month.

### 1.2 Primary Users
- 1-2 monastery staff members and volunteers
- Single-user workflow (no simultaneous editing required for MVP)

### 1.3 Success Criteria
- **Faster assignment process** compared to current manual spreadsheet method
- **Easy visibility** of current assignment status
- **Visual grouping indicators** to show relationships between guests
- **Flexible room management** to accommodate changing dormitory configurations

## 2. Core Features

### 2.1 Data Import
- **CSV Upload**: Users can upload a CSV file containing guest information
- **Data Validation**: System validates required fields and displays import status
- **Error Handling**: Clear error messages for malformed CSV files

### 2.2 Guest Management Interface
- **Unassigned Guests Table** (Left Column):
  - Displays all unassigned guests in a sortable table
  - Shows key fields: Name, Gender, Age, Arrival, Departure, Group connections
  - **Sortable columns** for easy organization
  - **Visual grouping**: Red lines drawn between rows of people with the same GroupName
  - **Search/Filter functionality** to quickly find specific guests

### 2.3 Room Assignment Interface
- **Rooming Map** (Right Column):
  - Visual representation of all dormitory rooms
  - Each room displayed as a separate table with bed rows
  - **Bed status indicators**: Empty, Occupied, or Invalid assignment
  - **Room headers** showing room name, gender designation, and capacity

### 2.4 Drag-and-Drop Assignment
- **Drag functionality**: Users can drag guest rows from the Unassigned table
- **Drop zones**: Specific bed positions within dormitory room tables
- **Visual feedback**: Clear indication of valid/invalid drop zones during drag
- **Assignment validation**: Visual warnings for constraint violations (but not blocking)

### 2.5 Assignment Validation & Visual Indicators
- **Gender mismatch warnings**: Visual indicator when gender doesn't match room designation
- **Bunk preference violations**: Highlight when someone requiring lower bunk is assigned upper
- **Age grouping indicators**: Visual cues for age compatibility within rooms
- **Family separation warnings**: Alert when family members (same GroupName) are not in same room

## 3. Data Model

### 3.1 Guest Data Structure
```
Guest {
  // Core identification
  id: string
  firstName: string
  preferredName: string (optional)
  lastName: string
  
  // Demographics
  gender: "M" | "F"
  age: number
  
  // Stay details
  arrival: date
  departure: date
  
  // Assignment preferences
  lowerBunk: boolean
  groupName: string (for families/groups)
  
  // Administrative
  housingType: string
  firstVisit: boolean
  ratePerNight: number
  priceQuoted: number
  amountPaid: number
  groupOrIndiv: string
  room: string (current assignment)
  retreat: string
  notes: string
  arrivalTime: string
  departureMeals: string
  mentalHealth: string
  physicalHealth: string
  email: string
  column1: string
  column2: string
}
```

### 3.2 Room Data Structure
```
Room {
  roomName: string
  roomGender: "M" | "F" | "Coed"
  beds: Bed[]
}

Bed {
  bedId: string
  bedType: "upper" | "lower" | "single"
  assignedGuestId: string | null
  position: number (display order)
}
```

## 4. User Interface Requirements

### 4.1 Layout
- **Two-column layout**: Unassigned guests (left) and Room assignments (right)
- **Responsive design**: Works on desktop and tablet (mobile secondary)
- **Scrollable sections**: Both columns independently scrollable
- **Fixed headers**: Column headers remain visible during scrolling

### 4.2 Visual Design Elements
- **Group connection lines**: Red lines connecting guests with same GroupName
- **Color-coded bed status**:
  - Green: Properly assigned
  - Yellow: Assignment warning (e.g., gender mismatch)
  - Red: Critical issue (e.g., age-inappropriate assignment)
  - Gray: Empty bed
- **Hover states**: Clear visual feedback during drag operations
- **Loading states**: Progress indicators during CSV import

### 4.3 Interaction Patterns
- **Drag initiation**: Click and hold on guest row
- **Drop feedback**: Visual highlighting of valid drop zones
- **Assignment confirmation**: Immediate visual update upon successful drop
- **Undo functionality**: Easy way to reverse recent assignments

## 5. Technical Requirements

### 5.1 Platform
- **Web-based application**: Accessible via modern web browsers
- **Client-side processing**: No server required for MVP
- **Local storage**: Assignments saved to browser localStorage
- **CSV parsing**: Client-side CSV file processing

### 5.2 Performance
- **Responsive interaction**: Drag-and-drop operations under 100ms response time
- **Large dataset handling**: Smooth performance with 80+ guests
- **Memory efficiency**: Efficient rendering of multiple room tables

### 5.3 Browser Support
- **Modern browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **JavaScript enabled**: Full functionality requires JavaScript
- **File API support**: For CSV upload functionality

## 6. Functional Requirements

### 6.1 CSV Import Process
1. User clicks "Upload CSV" button
2. File picker opens for CSV selection
3. System validates CSV format and required columns
4. Success: Populate unassigned guests table
5. Error: Display specific error messages and suggested fixes

### 6.2 Assignment Workflow
1. User sorts/filters unassigned guests as needed
2. User drags guest row from left table
3. System highlights valid drop zones in room tables
4. User drops guest onto specific bed
5. System validates assignment and shows visual feedback
6. Guest moves from unassigned to assigned state
7. Room table updates to show new assignment

### 6.3 Assignment Management
- **Reassignment**: Drag assigned guests between beds
- **Unassignment**: Drag guests back to unassigned table
- **Bulk operations**: Select multiple guests for group operations
- **Assignment history**: Track recent changes for undo functionality

## 7. Validation Rules & Priority

### 7.1 Critical Constraints (Visual warnings, non-blocking)
1. **Gender segregation**: Males in female rooms, females in male rooms
2. **Bunk accessibility**: Upper bunk assignment for guests requiring lower bunks
3. **Family separation**: Family members (same GroupName) in different rooms

### 7.2 Optimization Guidelines (Visual indicators)
1. **Age grouping**: Similar ages in same room
2. **Group proximity**: Connected guests (same GroupName) in same room/nearby rooms
3. **Arrival/departure alignment**: Guests with similar stay dates

### 7.3 Special Cases
- **Family rooms**: Can override gender segregation (e.g., young boy with mother)
- **Accessibility needs**: Priority for lower bunk assignments
- **Group accommodations**: Flexibility for keeping connected guests together

## 8. Data Management

### 8.1 Data Persistence (MVP)
- **Local storage**: Save current assignments to browser localStorage
- **Export functionality**: Download current assignments as CSV
- **Import state**: Reload previous assignment session

### 8.2 Future Integration (Post-MVP)
- **Google Sheets integration**: Direct read/write to Google Sheets
- **Multi-user support**: Real-time collaboration features
- **Cloud storage**: Persistent storage across devices

## 9. Error Handling

### 9.1 CSV Import Errors
- **Missing columns**: Clear message indicating required columns
- **Invalid data**: Highlight problematic rows and suggest fixes
- **File format issues**: Guide user to correct CSV format

### 9.2 Assignment Errors
- **Drag-and-drop failures**: Graceful fallback with error messaging
- **Validation conflicts**: Clear explanation of constraint violations
- **Data corruption**: Recovery options and data integrity checks

## 10. Out of Scope (Future Features)

### 10.1 Not Included in MVP
- **Automated assignment suggestions**
- **Guest check-in/check-out functionality**
- **Billing integration**
- **Email notifications**
- **Advanced reporting**
- **Room configuration management UI**
- **Multi-user simultaneous editing**
- **Mobile-optimized interface**

### 10.2 Future Enhancements
- **Assignment fitness scoring**: Overall satisfaction score for assignments
- **Auto-assignment algorithm**: "Try auto-assign" button
- **Room layout editor**: Visual room configuration management
- **Advanced filtering**: Complex search and filter options
- **Assignment analytics**: Historical data and optimization insights

## 11. Acceptance Criteria

### 11.1 Core Functionality
- [ ] CSV file upload and parsing works correctly
- [ ] Guest table displays all imported data with sorting capability
- [ ] Room tables show correct bed layout and assignments
- [ ] Drag-and-drop assignment works smoothly
- [ ] Visual grouping lines appear for same GroupName guests
- [ ] Assignment validation provides appropriate visual feedback
- [ ] Local storage preserves assignments between sessions

### 11.2 User Experience
- [ ] Interface is intuitive for first-time users
- [ ] Drag-and-drop feels responsive and natural
- [ ] Visual feedback clearly indicates assignment status
- [ ] Error messages are helpful and actionable
- [ ] Assignment process is demonstrably faster than current method

### 11.3 Technical Performance
- [ ] Application loads in under 3 seconds
- [ ] Drag operations respond in under 100ms
- [ ] Works smoothly with 80+ guests and 10+ rooms
- [ ] No data loss during normal operations
- [ ] Compatible with target browsers

## 12. Implementation Notes

### 12.1 Development Approach
- **Start simple**: Focus on core drag-and-drop functionality first
- **Incremental enhancement**: Add validation and visual indicators progressively
- **User feedback**: Test with actual monastery staff during development
- **Responsive design**: Ensure desktop and tablet compatibility

### 12.2 Key Technical Considerations
- **State management**: Maintain consistent state between unassigned and assigned guests
- **Performance optimization**: Efficient rendering for large datasets
- **Data integrity**: Prevent data corruption during drag operations
- **User experience**: Smooth animations and clear visual feedback