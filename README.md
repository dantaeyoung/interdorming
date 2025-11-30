# Blue Cliff Monastery Dorm Assignment Tool

A client-side web application for streamlining the assignment of 60-80 retreat guests to dormitory beds at Blue Cliff Monastery. This tool replaces a manual spreadsheet-based workflow used by monastery staff 1-2 times per month.

## Features

### Guest Assignment
- **CSV Import/Export**: Upload guest data from CSV files with flexible column mapping
- **Drag & Drop Interface**: Intuitive drag-and-drop to assign guests to beds
- **Click-Based Pickup/Drop/Swap**: Alternative interaction method for touch devices or accessibility
- **Search & Filter**: Quickly find guests in the unassigned list
- **Undo Functionality**: Revert the last 10 assignment actions
- **Visual Warnings**: Automatic validation alerts for:
  - Gender mismatches (wrong gender for room)
  - Bunk accessibility issues (upper bunk for guests requiring lower)
  - Family separation (same group in different rooms)
  - Age compatibility concerns

### Room Configuration
- **Multi-Dormitory Support**: Organize rooms across multiple dormitory buildings
- **Visual Room Management**: Configure room names, genders (M/F/Coed), and bed layouts
- **Bed Configuration**: Set bed types (upper/lower/single) for each room
- **Color Coding**: Assign colors to dormitories for visual organization
- **Import/Export**: Save and load room configurations via CSV

### Display & Settings
- **Age Histograms**: Visual age distribution charts for each room (optional)
- **Group Connection Lines**: Visual indicators connecting guests in the same family/group
- **Customizable Warnings**: Toggle specific validation warnings on/off
- **Responsive Design**: Works on desktop and tablet devices

### Data Persistence
- **Browser Storage**: All data automatically saved to localStorage
- **No Server Required**: Fully client-side application
- **Data Migration**: Automatic version detection and data structure migration

## Quick Start

### Running the Application

1. **Using Python (simplest)**:
   ```bash
   python -m http.server 8000
   ```
   Then open: http://localhost:8000

2. **Using Node.js**:
   ```bash
   npx serve .
   ```

3. **Using any HTTP server**: Just serve the directory containing `index.html`

### First Time Setup

1. Open the application in your browser
2. Click **"Upload CSV File"** in the Guest Assignment tab
3. Select your guest CSV file
4. (Optional) Configure rooms in the **Room Configuration** tab
5. Start assigning guests by dragging them to beds!

## CSV File Formats

### Guest CSV Format

The tool accepts flexible column names. Required columns:
- `firstName` (or `FIRST NAME`, `First Name`)
- `lastName` (or `LAST NAME`, `Last Name`)
- `gender` (values: `M`, `F`, `Male`, `Female`, `Non-binary`, `Other`)
- `age`

Optional columns:
- `preferredName`
- `groupName` (for families or groups that should stay together)
- `lowerBunk` (true/false - guest requires lower bunk)
- `arrival`, `departure` (dates)
- `email`, `notes`, etc.

**Example**:
```csv
firstName,lastName,gender,age,lowerBunk,groupName,arrival,departure
John,Smith,M,25,false,,2024-01-15,2024-01-20
Bob,Johnson,M,45,true,Family1,2024-01-15,2024-01-20
Alice,Johnson,F,12,false,Family1,2024-01-15,2024-01-20
```

Sample file: [`test_guests.csv`](test_guests.csv)

### Room Configuration CSV Format

Export and import complete room layouts:
- `Dormitory Name` (required)
- `Dormitory Color` (hex color code)
- `Room Name`
- `Room Gender` (M/F/Coed)
- `Bed ID`, `Bed Type`, `Bed Position`
- `Active` (true/false)

Sample file: [`sample_room_config.csv`](sample_room_config.csv)

## Usage Guide

### Assigning Guests

**Method 1: Drag & Drop**
1. Drag a guest from the "Unassigned Guests" table
2. Drop them onto an empty bed in any room
3. To unassign, drag them back to the "Unassigned Guests" area

