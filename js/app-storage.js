/**
 * App Storage Module
 * 
 * This module provides all data persistence functionality for the Dorm Assignment Tool.
 * It handles localStorage operations, data migration, backup and recovery functionality,
 * and data structure validation for persistence.
 * 
 * Uses the mixin pattern to provide storage methods to the main application class.
 * 
 * @module AppStorage
 */

/**
 * Storage utilities mixin for the Dorm Assignment Tool
 * Contains all localStorage operations and data migration logic
 */
const AppStorage = {
    /**
     * Current data version for migration purposes
     * @type {string}
     */
    DATA_VERSION: '2.0',
    
    /**
     * LocalStorage key for storing application data
     * @type {string}
     */
    STORAGE_KEY: 'dormAssignments',
    
    /**
     * Saves the complete application state to localStorage
     * Includes guests, assignments, dormitories, settings, and assignment history
     * 
     * @method saveToLocalStorage
     * @returns {void}
     */
    saveToLocalStorage() {
        try {
            const data = {
                guests: this.guests,
                assignments: Array.from(this.assignments.entries()),
                dormitories: this.dormitories,
                settings: this.settings,
                assignmentHistory: this.assignmentHistory.map(state => ({
                    assignments: Array.from(state.assignments.entries()),
                    rooms: state.rooms,
                    dormitories: state.dormitories || null
                })),
                version: this.DATA_VERSION || '2.0' // Version for data migration
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            
            // Optional: Create backup with timestamp
            this.createBackup(data);
            
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            // Optionally show user notification
            if (typeof this.showStatus === 'function') {
                this.showStatus('Error saving data. Please try again.', 'error');
            }
        }
    },

    /**
     * Loads application state from localStorage
     * Handles version detection and migration of older data formats
     * 
     * @method loadFromLocalStorage
     * @returns {void}
     */
    loadFromLocalStorage() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved) {
            return; // No saved data, use defaults
        }
        
        try {
            const data = JSON.parse(saved);
            
            // Validate basic data structure
            if (!this.validateStorageData(data)) {
                console.error('Invalid storage data structure');
                return;
            }
            
            // Load guest data
            this.guests = data.guests || [];
            
            // Load assignments
            this.assignments = new Map(data.assignments || []);
            
            // Settings are now managed externally - skip settings loading
            // this.loadSettings(data.settings);
            
            // Check if we have the new dormitory structure or need to migrate
            if (data.version === '2.0' && data.dormitories) {
                // Load new dormitory structure
                this.dormitories = data.dormitories;
                
                // Load assignment history with dormitory structure
                this.assignmentHistory = (data.assignmentHistory || []).map(state => ({
                    assignments: new Map(state.assignments || []),
                    rooms: state.rooms,
                    dormitories: state.dormitories
                }));
            } else {
                // Migrate from old structure
                this.migrateFromOldStructure(data);
            }
            
            // Regenerate flat rooms array
            this.rooms = this.getFlatRoomsList();
            
            // Restore guest assignments to beds
            this.restoreGuestAssignments();
            
            // Update UI if guests exist
            if (this.guests.length > 0) {
                this.updateInterfaceAfterLoad();
            }
            
        } catch (error) {
            console.error('Error loading saved data:', error);
            
            // Attempt to recover from backup
            if (this.attemptBackupRecovery()) {
                return;
            }
            
            // If loading fails, keep default dormitory structure
            this.initializeRooms();
        }
    },

    /**
     * Migrates data from old structure to new dormitory-based structure
     * Maintains backward compatibility with older data formats
     * 
     * @method migrateFromOldStructure
     * @param {Object} data - The old data structure to migrate
     * @returns {void}
     */
    migrateFromOldStructure(data) {
        // Migration logic from old rooms structure to new dormitory structure
        console.log('Migrating from old data structure to new dormitory structure...');
        
        // Check if we have old rooms data to migrate
        if (data.rooms && Array.isArray(data.rooms)) {
            // Create a default dormitory to hold migrated rooms
            const migratedDormitory = {
                dormitoryName: "Main Building",
                active: true,
                rooms: []
            };
            
            // Migrate rooms
            data.rooms.forEach(room => {
                const migratedRoom = {
                    roomName: room.roomName,
                    roomGender: room.roomGender,
                    active: room.active !== undefined ? room.active : true,
                    beds: room.beds || []
                };
                
                // Ensure beds have proper structure
                migratedRoom.beds = migratedRoom.beds.map((bed, index) => ({
                    bedId: bed.bedId || `MIG${index + 1}`,
                    bedType: bed.bedType || 'single',
                    assignedGuestId: bed.assignedGuestId || null,
                    position: bed.position || (index + 1)
                }));
                
                migratedDormitory.rooms.push(migratedRoom);
            });
            
            this.dormitories = [migratedDormitory];
        } else {
            // No old rooms data, use default structure
            this.initializeRooms();
        }
        
        // Migrate assignment history (without dormitory structure for old entries)
        this.assignmentHistory = (data.assignmentHistory || []).map(state => ({
            assignments: new Map(state.assignments || []),
            rooms: state.rooms,
            dormitories: null // Old history doesn't have dormitory structure
        }));
        
        // Save the migrated data immediately
        this.saveToLocalStorage();
        
        console.log('Migration completed successfully');
    },

    /**
     * Validates the structure of storage data
     * Ensures required fields are present and have expected types
     * 
     * @method validateStorageData
     * @param {Object} data - The data to validate
     * @returns {boolean} True if data structure is valid
     */
    validateStorageData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Check for required fields
        const requiredFields = ['guests', 'assignments'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                console.warn(`Missing required field: ${field}`);
                return false;
            }
        }
        
        // Validate guests array
        if (!Array.isArray(data.guests)) {
            console.warn('Guests field must be an array');
            return false;
        }
        
        // Validate assignments array
        if (!Array.isArray(data.assignments)) {
            console.warn('Assignments field must be an array');
            return false;
        }
        
        // Validate dormitories if present
        if (data.dormitories && !Array.isArray(data.dormitories)) {
            console.warn('Dormitories field must be an array');
            return false;
        }
        
        // Validate version if present
        if (data.version && typeof data.version !== 'string') {
            console.warn('Version field must be a string');
            return false;
        }
        
        return true;
    },

    /**
     * Creates a timestamped backup of the current data
     * Provides recovery option in case of data corruption
     * 
     * @method createBackup
     * @param {Object} data - The data to backup
     * @returns {void}
     */
    createBackup(data) {
        try {
            const timestamp = new Date().toISOString();
            const backupKey = `${this.STORAGE_KEY}_backup_${timestamp}`;
            
            // Only keep last 5 backups to prevent localStorage bloat
            this.cleanupOldBackups();
            
            localStorage.setItem(backupKey, JSON.stringify({
                ...data,
                backupTimestamp: timestamp
            }));
            
        } catch (error) {
            console.warn('Could not create backup:', error);
        }
    },

    /**
     * Attempts to recover from the most recent backup
     * Called when primary data loading fails
     * 
     * @method attemptBackupRecovery
     * @returns {boolean} True if recovery was successful
     */
    attemptBackupRecovery() {
        try {
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith(`${this.STORAGE_KEY}_backup_`))
                .sort()
                .reverse(); // Most recent first
            
            if (backupKeys.length === 0) {
                console.warn('No backups available for recovery');
                return false;
            }
            
            const latestBackupKey = backupKeys[0];
            const backupData = JSON.parse(localStorage.getItem(latestBackupKey));
            
            if (!this.validateStorageData(backupData)) {
                console.warn('Backup data is also invalid');
                return false;
            }
            
            console.log('Attempting recovery from backup:', latestBackupKey);
            
            // Recursively load the backup data
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backupData));
            this.loadFromLocalStorage();
            
            if (typeof this.showStatus === 'function') {
                this.showStatus('Data recovered from backup', 'success');
            }
            
            return true;
            
        } catch (error) {
            console.error('Backup recovery failed:', error);
            return false;
        }
    },

    /**
     * Removes old backups to prevent localStorage bloat
     * Keeps only the 5 most recent backups
     * 
     * @method cleanupOldBackups
     * @returns {void}
     */
    cleanupOldBackups() {
        try {
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith(`${this.STORAGE_KEY}_backup_`))
                .sort()
                .reverse(); // Most recent first
            
            // Remove all but the 5 most recent backups
            if (backupKeys.length >= 5) {
                backupKeys.slice(5).forEach(key => {
                    localStorage.removeItem(key);
                });
            }
            
        } catch (error) {
            console.warn('Could not cleanup old backups:', error);
        }
    },

    /**
     * Restores guest assignments to their beds after loading
     * Maintains the connection between guests and their assigned beds
     * 
     * @method restoreGuestAssignments
     * @returns {void}
     */
    restoreGuestAssignments() {
        this.assignments.forEach((bedId, guestId) => {
            const bed = this.findBed(bedId);
            if (bed) {
                bed.assignedGuestId = guestId;
            } else {
                console.warn(`Bed ${bedId} not found for guest ${guestId}`);
                // Remove invalid assignment
                this.assignments.delete(guestId);
            }
        });
    },

    /**
     * Updates the user interface after successful data load
     * Refreshes all relevant UI components
     * 
     * @method updateInterfaceAfterLoad
     * @returns {void}
     */
    updateInterfaceAfterLoad() {
        if (typeof this.renderGuestsTable === 'function') {
            this.renderGuestsTable();
        }
        
        if (typeof this.renderRooms === 'function') {
            this.renderRooms();
        }
        
        if (typeof this.updateCounts === 'function') {
            this.updateCounts();
        }
        
        if (typeof this.updateUndoButton === 'function') {
            this.updateUndoButton();
        }
        
        // Show action buttons
        const exportBtn = document.getElementById('exportBtn');
        const clearBtn = document.getElementById('clearBtn');
        const undoBtn = document.getElementById('undoBtn');
        
        if (exportBtn) exportBtn.style.display = 'inline-block';
        if (clearBtn) clearBtn.style.display = 'inline-block';
        if (undoBtn) undoBtn.style.display = 'inline-block';
    },

    /**
     * Clears all stored data and backups
     * Provides a clean slate for testing or resetting
     * 
     * @method clearStorageData
     * @returns {void}
     */
    clearStorageData() {
        try {
            // Remove main storage
            localStorage.removeItem(this.STORAGE_KEY);
            
            // Remove all backups
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith(`${this.STORAGE_KEY}_backup_`));
            
            backupKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log('All storage data cleared');
            
        } catch (error) {
            console.error('Error clearing storage data:', error);
        }
    },

    /**
     * Exports current data as JSON for backup purposes
     * Useful for manual backups or data migration
     * 
     * @method exportStorageData
     * @returns {string} JSON string of current data
     */
    exportStorageData() {
        try {
            const data = {
                guests: this.guests,
                assignments: Array.from(this.assignments.entries()),
                dormitories: this.dormitories,
                settings: this.settings,
                assignmentHistory: this.assignmentHistory.map(state => ({
                    assignments: Array.from(state.assignments.entries()),
                    rooms: state.rooms,
                    dormitories: state.dormitories || null
                })),
                version: this.DATA_VERSION || '2.0',
                exportTimestamp: new Date().toISOString()
            };
            
            return JSON.stringify(data, null, 2);
            
        } catch (error) {
            console.error('Error exporting storage data:', error);
            return null;
        }
    },

    /**
     * Imports data from JSON string
     * Validates and loads external data
     * 
     * @method importStorageData
     * @param {string} jsonString - JSON string containing data to import
     * @returns {boolean} True if import was successful
     */
    importStorageData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!this.validateStorageData(data)) {
                console.error('Invalid import data structure');
                return false;
            }
            
            // Save current data as backup before importing
            this.createBackup({
                guests: this.guests,
                assignments: Array.from(this.assignments.entries()),
                dormitories: this.dormitories,
                settings: this.settings,
                assignmentHistory: this.assignmentHistory.map(state => ({
                    assignments: Array.from(state.assignments.entries()),
                    rooms: state.rooms,
                    dormitories: state.dormitories || null
                })),
                version: this.DATA_VERSION || '2.0'
            });
            
            // Import the data
            localStorage.setItem(this.STORAGE_KEY, jsonString);
            this.loadFromLocalStorage();
            
            if (typeof this.showStatus === 'function') {
                this.showStatus('Data imported successfully', 'success');
            }
            
            return true;
            
        } catch (error) {
            console.error('Error importing storage data:', error);
            if (typeof this.showStatus === 'function') {
                this.showStatus('Error importing data: ' + error.message, 'error');
            }
            return false;
        }
    },

    /**
     * Gets storage usage statistics
     * Helpful for monitoring localStorage usage
     * 
     * @method getStorageStats
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        try {
            const mainData = localStorage.getItem(this.STORAGE_KEY);
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith(`${this.STORAGE_KEY}_backup_`));
            
            const mainSize = mainData ? mainData.length : 0;
            const backupSize = backupKeys.reduce((total, key) => {
                const item = localStorage.getItem(key);
                return total + (item ? item.length : 0);
            }, 0);
            
            return {
                mainDataSize: mainSize,
                backupDataSize: backupSize,
                totalSize: mainSize + backupSize,
                backupCount: backupKeys.length,
                lastModified: this.getLastModifiedTime()
            };
            
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return null;
        }
    },

    /**
     * Gets the last modified time from storage data
     * 
     * @method getLastModifiedTime
     * @returns {string|null} ISO timestamp or null if not available
     */
    getLastModifiedTime() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (!saved) return null;
            
            const data = JSON.parse(saved);
            return data.lastModified || null;
            
        } catch (error) {
            return null;
        }
    }
};

// Export the storage utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppStorage;
}