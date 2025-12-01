/**
 * Settings Module for Dorm Assignment Tool
 * 
 * This module contains all settings-related functionality for the DormAssignmentTool.
 * It provides methods for managing application settings including:
 * - Default settings initialization
 * - Settings validation and loading
 * - UI rendering and updates
 * - Import/export functionality
 * - Local storage persistence
 * 
 * The module uses the mixin pattern to extend the DormAssignmentTool prototype.
 * 
 * @module app-settings
 * @requires DormAssignmentTool
 */

Object.assign(DormAssignmentTool.prototype, {

    // ================================
    // SETTINGS INITIALIZATION
    // ================================

    /**
     * Returns the default settings configuration for the application
     * @returns {Object} Default settings object
     */
    getDefaultSettings() {
        return {
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
                    { name: 'families', weight: 8, enabled: true, label: 'Keep Families Together' },
                    { name: 'bunkPreference', weight: 6, enabled: true, label: 'Bunk Preferences' },
                    { name: 'ageCompatibility', weight: 4, enabled: false, label: 'Age Compatibility' }
                ],
                allowConstraintRelaxation: true
            },
            version: "1.0"
        };
    },

    // ================================
    // SETTINGS LOADING AND VALIDATION
    // ================================

    /**
     * Loads and validates saved settings, merging them with defaults
     * @param {Object} savedSettings - Previously saved settings object
     */
    loadSettings(savedSettings) {
        // Validate and merge settings with defaults
        if (!savedSettings || typeof savedSettings !== 'object') {
            // No saved settings or invalid, use defaults
            return;
        }
        
        try {
            // Merge saved settings with defaults to ensure all required fields exist
            const mergedSettings = {
                warnings: {
                    genderMismatch: this.settings.warnings.genderMismatch,
                    bunkPreference: this.settings.warnings.bunkPreference,
                    familySeparation: this.settings.warnings.familySeparation,
                    roomAvailability: this.settings.warnings.roomAvailability
                },
                display: {
                    showAgeHistograms: this.settings.display.showAgeHistograms
                },
                autoPlacement: {
                    enabled: this.settings.autoPlacement.enabled,
                    priorities: JSON.parse(JSON.stringify(this.settings.autoPlacement.priorities)),
                    allowConstraintRelaxation: this.settings.autoPlacement.allowConstraintRelaxation
                },
                version: this.settings.version
            };
            
            // Apply saved settings where valid
            if (savedSettings.warnings) {
                if (typeof savedSettings.warnings.genderMismatch === 'boolean') {
                    mergedSettings.warnings.genderMismatch = savedSettings.warnings.genderMismatch;
                }
                if (typeof savedSettings.warnings.bunkPreference === 'boolean') {
                    mergedSettings.warnings.bunkPreference = savedSettings.warnings.bunkPreference;
                }
                if (typeof savedSettings.warnings.familySeparation === 'boolean') {
                    mergedSettings.warnings.familySeparation = savedSettings.warnings.familySeparation;
                }
                if (typeof savedSettings.warnings.roomAvailability === 'boolean') {
                    mergedSettings.warnings.roomAvailability = savedSettings.warnings.roomAvailability;
                }
            }
            
            if (savedSettings.display) {
                if (typeof savedSettings.display.showAgeHistograms === 'boolean') {
                    mergedSettings.display.showAgeHistograms = savedSettings.display.showAgeHistograms;
                }
            }

            if (savedSettings.autoPlacement) {
                if (typeof savedSettings.autoPlacement.enabled === 'boolean') {
                    mergedSettings.autoPlacement.enabled = savedSettings.autoPlacement.enabled;
                }
                if (Array.isArray(savedSettings.autoPlacement.priorities)) {
                    // Merge saved priorities with defaults to ensure new priorities are added
                    const defaultPriorities = APP_CONSTANTS.DEFAULT_SETTINGS.autoPlacement.priorities;
                    const savedPriorities = savedSettings.autoPlacement.priorities;

                    // Create a map of saved priorities by name for quick lookup
                    const savedPriorityMap = new Map(savedPriorities.map(p => [p.name, p]));

                    // Merge: use saved values where available, add new defaults where not
                    mergedSettings.autoPlacement.priorities = defaultPriorities.map(defaultPriority => {
                        const savedPriority = savedPriorityMap.get(defaultPriority.name);
                        if (savedPriority) {
                            // Keep saved priority's settings
                            return savedPriority;
                        } else {
                            // Add new priority from defaults
                            return defaultPriority;
                        }
                    });
                }
                if (typeof savedSettings.autoPlacement.allowConstraintRelaxation === 'boolean') {
                    mergedSettings.autoPlacement.allowConstraintRelaxation = savedSettings.autoPlacement.allowConstraintRelaxation;
                }
            }

            // Update the settings object
            this.settings = mergedSettings;
            
        } catch (error) {
            console.error('Error loading settings, using defaults:', error);
            // Keep default settings if loading fails
        }
    },

    /**
     * Updates settings with new values and applies changes immediately
     * @param {Object} newSettings - New settings to apply
     * @returns {boolean} Success status
     */
    updateSettings(newSettings) {
        // Validate and update settings with immediate effect
        if (!newSettings || typeof newSettings !== 'object') {
            return false;
        }
        
        try {
            // Merge new settings with existing ones
            const updatedSettings = JSON.parse(JSON.stringify(this.settings));
            
            if (newSettings.warnings) {
                if (typeof newSettings.warnings.genderMismatch === 'boolean') {
                    updatedSettings.warnings.genderMismatch = newSettings.warnings.genderMismatch;
                }
                if (typeof newSettings.warnings.bunkPreference === 'boolean') {
                    updatedSettings.warnings.bunkPreference = newSettings.warnings.bunkPreference;
                }
                if (typeof newSettings.warnings.familySeparation === 'boolean') {
                    updatedSettings.warnings.familySeparation = newSettings.warnings.familySeparation;
                }
                if (typeof newSettings.warnings.roomAvailability === 'boolean') {
                    updatedSettings.warnings.roomAvailability = newSettings.warnings.roomAvailability;
                }
            }
            
            if (newSettings.display) {
                if (typeof newSettings.display.showAgeHistograms === 'boolean') {
                    updatedSettings.display.showAgeHistograms = newSettings.display.showAgeHistograms;
                }
            }

            if (newSettings.autoPlacement) {
                if (typeof newSettings.autoPlacement.enabled === 'boolean') {
                    updatedSettings.autoPlacement.enabled = newSettings.autoPlacement.enabled;
                }
                if (Array.isArray(newSettings.autoPlacement.priorities)) {
                    updatedSettings.autoPlacement.priorities = newSettings.autoPlacement.priorities;
                }
                if (typeof newSettings.autoPlacement.allowConstraintRelaxation === 'boolean') {
                    updatedSettings.autoPlacement.allowConstraintRelaxation = newSettings.autoPlacement.allowConstraintRelaxation;
                }
            }

            // Apply the updated settings
            this.settings = updatedSettings;
            
            // Refresh the UI to apply changes immediately
            this.refreshUIAfterSettingsChange();
            
            // Save to localStorage
            this.saveToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    },

    /**
     * Validates the structure of a settings object
     * @param {Object} settings - Settings object to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validateSettingsStructure(settings) {
        // Check if the imported settings have the required structure
        if (!settings || typeof settings !== 'object') return false;
        if (!settings.warnings || typeof settings.warnings !== 'object') return false;
        if (!settings.display || typeof settings.display !== 'object') return false;
        
        // Check for required warning settings
        const requiredWarnings = ['genderMismatch', 'bunkPreference', 'familySeparation', 'roomAvailability'];
        for (const warning of requiredWarnings) {
            if (typeof settings.warnings[warning] !== 'boolean') {
                return false;
            }
        }
        
        // Check display settings
        if (typeof settings.display.showAgeHistograms !== 'boolean') {
            return false;
        }
        
        return true;
    },

    // ================================
    // UI RENDERING AND UPDATES
    // ================================

    /**
     * Renders the settings UI with current values
     */
    renderSettings() {
        // Update settings UI with current values
        document.getElementById('showAgeHistograms').checked = this.settings.display.showAgeHistograms;
        document.getElementById('genderMismatchWarnings').checked = this.settings.warnings.genderMismatch;
        document.getElementById('bunkPreferenceWarnings').checked = this.settings.warnings.bunkPreference;
        document.getElementById('familySeparationWarnings').checked = this.settings.warnings.familySeparation;
        document.getElementById('roomAvailabilityWarnings').checked = this.settings.warnings.roomAvailability;

        // Auto-placement settings
        document.getElementById('autoPlacementEnabled').checked = this.settings.autoPlacement.enabled;
        document.getElementById('allowConstraintRelaxation').checked = this.settings.autoPlacement.allowConstraintRelaxation;

        // Render priorities list
        this.renderPrioritiesList();
    },

    /**
     * Renders the draggable priorities list
     */
    renderPrioritiesList() {
        const container = document.getElementById('prioritiesList');
        if (!container) return;

        container.innerHTML = '';

        this.settings.autoPlacement.priorities.forEach((priority, index) => {
            const item = document.createElement('div');
            item.className = 'priority-item';
            item.draggable = true;
            item.dataset.index = index;
            item.dataset.priorityName = priority.name;

            item.innerHTML = `
                <div class="priority-drag-handle"></div>
                <div class="priority-content">
                    <div class="priority-header">
                        <span class="priority-label">${priority.label}</span>
                        <span class="priority-weight">Weight: ${priority.weight}</span>
                    </div>
                </div>
                <div class="priority-toggle">
                    <input type="checkbox"
                           ${priority.enabled ? 'checked' : ''}
                           data-priority="${priority.name}"
                           class="priority-checkbox">
                </div>
            `;

            container.appendChild(item);
        });

        // Add drag and drop event listeners
        this.setupPriorityDragAndDrop();

        // Add checkbox event listeners
        container.querySelectorAll('.priority-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const priorityName = e.target.dataset.priority;
                const priority = this.settings.autoPlacement.priorities.find(p => p.name === priorityName);
                if (priority) {
                    priority.enabled = e.target.checked;
                    this.saveToLocalStorage();
                }
            });
        });
    },

    /**
     * Sets up drag-and-drop functionality for priority list
     */
    setupPriorityDragAndDrop() {
        const items = document.querySelectorAll('.priority-item');
        let draggedItem = null;

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.innerHTML);
            });

            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                items.forEach(i => i.classList.remove('drag-over'));
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                if (draggedItem && item !== draggedItem) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (draggedItem && item !== draggedItem) {
                    const fromIndex = parseInt(draggedItem.dataset.index);
                    const toIndex = parseInt(item.dataset.index);

                    // Reorder priorities array
                    const priorities = this.settings.autoPlacement.priorities;
                    const [movedItem] = priorities.splice(fromIndex, 1);
                    priorities.splice(toIndex, 0, movedItem);

                    // Update weights based on new order (highest first)
                    priorities.forEach((p, idx) => {
                        p.weight = 10 - (idx * 2); // 10, 8, 6, 4, etc.
                    });

                    // Re-render and save
                    this.renderPrioritiesList();
                    this.saveToLocalStorage();
                }

                items.forEach(i => i.classList.remove('drag-over'));
            });
        });
    },

    /**
     * Refreshes the UI after settings changes
     */
    refreshUIAfterSettingsChange() {
        // Re-render components that depend on settings
        if (this.guests.length > 0) {
            this.renderGuestsTable();
            this.renderRooms();
        }
        
        // Update any settings-dependent UI elements
        // (This would include room card histograms when that feature is implemented)
    },

    /**
     * Applies settings changes to the current UI
     */
    applySettingsChanges() {
        // Re-render components that depend on settings
        if (this.currentTab === 'assignment') {
            this.renderGuestsTable();
            this.renderRooms();
        }
    },

    // ================================
    // INDIVIDUAL SETTING UPDATES
    // ================================

    /**
     * Updates a specific setting using a dot-notation path
     * @param {string} path - Dot-separated path to the setting (e.g., 'warnings.ageGap.enabled')
     * @param {*} value - New value for the setting
     */
    updateSetting(path, value) {
        // Parse the path and update the setting
        const pathParts = path.split('.');
        let current = this.settings;
        
        // Navigate to the parent object
        for (let i = 0; i < pathParts.length - 1; i++) {
            current = current[pathParts[i]];
        }
        
        // Update the final property
        current[pathParts[pathParts.length - 1]] = value;
        
        // Special case handling removed (age gap settings removed)
        
        // Re-render affected components
        this.applySettingsChanges();
        
        // Save to localStorage
        this.saveSettingsToLocalStorage();
    },

    // Age gap threshold method removed

    // ================================
    // SETTINGS RESET
    // ================================

    /**
     * Resets all settings to their default values
     */
    resetSettingsToDefaults() {
        // Reset all settings to their default values
        this.settings = {
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
                    { name: 'families', weight: 8, enabled: true, label: 'Keep Families Together' },
                    { name: 'bunkPreference', weight: 6, enabled: true, label: 'Bunk Preferences' },
                    { name: 'ageCompatibility', weight: 4, enabled: false, label: 'Age Compatibility' }
                ],
                allowConstraintRelaxation: true
            },
            version: "1.0"
        };

        // Refresh the UI
        this.refreshUIAfterSettingsChange();

        // Save to localStorage
        this.saveToLocalStorage();
    },

    /**
     * Resets settings with user confirmation
     */
    resetSettings() {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
            this.settings = this.getDefaultSettings();
            this.renderSettings();
            this.applySettingsChanges();
            this.saveSettingsToLocalStorage();
            this.showStatus('Settings reset to defaults', 'success');
        }
    },

    // ================================
    // IMPORT/EXPORT FUNCTIONALITY
    // ================================

    /**
     * Exports current settings as a JSON file
     */
    exportSettings() {
        try {
            const settingsJson = JSON.stringify(this.settings, null, 2);
            const blob = new Blob([settingsJson], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monastery_settings_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
            this.showStatus('Settings exported successfully', 'success');
        } catch (error) {
            this.showStatus('Error exporting settings: ' + error.message, 'error');
        }
    },

    /**
     * Triggers the file input for importing settings
     */
    importSettingsClick() {
        document.getElementById('settingsFile').click();
    },

    /**
     * Imports settings from a selected file
     * @param {Event} event - File input change event
     */
    importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showStatus('Please select a JSON file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSettings = JSON.parse(e.target.result);
                
                // Validate settings structure
                if (this.validateSettingsStructure(importedSettings)) {
                    this.settings = { ...this.getDefaultSettings(), ...importedSettings };
                    this.renderSettings();
                    this.applySettingsChanges();
                    this.saveSettingsToLocalStorage();
                    this.showStatus('Settings imported successfully', 'success');
                } else {
                    this.showStatus('Invalid settings file format', 'error');
                }
            } catch (error) {
                this.showStatus('Error importing settings: ' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showStatus('Error reading file', 'error');
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    },

    // ================================
    // LOCAL STORAGE PERSISTENCE
    // ================================

    /**
     * Saves current settings to localStorage
     */
    saveSettingsToLocalStorage() {
        try {
            localStorage.setItem('monasterySettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings to localStorage:', error);
        }
    },

    /**
     * Loads settings from localStorage
     */
    loadSettingsFromLocalStorage() {
        try {
            const saved = localStorage.getItem('monasterySettings');
            if (saved) {
                const savedSettings = JSON.parse(saved);
                if (this.validateSettingsStructure(savedSettings)) {
                    // Merge saved settings with defaults to handle version upgrades
                    this.settings = { ...this.getDefaultSettings(), ...savedSettings };
                } else {
                    console.warn('Invalid settings structure in localStorage, using defaults');
                    this.settings = this.getDefaultSettings();
                }
            }
        } catch (error) {
            console.error('Error loading settings from localStorage:', error);
            this.settings = this.getDefaultSettings();
        }
    }

});