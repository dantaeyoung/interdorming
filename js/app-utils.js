/**
 * App Utilities Module
 * 
 * This module provides pure utility functions that have no dependencies
 * and can be used across the application. These functions are stateless
 * and do not interact with the DOM or application state.
 * 
 * @module AppUtils
 */

/**
 * Utility functions mixin for the Dorm Assignment Tool
 * Contains pure utility functions with no external dependencies
 */
const AppUtils = {
    /**
     * Parses a CSV row handling quoted fields and escaped quotes
     * @param {string} row - The CSV row to parse
     * @returns {string[]} Array of parsed values
     */
    parseCSVRow(row) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                if (!inQuotes) {
                    inQuotes = true;
                } else if (i + 1 < row.length && row[i + 1] === '"') {
                    // Handle escaped quotes
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = false;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
        return values;
    },

    /**
     * Generates a unique bed ID based on room name and bed count
     * @param {string} roomName - The name of the room
     * @param {number} bedCount - Current number of beds in the room
     * @returns {string} Generated bed ID
     */
    generateBedId(roomName, bedCount) {
        // Generate a unique bed ID based on room name and bed count
        // Extract meaningful letters from room name
        const words = roomName.split(' ');
        let roomPrefix = '';
        
        if (words.length >= 2) {
            // Take first letter of each word
            roomPrefix = words.map(word => word.charAt(0)).join('').toUpperCase();
        } else {
            // Take first 2-3 letters of the room name
            roomPrefix = roomName.substring(0, Math.min(3, roomName.length)).toUpperCase();
        }
        
        const bedNumber = (bedCount + 1).toString().padStart(2, '0');
        return `${roomPrefix}${bedNumber}`;
    },

    /**
     * Escapes a CSV field by wrapping in quotes if it contains special characters
     * @param {any} field - The field value to escape
     * @returns {string} Escaped CSV field
     */
    escapeCSVField(field) {
        // Escape CSV field by wrapping in quotes if it contains comma, quote, or newline
        if (field == null || field === undefined) {
            return '';
        }
        
        const value = String(field);
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
            // Escape quotes by doubling them and wrap in quotes
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    },

    /**
     * Formats a date value for display
     * @param {string|Date} dateValue - The date value to format
     * @returns {string} Formatted date string or empty string if invalid
     */
    formatDate(dateValue) {
        if (!dateValue) return '';
        
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            return dateValue; // Return original if not a valid date
        }
        
        return date.toLocaleDateString();
    },

    /**
     * Normalizes gender values to standardized format
     * @param {string} gender - The gender value to normalize
     * @returns {string} Normalized gender ('M' or 'F')
     */
    normalizeGender(gender) {
        if (!gender) return '';
        
        const normalized = gender.toString().trim().toUpperCase();
        if (['M', 'MALE'].includes(normalized)) return 'M';
        if (['F', 'FEMALE'].includes(normalized)) return 'F';
        
        return normalized.charAt(0); // Return first character if not recognized
    },

    /**
     * Converts boolean-like values to actual boolean
     * @param {any} value - The value to convert
     * @returns {boolean} Boolean representation
     */
    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (!value) return false;
        
        const stringValue = value.toString().toLowerCase().trim();
        return ['yes', 'true', '1', 'on'].includes(stringValue);
    },

    /**
     * Safely parses integer values
     * @param {any} value - The value to parse
     * @param {number} defaultValue - Default value if parsing fails
     * @returns {number} Parsed integer or default value
     */
    parseInteger(value, defaultValue = 0) {
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    },

    /**
     * Creates a display name from first name and preferred name
     * @param {Object} person - Person object with firstName and preferredName
     * @returns {string} Display name
     */
    createDisplayName(person) {
        if (!person) return '';
        
        const preferred = person.preferredName || '';
        const first = person.firstName || '';
        
        if (preferred && preferred !== first) {
            return `${preferred} (${first})`;
        }
        
        return preferred || first;
    },

    /**
     * Generates a timestamp-based filename
     * @param {string} baseName - Base filename without extension
     * @param {string} extension - File extension (with or without dot)
     * @returns {string} Timestamped filename
     */
    generateTimestampedFilename(baseName, extension) {
        const timestamp = new Date().toISOString().split('T')[0];
        const ext = extension.startsWith('.') ? extension : `.${extension}`;
        return `${baseName}_${timestamp}${ext}`;
    },

    /**
     * Checks if a string is empty or contains only whitespace
     * @param {string} str - String to check
     * @returns {boolean} True if empty or whitespace only
     */
    isEmptyOrWhitespace(str) {
        return !str || !str.toString().trim();
    },

    /**
     * Truncates text to specified length with ellipsis
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        
        const str = text.toString();
        if (str.length <= maxLength) return str;
        
        return str.substring(0, maxLength - 3) + '...';
    },

    /**
     * Capitalizes the first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        
        const text = str.toString();
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    /**
     * Converts a string to title case
     * @param {string} str - String to convert
     * @returns {string} Title case string
     */
    toTitleCase(str) {
        if (!str) return '';
        
        return str.toString()
            .split(' ')
            .map(word => this.capitalizeFirst(word))
            .join(' ');
    },

    /**
     * Deep clones an object using JSON serialization
     * @param {any} obj - Object to clone
     * @returns {any} Deep cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.warn('Deep clone failed, returning original object:', error);
            return obj;
        }
    },

    /**
     * Validates if a value is a valid email address
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email format
     */
    isValidEmail(email) {
        if (!email) return false;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.toString().trim());
    },

    /**
     * Compares two values for sorting (handles numbers and strings)
     * @param {any} a - First value
     * @param {any} b - Second value
     * @param {string} direction - Sort direction ('asc' or 'desc')
     * @returns {number} Comparison result
     */
    compareValues(a, b, direction = 'asc') {
        // Handle null/undefined values
        if (a == null && b == null) return 0;
        if (a == null) return direction === 'asc' ? -1 : 1;
        if (b == null) return direction === 'asc' ? 1 : -1;
        
        // Convert to comparable values
        let aVal = a;
        let bVal = b;
        
        // Handle numbers
        if (!isNaN(parseFloat(a)) && !isNaN(parseFloat(b))) {
            aVal = parseFloat(a);
            bVal = parseFloat(b);
        } else {
            // Handle strings (case insensitive)
            aVal = a.toString().toLowerCase();
            bVal = b.toString().toLowerCase();
        }
        
        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'asc' ? result : -result;
    }
};

// Export the utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppUtils;
}