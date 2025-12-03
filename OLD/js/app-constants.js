/**
 * Application constants and configuration values
 */

const APP_CONSTANTS = {
    // Data and storage
    DATA_VERSION: '2.0',
    SETTINGS_VERSION: '1.0',
    STORAGE_KEY: 'dormAssignments',
    HISTORY_SIZE: 10,
    
    // Default values
    DEFAULT_COLORS: {
        DORMITORY: '#f8f9fa',
        ACCENT: '#4299e1'
    },
    
    // Bed and room configuration
    BED_TYPES: ['upper', 'lower', 'single'],
    ROOM_GENDERS: ['M', 'F', 'Coed'],
    
    // CSV parsing
    CSV_FIELD_MAPPINGS: {
        'firstName': ['firstName', 'FIRST NAME', 'First Name', 'first_name'],
        'lastName': ['lastName', 'LAST NAME', 'Last Name', 'last_name'],
        'preferredName': ['preferredName', 'PREFERRED NAME', 'Preferred Name', 'preferred_name'],
        'gender': ['gender', 'GENDER', 'Gender'],
        'age': ['age', 'AGE', 'Age'],
        'groupName': ['groupName', 'GROUP NAME', 'Group Name', 'group_name', 'GroupName', 'GROUP'],
        'lowerBunk': ['lowerBunk', 'LOWER BUNK', 'Lower Bunk', 'lower_bunk', 'Lower bunk?', 'lowerBunk?'],
        'arrival': ['arrival', 'ARRIVAL', 'Arrival', 'arrival_date'],
        'departure': ['departure', 'DEPARTURE', 'Departure', 'departure_date']
    },
    
    // UI Messages
    MESSAGES: {
        NO_GUESTS: 'No guests loaded. Upload a CSV file to begin assigning guests to dormitory beds.',
        NO_ROOMS: 'No rooms configured. Room layout will appear here once guest data is loaded.',
        NO_DORMITORIES: 'No dormitories configured. Click "Add Dormitory" to create your first dormitory.',
        ALL_ASSIGNED: 'All guests have been assigned to rooms.',
        SELECT_DORMITORY: 'Select a dormitory to configure its rooms.',
        NO_DORMITORY_SELECTED: 'No dormitory selected'
    },
    
    // Validation settings
    DEFAULT_SETTINGS: {
        warnings: {
            genderMismatch: true,
            bunkPreference: true,
            familySeparation: true,
            roomAvailability: true
        },
        display: {
            showAgeHistograms: true
        },
        autoPlacement: {
            enabled: true,
            priorities: [
                { name: 'gender', weight: 10, enabled: true, label: 'Gender Matching' },
                { name: 'genderedRoomPreference', weight: 9, enabled: true, label: 'Prefer Gendered Rooms over Co-ed' },
                { name: 'families', weight: 8, enabled: true, label: 'Keep Families Together' },
                { name: 'bunkPreference', weight: 6, enabled: true, label: 'Bunk Preferences' },
                { name: 'ageCompatibility', weight: 4, enabled: false, label: 'Age Compatibility' }
            ],
            allowConstraintRelaxation: true
        },
        version: "1.0"
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONSTANTS;
}