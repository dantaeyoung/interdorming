# Room Configuration CSV Import/Export Guide

## Overview

The monastery dorm assignment tool now supports exporting and importing room configurations via CSV files. This allows for easy backup, sharing, and bulk modification of dormitory layouts.

## CSV Format

### Export Format

When you export room configurations, the CSV will include the following columns:

| Column | Description | Example Values |
|--------|-------------|----------------|
| Dormitory Name | Name of the dormitory building | "Main Building", "Family Building" |
| Room Name | Name of the room within the dormitory | "Men's Dorm A", "Family Room" |
| Room Gender | Gender designation for the room | "M", "F", "Coed" |
| Bed ID | Unique identifier for the bed | "MA01", "FR03" |
| Bed Type | Type of bed | "single", "upper", "lower" |
| Bed Position | Position number within the room | 1, 2, 3, ... |
| Active | Whether the dormitory/room is active | "true", "false" |

### Import Format Requirements

Your CSV file must include:
- **Header row**: Must contain at least "Dormitory Name" (required)
- **Data rows**: Each row represents one bed in the configuration

#### Column Variations Supported

The import function recognizes these column name variations:

- **Dormitory Name**: `Dormitory Name`, `dormitory_name`, `dormitoryName`, `Dormitory`
- **Room Name**: `Room Name`, `room_name`, `roomName`, `Room`
- **Room Gender**: `Room Gender`, `room_gender`, `roomGender`, `Gender`
- **Bed ID**: `Bed ID`, `bed_id`, `bedId`, `BedID`
- **Bed Type**: `Bed Type`, `bed_type`, `bedType`, `Type`
- **Bed Position**: `Bed Position`, `bed_position`, `bedPosition`, `Position`
- **Active**: `Active`, `active`, `Status`

## How to Use

### Exporting Room Configuration

1. Go to the **Room Configuration** tab
2. Click the **Export Room Config** button
3. A CSV file will be downloaded with the current date in the filename

### Importing Room Configuration

1. Go to the **Room Configuration** tab
2. Click the **Import Room Config** button
3. Select your CSV file
4. The system will:
   - Parse the CSV file
   - Create the dormitory structure
   - Preserve existing guest assignments where bed IDs match
   - Update all interfaces automatically

## Important Notes

### Guest Assignment Preservation

- When importing, the system attempts to preserve existing guest assignments
- If a bed ID in the imported CSV matches an existing bed ID with an assigned guest, that assignment is maintained
- Guests assigned to beds that no longer exist will be moved to the unassigned list

### Data Validation

- **Required Field**: Only "Dormitory Name" is required
- **Room Gender**: Defaults to "Coed" if not specified
- **Bed Type**: Defaults to "single" if not specified
- **Active Status**: Defaults to "true" if not specified or if value is not "false"

### File Format

- Files must have a `.csv` extension
- CSV should be UTF-8 encoded
- Commas in data fields should be properly quoted
- The system handles quoted fields and escaped quotes automatically

## Example CSV Structure

```csv
Dormitory Name,Room Name,Room Gender,Bed ID,Bed Type,Bed Position,Active
Main Building,Men's Dorm A,M,MA01,lower,1,true
Main Building,Men's Dorm A,M,MA02,upper,2,true
Main Building,Women's Dorm A,F,WA01,single,1,true
Family Building,Family Room,Coed,FR01,single,1,true
```

## Troubleshooting

### Common Import Errors

1. **"Missing required columns"**: Ensure your CSV has at least a "Dormitory Name" column
2. **"No valid dormitory data found"**: Check that your CSV has data rows with dormitory names
3. **"Please select a CSV file"**: Ensure the file has a `.csv` extension

### Data Recovery

- The system automatically saves configurations to localStorage
- If an import fails, your previous configuration remains unchanged
- You can always export your current configuration as a backup before importing

## Advanced Features

### Bulk Modifications

You can modify the exported CSV in a spreadsheet application to:
- Add new dormitories and rooms
- Change room gender designations
- Modify bed types
- Reorganize bed positions
- Activate/deactivate rooms

### Configuration Templates

Save exported CSV files as templates for different retreat configurations:
- `summer_retreat_config.csv`
- `winter_retreat_config.csv`
- `family_retreat_config.csv`

## Sample Files

See `sample_room_config.csv` for a complete example of the proper CSV format.