**Method 2: Click-Based (Pickup/Drop/Swap)**
1. Click the **↑** button next to an assigned guest to pick them up
2. Click the **↓** button on an empty bed to drop them there
3. Click the **↔** button on another assigned guest to swap positions

### Managing Rooms

1. Go to the **Room Configuration** tab
2. Click **Add Dormitory** to create a new building
3. Select a dormitory, then click **Add Room**
4. Click **Configure Beds** on any room to add/remove/modify beds
5. Use **Export Room Config** to save your layout

### Settings

Toggle display options and warning types in the **Settings** tab:
- Show/hide age histograms
- Enable/disable specific warnings
- Customize the interface to your workflow

### Exporting Results

Click **Export CSV** to download a CSV file containing:
- All guest information
- Assigned room names
- Assigned bed IDs

## Architecture

### Technology Stack
- **Pure JavaScript** (ES6+) - No frameworks required
- **HTML5 & CSS3** - Modern, accessible interface
- **localStorage API** - Client-side data persistence
- **File API** - CSV import/export

### Project Structure
```
├── index.html              # Main application HTML
├── app.js                  # Core application logic (~2,200 lines)
├── styles.css              # Styling and layout
├── app-*.js                # Feature modules (utils, storage, validation)
├── constants.js            # Application constants
├── test_guests.csv         # Sample guest data for testing
├── sample_room_config.csv  # Sample room configuration
├── specs/                  # Technical specifications
└── CLAUDE.md              # Development workflow guide
```

### Key Classes & Functions

**Main Class**: `DormAssignmentTool`
- Manages application state (guests, rooms, assignments)
- Handles UI rendering and updates
- Coordinates drag-and-drop interactions

**Mixins**:
- `AppUtils` - Utility functions (date formatting, name display, etc.)
- `AppStorage` - localStorage persistence and data migration
- `AppValidation` - Assignment validation and warning generation

## Data Model

```
dormitories[]              // Top-level organizational units
  ├── dormitoryName
  ├── active (boolean)
  ├── color (hex code)
  └── rooms[]
      ├── roomName
      ├── roomGender (M/F/Coed)
      ├── active (boolean)
      └── beds[]
          ├── bedId (unique identifier)
          ├── bedType (upper/lower/single)
          ├── position (number)
          └── assignedGuestId (reference to guest)

guests[]                   // All imported guests
  ├── id (auto-generated)
  ├── firstName, lastName
  ├── gender, age
  ├── groupName (for families)
  ├── lowerBunk (boolean)
  └── ...other CSV fields

assignments (Map)          // guestId → bedId mapping
```

## Browser Compatibility

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Requires JavaScript enabled
- Requires localStorage support

## Privacy & Security

- **All data stays local**: No data is transmitted to any server
- **CSV files not committed**: `.gitignore` excludes CSV files to prevent accidental guest data commits
- **No accounts required**: No login, registration, or user tracking
- **Offline capable**: Works without internet connection after initial load

## Development

### Testing

Test the application with sample data:
```bash
# Just open index.html and upload test_guests.csv
# Or use the auto-load feature (see Development Mode below)
```

### Development Mode

For easier testing during development, you can modify the code to auto-load `test_guests.csv` on startup.

### Git Workflow

```bash
# CSV files are ignored by default
git status              # Should never show .csv files

# Commit room configurations separately if needed
git add sample_room_config.csv --force
```

## Troubleshooting

**Problem**: Guests won't drag
**Solution**: Ensure JavaScript is enabled and you're using a modern browser

**Problem**: Data disappeared after closing browser
**Solution**: Check if localStorage is enabled and not in incognito/private mode

**Problem**: CSV import fails
**Solution**: Ensure CSV has required columns (firstName, lastName, gender, age)

**Problem**: Warnings not showing
**Solution**: Check Settings tab to ensure warnings are enabled

## Contributing

This is a custom tool for Blue Cliff Monastery. For development guidance, see [`CLAUDE.md`](CLAUDE.md) which contains the development workflow and coding standards.

## License

Copyright © 2024 Blue Cliff Monastery

## Support

For issues, feature requests, or questions, contact the monastery IT coordinator.
