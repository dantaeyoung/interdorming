# NOTE: Vibecoded

# Interdorming: a Dorm Assignment Tool

A web application for streamlining the assignment of 60-80 retreat guests to dormitory beds at Blue Cliff Monastery. This tool replaces a manual spreadsheet-based workflow used by monastery staff 1-2 times per month.

## Features

### Guest Assignment
- **CSV Import/Export**: Upload guest data from CSV files with flexible column mapping (auto-skips preamble/metadata lines)
- **Drag & Drop Interface**: Intuitive drag-and-drop to assign guests to beds
- **Click-to-Pick Assignment**: Alternative click-based pickup/drop/swap for touch devices or accessibility
- **Search & Filter**: Quickly find guests in the unassigned list
- **Auto-Place**: Automatically assign unassigned guests to compatible beds
- **Undo Functionality**: Revert the last 10 assignment actions
- **Visual Warnings**: Automatic validation alerts for:
  - Gender mismatches (wrong gender for room)
  - Bunk accessibility issues (upper bunk for guests requiring lower)
  - Family separation (same group in different rooms)
  - Age compatibility concerns

### Timeline View
- **Visual Timeline**: See guest arrivals and departures on a scrollable timeline
- **Overlap Detection**: Identify scheduling conflicts at a glance

### Room Configuration
- **Multi-Dormitory Support**: Organize rooms across multiple dormitory buildings
- **Visual Room Management**: Configure room names, genders (M/F/Coed), and bed layouts
- **Bed Configuration**: Set bed types (upper/lower/single) for each room
- **Color Coding**: Assign colors to dormitories for visual organization
- **Import/Export**: Save and load room configurations via CSV

### Display & Settings
- **Age Histograms**: Visual age distribution charts for each room (optional)
- **Group Connection Lines**: Visual indicators connecting guests in the same family/group
- **Configurable Gender Colors**: Customize color-coding for gender display
- **Customizable Warnings**: Toggle specific validation warnings on/off
- **Contextual Hints & Guided Tour**: Built-in onboarding hints and interactive tour
- **Print View**: Print-friendly layout for physical reference
- **Responsive Design**: Works on desktop and tablet devices

### Data Persistence
- **Browser Storage**: All data automatically saved to localStorage via Pinia persisted state
- **No Server Required**: Fully client-side application
- **Data Migration**: Automatic version detection and data structure migration

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Development
```bash
npm install
npm run dev
```
Then open: http://localhost:5173

### Production Build
```bash
npm run build
npm run preview   # Preview the build at http://localhost:4173
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting configuration (Netlify, Vercel, Apache, Nginx).

### First Time Setup

1. Open the application in your browser
2. Go to the **Guest Data** tab and click **Upload Guest List CSV**
3. Select your guest CSV file
4. (Optional) Configure rooms in the **Room Configuration** tab
5. Go to the **Assignment** tab and start assigning guests by dragging them to beds!

## CSV File Formats

### Guest CSV Format

The tool accepts flexible column names and auto-skips non-header preamble lines (e.g., "Reservations From: ...").

Required columns:
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

## Architecture

### Technology Stack
- **Vue 3** with Composition API and `<script setup>`
- **TypeScript** for type safety
- **Pinia** for state management with persisted state plugin
- **Vite** for build tooling and dev server
- **SCSS** for component styling (scoped)
- **driver.js** for guided tour functionality
- **Vitest** for unit testing

### Project Structure
```
src/
├── App.vue                     # Root component with tab navigation and layout
├── main.ts                     # App entry point (Vue, Pinia, plugins)
├── types/                      # TypeScript type definitions and constants
│   ├── Guest.ts, Bed.ts, Room.ts, Dormitory.ts
│   ├── Assignment.ts, Validation.ts, Settings.ts, Storage.ts
│   ├── Constants.ts            # Field mappings, defaults, messages
│   └── index.ts                # Central re-export
├── stores/                     # Pinia stores
│   ├── guestStore.ts           # Guest data management
│   ├── dormitoryStore.ts       # Dormitory/room/bed configuration
│   ├── assignmentStore.ts      # Guest-to-bed assignments and history
│   ├── settingsStore.ts        # User preferences and display settings
│   ├── validationStore.ts      # Assignment validation warnings
│   └── timelineStore.ts        # Timeline view state
├── features/                   # Feature modules
│   ├── assignments/            # Drag-drop, click-to-pick, stats, toolbar
│   ├── csv/                    # CSV import/export (guests and rooms)
│   ├── dormitories/            # Room list, bed slots, room config cards
│   ├── guest-data/             # Guest data table view
│   ├── guests/                 # Guest list, guest rows, search, group lines
│   ├── hints/                  # Contextual hints and empty states
│   ├── settings/               # Settings panel and auto-placement config
│   ├── timeline/               # Timeline view with guest blobs
│   ├── print/                  # Print-friendly layout
│   ├── backup/                 # Data backup/restore controls
│   └── export/                 # Export functionality
├── shared/                     # Shared utilities
│   ├── components/             # FloatingActionBar, etc.
│   └── composables/            # useDropValidation, useGroupConnections
├── specs/                      # Feature specifications
└── OLD/                        # Legacy vanilla JS code (reference only)
```

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
          └── active (boolean)

guests[]                   // All imported guests
  ├── id (auto-generated UUID)
  ├── firstName, lastName, preferredName
  ├── gender, age
  ├── groupName (for families)
  ├── lowerBunk (boolean)
  ├── arrival, departure
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

### Commands
```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Type-check and build for production
npm run preview   # Preview production build
npm run test      # Run unit tests with Vitest
```

### Git Workflow
```bash
# CSV files are ignored by default
git status              # Should never show .csv files
```

## Troubleshooting

**Problem**: Guests won't drag
**Solution**: Ensure JavaScript is enabled and you're using a modern browser

**Problem**: Data disappeared after closing browser
**Solution**: Check if localStorage is enabled and not in incognito/private mode

**Problem**: CSV import fails
**Solution**: Ensure CSV has required columns (firstName, lastName, gender, age). Preamble/metadata lines before the header are skipped automatically.

**Problem**: Warnings not showing
**Solution**: Check Settings tab to ensure warnings are enabled

## Contributing

This is a custom tool for Blue Cliff Monastery created by Dan Taeyoung, mostly vibecoded with Claude Code.
For development guidance, see [`CLAUDE.md`](CLAUDE.md) which contains the development workflow and coding standards.

## License

MIT License - see [LICENSE](LICENSE) file for details.

Mostly vibecoded with Claude; MIT license to keep it sharable.

## Support

For issues, feature requests, or questions, contact Dan Taeyoung.
