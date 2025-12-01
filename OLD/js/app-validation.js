/**
 * Validation Module for Dorm Assignment Tool
 * 
 * This module contains all validation and warning functionality for the DormAssignmentTool.
 * It provides methods for analyzing guest assignments and identifying potential issues:
 * - Gender mismatch validation
 * - Age gap warnings with configurable thresholds
 * - Bunk preference violations
 * - Family/group separation detection
 * - Adult-minor conflict identification
 * - Room availability checking
 * - Settings-aware validation toggling
 * 
 * The module integrates with the settings system to allow users to enable/disable
 * specific types of warnings and configure validation thresholds.
 * 
 * All validation methods preserve their original signatures and implementations
 * to maintain compatibility with existing code.
 * 
 * @module app-validation
 * @requires DormAssignmentTool
 */

const AppValidation = {

    // ================================
    // ASSIGNMENT VALIDATION METHODS
    // ================================

    /**
     * Analyzes a guest assignment and returns a list of warnings
     * This is the main validation method for assigned guests
     * 
     * @param {Object} guest - The guest object to validate
     * @param {Object} bed - The bed object the guest is assigned to
     * @param {Object} room - The room object containing the bed
     * @returns {Array<string>} Array of warning messages
     */
    getAssignmentWarnings(guest, bed, room) {
        const warnings = [];
        
        // Check gender mismatch warnings (non-binary guests don't trigger warnings)
        if (this.settings.warnings.genderMismatch && 
            guest.gender !== room.roomGender && 
            room.roomGender !== 'Coed' &&
            guest.gender !== 'Non-binary/Other') {
            warnings.push(`${guest.gender} guest in ${room.roomGender} room`);
        }
        
        // Check bunk preference violations
        if (this.settings.warnings.bunkPreference && guest.lowerBunk && bed.bedType === 'upper') {
            warnings.push('Needs Lower Bunk');
        }
        
        // Check for family/group separation warnings
        if (this.settings.warnings.familySeparation && guest.groupName && guest.groupName.trim()) {
            const groupMembers = this.guests.filter(g => g.groupName === guest.groupName && g.id !== guest.id);
            const separatedMembers = groupMembers.filter(member => {
                const memberBedId = this.assignments.get(member.id);
                if (!memberBedId) return false; // Not assigned yet
                
                const memberRoom = this.rooms.find(r => r.beds.some(b => b.bedId === memberBedId));
                return memberRoom && memberRoom.roomName !== room.roomName;
            });
            
            if (separatedMembers.length > 0) {
                warnings.push(`${separatedMembers.length} group member(s) in other room(s)`);
            }
        }
        
        // Check for age grouping warnings
        const roommates = room.beds
            .filter(b => b.assignedGuestId && b.assignedGuestId !== guest.id)
            .map(b => this.guests.find(g => g.id === b.assignedGuestId))
            .filter(g => g);
        
        if (roommates.length > 0) {
            const guestAge = parseInt(guest.age) || 0;
            const ageDifferences = roommates.map(roommate => {
                const roommateAge = parseInt(roommate.age) || 0;
                return Math.abs(guestAge - roommateAge);
            });
            
            const maxAgeDiff = Math.max(...ageDifferences);
            
            // Age gap and adult/minor warnings removed - keeping age calculations for potential future use
        }
        
        return warnings;
    },

    /**
     * Analyzes an unassigned guest and returns warnings about potential assignment issues
     * This method checks for systemic problems that would affect any assignment
     * 
     * @param {Object} guest - The unassigned guest object to validate
     * @returns {Array<string>} Array of warning messages
     */
    getAssignmentWarningsForUnassignedGuest(guest) {
        const warnings = [];
        
        // Check room availability for guest's gender
        if (this.settings.warnings.roomAvailability && this.rooms && this.rooms.length > 0) {
            const compatibleRooms = this.rooms.filter(room => 
                room.active && (room.roomGender === guest.gender || room.roomGender === 'Coed' || guest.gender === 'Non-binary/Other')
            );
            
            if (compatibleRooms.length === 0) {
                const genderText = guest.gender === 'M' ? 'male' : 
                                 guest.gender === 'F' ? 'female' : 
                                 'non-binary/other';
                warnings.push(`No ${genderText} rooms available`);
                return warnings; // No point checking further if no compatible rooms
            }
            
            // Check for available beds in compatible rooms
            const availableBeds = compatibleRooms.flatMap(room => 
                room.beds.filter(bed => !bed.assignedGuestId)
            );
            
            if (availableBeds.length === 0) {
                warnings.push('No beds available in compatible rooms');
                return warnings;
            }
            
            // Check for lower bunk requirement
            if (this.settings.warnings.bunkPreference && guest.lowerBunk) {
                const availableLowerBunks = availableBeds.filter(bed => 
                    bed.bedType === 'lower' || bed.bedType === 'single'
                );
                if (availableLowerBunks.length === 0) {
                    warnings.push('No lower bunks available in compatible rooms');
                }
            }
        }
        
        // Check for group separation potential
        if (this.settings.warnings.familySeparation && guest.groupName && guest.groupName.trim()) {
            const groupMembers = this.guests.filter(g => 
                g.groupName === guest.groupName && g.id !== guest.id
            );
            const assignedGroupMembers = groupMembers.filter(member => 
                this.assignments.has(member.id)
            );
            
            if (assignedGroupMembers.length > 0) {
                const groupRooms = new Set();
                assignedGroupMembers.forEach(member => {
                    const bedId = this.assignments.get(member.id);
                    const room = this.rooms.find(r => r.beds.some(b => b.bedId === bedId));
                    if (room) groupRooms.add(room.roomName);
                });
                
                if (groupRooms.size > 1) {
                    warnings.push(`Group already split across ${groupRooms.size} rooms`);
                } else if (groupRooms.size === 1) {
                    // Check if the group's room has available beds
                    const groupRoomName = Array.from(groupRooms)[0];
                    const groupRoom = this.rooms.find(r => r.roomName === groupRoomName);
                    if (groupRoom) {
                        const availableBedsInGroupRoom = groupRoom.beds.filter(bed => !bed.assignedGuestId);
                        if (availableBedsInGroupRoom.length === 0) {
                            warnings.push('No beds available in group\'s room');
                        } else if (this.settings.warnings.bunkPreference && guest.lowerBunk) {
                            const availableLowerBunksInGroupRoom = availableBedsInGroupRoom.filter(bed => 
                                bed.bedType === 'lower' || bed.bedType === 'single'
                            );
                            if (availableLowerBunksInGroupRoom.length === 0) {
                                warnings.push('No lower bunks available in group\'s room');
                            }
                        }
                    }
                }
            }
        }
        
        return warnings;
    },

    // ================================
    // VALIDATION HELPER METHODS
    // ================================

    /**
     * Validates if a guest assignment would be acceptable based on current settings
     * Used for drag-and-drop visual feedback
     * 
     * @param {Object} guest - The guest to validate
     * @param {Object} bed - The target bed
     * @param {Object} room - The room containing the bed
     * @returns {boolean} True if assignment has serious validation issues
     */
    hasSeriousValidationIssues(guest, bed, room) {
        if (!guest || !bed || !room) return false;
        
        const warnings = this.getAssignmentWarnings(guest, bed, room);
        
        // Check for serious warnings that should prevent assignment
        const hasSerious = warnings.some(warning => 
            (this.settings.warnings.genderMismatch && warning.includes('Gender mismatch'))
        );
        
        return hasSerious;
    },

    /**
     * Gets a summary of all current validation issues across all assignments
     * Useful for dashboard displays or export reports
     * 
     * @returns {Object} Summary object with warning counts and details
     */
    getValidationSummary() {
        const summary = {
            totalWarnings: 0,
            warningsByType: {
                genderMismatch: 0,
                bunkPreference: 0,
                familySeparation: 0
            },
            criticalIssues: 0,
            affectedGuests: new Set()
        };
        
        // Check all assigned guests
        this.assignments.forEach((bedId, guestId) => {
            const guest = this.guests.find(g => g.id === guestId);
            const bed = this.findBed(bedId);
            const room = this.rooms.find(r => r.beds.some(b => b.bedId === bedId));
            
            if (guest && bed && room) {
                const warnings = this.getAssignmentWarnings(guest, bed, room);
                
                if (warnings.length > 0) {
                    summary.totalWarnings += warnings.length;
                    summary.affectedGuests.add(guestId);
                    
                    // Categorize warnings
                    warnings.forEach(warning => {
                        if (warning.includes('Gender mismatch')) {
                            summary.warningsByType.genderMismatch++;
                            summary.criticalIssues++;
                        } else if (warning.includes('bunk')) {
                            summary.warningsByType.bunkPreference++;
                        } else if (warning.includes('separation')) {
                            summary.warningsByType.familySeparation++;
                        }
                    });
                }
            }
        });
        
        // Convert Set to count
        summary.affectedGuestCount = summary.affectedGuests.size;
        delete summary.affectedGuests;
        
        return summary;
    },

    /**
     * Validates that all required validation settings are present
     * Used during initialization and settings import
     * 
     * @param {Object} settings - Settings object to validate
     * @returns {boolean} True if validation settings are complete
     */
    validateValidationSettings(settings) {
        if (!settings || !settings.warnings) return false;
        
        const requiredWarnings = [
            'genderMismatch',
            'bunkPreference', 
            'familySeparation',
            'roomAvailability'
        ];
        
        // Check basic boolean warning settings
        for (const warning of requiredWarnings) {
            if (typeof settings.warnings[warning] !== 'boolean') {
                return false;
            }
        }
        
        // Age gap settings validation removed
        
        return true;
    },

    // ================================
    // BATCH VALIDATION METHODS
    // ================================

    /**
     * Validates all current assignments and returns a detailed report
     * Useful for comprehensive validation checks
     * 
     * @returns {Array<Object>} Array of validation results for each assignment
     */
    validateAllAssignments() {
        const results = [];
        
        this.assignments.forEach((bedId, guestId) => {
            const guest = this.guests.find(g => g.id === guestId);
            const bed = this.findBed(bedId);
            const room = this.rooms.find(r => r.beds.some(b => b.bedId === bedId));
            
            if (guest && bed && room) {
                const warnings = this.getAssignmentWarnings(guest, bed, room);
                
                results.push({
                    guestId: guestId,
                    guestName: `${this.createDisplayName(guest)} ${guest.lastName}`,
                    bedId: bedId,
                    roomName: room.roomName,
                    warnings: warnings,
                    hasWarnings: warnings.length > 0,
                    isCritical: warnings.some(w => 
                        w.includes('Gender mismatch') || 
                        w.includes('Minor assigned with adult') ||
                        w.includes('Adult assigned with minor')
                    )
                });
            }
        });
        
        return results;
    },

    /**
     * Validates all unassigned guests and returns potential assignment issues
     * Helps identify systemic problems before assignment
     * 
     * @returns {Array<Object>} Array of validation results for unassigned guests
     */
    validateUnassignedGuests() {
        const results = [];
        const unassignedGuests = this.guests.filter(guest => !this.assignments.has(guest.id));
        
        unassignedGuests.forEach(guest => {
            const warnings = this.getAssignmentWarningsForUnassignedGuest(guest);
            
            results.push({
                guestId: guest.id,
                guestName: `${this.createDisplayName(guest)} ${guest.lastName}`,
                warnings: warnings,
                hasWarnings: warnings.length > 0,
                assignmentDifficulty: this.assessAssignmentDifficulty(guest, warnings)
            });
        });
        
        return results;
    },

    /**
     * Assesses how difficult it will be to assign a guest based on warnings
     * 
     * @param {Object} guest - The guest to assess
     * @param {Array<string>} warnings - Current warnings for the guest
     * @returns {string} Difficulty level: 'easy', 'moderate', 'difficult', 'impossible'
     */
    assessAssignmentDifficulty(guest, warnings) {
        if (warnings.some(w => w.includes('No') && w.includes('rooms available'))) {
            return 'impossible';
        }
        
        if (warnings.some(w => w.includes('No beds available'))) {
            return 'impossible';
        }
        
        if (warnings.length >= 3) {
            return 'difficult';
        }
        
        if (warnings.length >= 1) {
            return 'moderate';
        }
        
        return 'easy';
    }

};