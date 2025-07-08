/**
 * App Rooms Module
 * 
 * This module contains all room configuration functionality including:
 * - Dormitory management (add, edit, remove, toggle active)
 * - Room configuration UI and rendering
 * - Bed configuration and management
 * - Room layout visualization
 * - CSV import/export for room configurations
 * - Room switching and selection logic
 * 
 * This module is designed as a mixin to be applied to the main DormAssignmentTool class.
 */

const AppRooms = {
    
    // Room Data Management
    initializeRooms() {
        // Initialize default dormitory structure
        this.dormitories = [
            {
                dormitoryName: "Main Building",
                active: true,
                rooms: [
                    {
                        roomName: "Men's Dorm A",
                        roomGender: "M",
                        active: true,
                        beds: [
                            { bedId: "MA1", bedType: "lower", assignedGuestId: null, position: 1 },
                            { bedId: "MA2", bedType: "upper", assignedGuestId: null, position: 2 },
                            { bedId: "MA3", bedType: "lower", assignedGuestId: null, position: 3 },
                            { bedId: "MA4", bedType: "upper", assignedGuestId: null, position: 4 },
                            { bedId: "MA5", bedType: "single", assignedGuestId: null, position: 5 },
                            { bedId: "MA6", bedType: "single", assignedGuestId: null, position: 6 }
                        ]
                    },
                    {
                        roomName: "Men's Dorm B",
                        roomGender: "M",
                        active: true,
                        beds: [
                            { bedId: "MB1", bedType: "lower", assignedGuestId: null, position: 1 },
                            { bedId: "MB2", bedType: "upper", assignedGuestId: null, position: 2 },
                            { bedId: "MB3", bedType: "lower", assignedGuestId: null, position: 3 },
                            { bedId: "MB4", bedType: "upper", assignedGuestId: null, position: 4 }
                        ]
                    },
                    {
                        roomName: "Women's Dorm A",
                        roomGender: "F",
                        active: true,
                        beds: [
                            { bedId: "WA1", bedType: "lower", assignedGuestId: null, position: 1 },
                            { bedId: "WA2", bedType: "upper", assignedGuestId: null, position: 2 },
                            { bedId: "WA3", bedType: "lower", assignedGuestId: null, position: 3 },
                            { bedId: "WA4", bedType: "upper", assignedGuestId: null, position: 4 },
                            { bedId: "WA5", bedType: "single", assignedGuestId: null, position: 5 },
                            { bedId: "WA6", bedType: "single", assignedGuestId: null, position: 6 }
                        ]
                    },
                    {
                        roomName: "Women's Dorm B",
                        roomGender: "F",
                        active: true,
                        beds: [
                            { bedId: "WB1", bedType: "lower", assignedGuestId: null, position: 1 },
                            { bedId: "WB2", bedType: "upper", assignedGuestId: null, position: 2 },
                            { bedId: "WB3", bedType: "lower", assignedGuestId: null, position: 3 },
                            { bedId: "WB4", bedType: "upper", assignedGuestId: null, position: 4 }
                        ]
                    }
                ]
            },
            {
                dormitoryName: "Family Building",
                active: true,
                rooms: [
                    {
                        roomName: "Family Room",
                        roomGender: "Coed",
                        active: true,
                        beds: [
                            { bedId: "FR1", bedType: "single", assignedGuestId: null, position: 1 },
                            { bedId: "FR2", bedType: "single", assignedGuestId: null, position: 2 },
                            { bedId: "FR3", bedType: "single", assignedGuestId: null, position: 3 },
                            { bedId: "FR4", bedType: "single", assignedGuestId: null, position: 4 }
                        ]
                    }
                ]
            }
        ];
        
        // Generate flat rooms array for backward compatibility
        this.rooms = this.getFlatRoomsList();
    },
    
    getFlatRoomsList() {
        const flatRooms = [];
        this.dormitories.forEach(dormitory => {
            if (dormitory.active) {
                dormitory.rooms.forEach(room => {
                    if (room.active) {
                        flatRooms.push({
                            ...room,
                            dormitoryName: dormitory.dormitoryName
                        });
                    }
                });
            }
        });
        return flatRooms;
    },

    refreshRoomsFromDormitories() {
        this.rooms = this.getFlatRoomsList();
        // Re-render assignment interface if we're in assignment mode
        if (this.currentTab === 'assignment') {
            this.renderRooms();
        }
    },

    // Dormitory Management Methods
    renderDormitories() {
        const container = document.getElementById('dormitoriesContainer');
        container.innerHTML = '';
        
        if (this.dormitories.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No dormitories configured. Click "Add" to create your first dormitory.</p></div>';
            return;
        }
        
        this.dormitories.forEach((dormitory, index) => {
            const dormCard = document.createElement('div');
            dormCard.className = `dormitory-card ${!dormitory.active ? 'inactive' : ''}`;
            dormCard.dataset.dormitoryIndex = index;
            
            const roomCount = dormitory.rooms ? dormitory.rooms.filter(r => r.active).length : 0;
            
            dormCard.innerHTML = `
                <div class="dormitory-header">
                    <h4>${dormitory.dormitoryName}</h4>
                    <span class="room-count">${roomCount} rooms</span>
                </div>
                <div class="dormitory-actions">
                    <button class="btn btn-small" onclick="app.toggleDormitoryActive(${index})">
                        ${dormitory.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-small" onclick="app.renameDormitory(${index})">Rename</button>
                    <button class="btn btn-small btn-danger" onclick="app.removeDormitory(${index})">Remove</button>
                </div>
            `;
            
            dormCard.addEventListener('click', (e) => {
                if (!e.target.closest('.dormitory-actions')) {
                    this.selectDormitory(index);
                }
            });
            
            container.appendChild(dormCard);
        });
    },
    
    selectDormitory(dormitoryIndex) {
        this.selectedDormitory = dormitoryIndex;
        const dormitory = this.dormitories[dormitoryIndex];
        
        // Update UI
        document.querySelectorAll('.dormitory-card').forEach(card => card.classList.remove('selected'));
        document.querySelector(`[data-dormitory-index="${dormitoryIndex}"]`).classList.add('selected');
        
        document.getElementById('selectedDormitoryName').textContent = dormitory.dormitoryName;
        document.getElementById('addRoomBtn').style.display = 'inline-block';
        
        this.renderRoomConfiguration();
    },
    
    addDormitory() {
        const name = prompt('Enter dormitory name:');
        if (!name) return;
        
        this.dormitories.push({
            dormitoryName: name,
            active: true,
            rooms: []
        });
        
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    },
    
    toggleDormitoryActive(dormitoryIndex) {
        this.dormitories[dormitoryIndex].active = !this.dormitories[dormitoryIndex].active;
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    },
    
    renameDormitory(dormitoryIndex) {
        const newName = prompt('Enter new dormitory name:', this.dormitories[dormitoryIndex].dormitoryName);
        if (!newName) return;
        
        this.dormitories[dormitoryIndex].dormitoryName = newName;
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    },
    
    removeDormitory(dormitoryIndex) {
        if (!confirm('Are you sure you want to remove this dormitory? All rooms and guest assignments will be lost.')) return;
        
        // Unassign all guests from rooms in this dormitory
        const dormitory = this.dormitories[dormitoryIndex];
        dormitory.rooms.forEach(room => {
            room.beds.forEach(bed => {
                if (bed.assignedGuestId) {
                    this.assignments.delete(bed.assignedGuestId);
                }
            });
        });
        
        this.dormitories.splice(dormitoryIndex, 1);
        this.selectedDormitory = null;
        
        this.renderDormitories();
        this.renderRoomConfiguration();
        this.refreshRoomsFromDormitories();
        this.renderGuestsTable();
        this.updateCounts();
        this.saveToLocalStorage();
    },

    // Room Configuration Methods
    renderRoomConfiguration() {
        const container = document.getElementById('roomConfigContainer');
        if (this.selectedDormitory === null) {
            container.innerHTML = '<div class="empty-state"><p>Select a dormitory to configure its rooms.</p></div>';
            return;
        }
        
        const dormitory = this.dormitories[this.selectedDormitory];
        const rooms = dormitory.rooms || [];
        
        if (rooms.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No rooms in this dormitory. Click "Add Room" to create the first room.</p></div>';
            return;
        }
        
        const roomGrid = document.createElement('div');
        roomGrid.className = 'room-config-grid';
        
        rooms.forEach((room, roomIndex) => {
            const roomCard = document.createElement('div');
            roomCard.className = `room-config-card ${!room.active ? 'inactive' : ''}`;
            roomCard.dataset.roomIndex = roomIndex;
            
            const bedCount = room.beds ? room.beds.length : 0;
            const occupiedBeds = room.beds ? room.beds.filter(bed => bed.assignedGuestId).length : 0;
            
            // Gender badge class
            const genderClass = room.roomGender === 'M' ? 'male' : 
                               room.roomGender === 'F' ? 'female' : 'coed';
            
            roomCard.innerHTML = `
                <div class="room-config-header">
                    <h4>${room.roomName}</h4>
                    <span class="status-badge ${room.active ? 'active' : 'inactive'}">
                        ${room.active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="room-config-info">
                    <span class="gender-badge ${genderClass}">${room.roomGender}</span>
                    <span class="room-config-detail">${bedCount} beds</span>
                    <span class="room-config-detail">${occupiedBeds} occupied</span>
                </div>
                <div class="room-config-actions">
                    <button class="btn btn-small" onclick="app.openBedConfiguration(${this.selectedDormitory}, ${roomIndex})">Configure Beds</button>
                    <button class="btn btn-small" onclick="app.editRoom(${this.selectedDormitory}, ${roomIndex})">Edit</button>
                    <button class="btn btn-small" onclick="app.toggleRoomActive(${this.selectedDormitory}, ${roomIndex})">
                        ${room.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.removeRoom(${this.selectedDormitory}, ${roomIndex})">Remove</button>
                </div>
            `;
            
            roomGrid.appendChild(roomCard);
        });
        
        container.innerHTML = '';
        container.appendChild(roomGrid);
    },
    
    addRoom() {
        if (this.selectedDormitory === null) return;
        
        const name = prompt('Enter room name:');
        if (!name) return;
        
        const gender = prompt('Enter room gender (M/F/Coed):');
        if (!['M', 'F', 'Coed'].includes(gender)) {
            alert('Invalid gender. Use M, F, or Coed');
            return;
        }
        
        this.dormitories[this.selectedDormitory].rooms.push({
            roomName: name,
            roomGender: gender,
            active: true,
            beds: []
        });
        
        this.renderDormitories();
        this.renderRoomConfiguration();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    },
    
    editRoom(dormitoryIndex, roomIndex) {
        const dormitory = this.dormitories[dormitoryIndex];
        const room = dormitory.rooms[roomIndex];
        
        const newName = prompt('Enter new room name:', room.roomName);
        if (newName === null) return; // User cancelled
        
        if (newName.trim() === '') {
            alert('Room name cannot be empty');
            return;
        }
        
        const newGender = prompt('Enter room gender (M/F/Coed):', room.roomGender);
        if (newGender === null) return; // User cancelled
        
        if (!['M', 'F', 'Coed'].includes(newGender)) {
            alert('Invalid gender. Use M, F, or Coed');
            return;
        }
        
        room.roomName = newName.trim();
        room.roomGender = newGender;
        
        this.renderRoomConfiguration();
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    },
    
    toggleRoomActive(dormitoryIndex, roomIndex) {
        const dormitory = this.dormitories[dormitoryIndex];
        const room = dormitory.rooms[roomIndex];
        
        room.active = !room.active;
        
        // If deactivating room, unassign all guests
        if (!room.active && room.beds) {
            room.beds.forEach(bed => {
                if (bed.assignedGuestId) {
                    this.assignments.delete(bed.assignedGuestId);
                    bed.assignedGuestId = null;
                }
            });
        }
        
        this.renderRoomConfiguration();
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.renderGuestsTable();
        this.updateCounts();
        this.saveToLocalStorage();
    },
    
    removeRoom(dormitoryIndex, roomIndex) {
        const dormitory = this.dormitories[dormitoryIndex];
        const room = dormitory.rooms[roomIndex];
        
        if (!confirm(`Are you sure you want to remove "${room.roomName}"? All guest assignments in this room will be lost.`)) {
            return;
        }
        
        // Unassign all guests from this room
        if (room.beds) {
            room.beds.forEach(bed => {
                if (bed.assignedGuestId) {
                    this.assignments.delete(bed.assignedGuestId);
                }
            });
        }
        
        dormitory.rooms.splice(roomIndex, 1);
        
        this.renderRoomConfiguration();
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.renderGuestsTable();
        this.updateCounts();
        this.saveToLocalStorage();
    },

    // Bed Configuration Methods
    openBedConfiguration(dormitoryIndex, roomIndex) {
        this.bedConfigDormitoryIndex = dormitoryIndex;
        this.bedConfigRoomIndex = roomIndex;
        
        const dormitory = this.dormitories[dormitoryIndex];
        const room = dormitory.rooms[roomIndex];
        
        // Update modal content
        document.getElementById('bedConfigTitle').textContent = `Configure Beds - ${room.roomName}`;
        document.getElementById('bedConfigRoomName').textContent = room.roomName;
        
        const bedCount = room.beds ? room.beds.length : 0;
        const occupiedBeds = room.beds ? room.beds.filter(bed => bed.assignedGuestId).length : 0;
        const genderText = room.roomGender === 'M' ? 'Male' : room.roomGender === 'F' ? 'Female' : 'Co-ed';
        
        document.getElementById('bedConfigRoomDetails').innerHTML = `
            <strong>Dormitory:</strong> ${dormitory.dormitoryName} &nbsp;•&nbsp;
            <strong>Gender:</strong> ${genderText} &nbsp;•&nbsp;
            <strong>Beds:</strong> ${bedCount} &nbsp;•&nbsp;
            <strong>Occupied:</strong> ${occupiedBeds}
        `;
        
        // Show modal
        document.getElementById('bedConfigModal').classList.add('active');
        
        // Render beds
        this.renderBedConfiguration();
        
        // Add bed type selector event listeners
        this.bindBedTypeSelector();
    },
    
    closeBedConfiguration() {
        document.getElementById('bedConfigModal').classList.remove('active');
        this.hideAddBedInterface();
        this.bedConfigDormitoryIndex = null;
        this.bedConfigRoomIndex = null;
    },
    
    showAddBedInterface() {
        document.getElementById('addBedInterface').style.display = 'block';
    },
    
    hideAddBedInterface() {
        document.getElementById('addBedInterface').style.display = 'none';
    },
    
    bindBedTypeSelector() {
        const options = document.querySelectorAll('.bed-type-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedBedType = option.dataset.type;
            });
        });
    },
    
    renderBedConfiguration() {
        const container = document.getElementById('bedConfigGrid');
        
        if (this.bedConfigDormitoryIndex === null || this.bedConfigRoomIndex === null) {
            container.innerHTML = '<div class="empty-beds">No room selected</div>';
            return;
        }
        
        const dormitory = this.dormitories[this.bedConfigDormitoryIndex];
        const room = dormitory.rooms[this.bedConfigRoomIndex];
        
        if (!room.beds || room.beds.length === 0) {
            container.innerHTML = '<div class="empty-beds">No beds configured for this room.<br>Click "Add Bed" to create the first bed.</div>';
            return;
        }
        
        container.innerHTML = '';
        
        room.beds.forEach((bed, bedIndex) => {
            const bedCard = document.createElement('div');
            bedCard.className = 'bed-config-card';
            bedCard.dataset.bedIndex = bedIndex;
            
            // Get assigned guest info
            let assignedGuest = null;
            if (bed.assignedGuestId) {
                assignedGuest = this.guests.find(g => g.id === bed.assignedGuestId);
            }
            
            // Apply status classes
            if (assignedGuest) {
                bedCard.classList.add('occupied');
                
                // Check for warnings
                const warnings = this.getAssignmentWarnings(assignedGuest, bed, room);
                if (warnings.length > 0) {
                    bedCard.classList.add('warning');
                    bedCard.title = warnings.join('; ');
                }
            }
            
            bedCard.innerHTML = `
                <div class="bed-config-card-header">
                    <div class="bed-id">${bed.bedId}</div>
                    <div class="bed-type ${bed.bedType}">${bed.bedType}</div>
                </div>
                <div class="bed-icon ${bed.bedType}"></div>
                <div class="bed-assignment-info">
                    <div class="bed-assignment-status ${assignedGuest ? 'occupied' : 'empty'}">
                        ${assignedGuest ? 'Occupied' : 'Empty'}
                    </div>
                    ${assignedGuest ? `
                        <div class="bed-guest-info">
                            <div class="guest-name">${this.createDisplayName(assignedGuest)} ${assignedGuest.lastName}</div>
                            <div>${assignedGuest.gender}, Age ${assignedGuest.age}</div>
                            ${assignedGuest.groupName ? `<div>Group: ${assignedGuest.groupName}</div>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="bed-actions">
                    <button class="btn btn-small" onclick="app.changeBedType(${this.bedConfigDormitoryIndex}, ${this.bedConfigRoomIndex}, ${bedIndex})">Change Type</button>
                    <button class="btn btn-small btn-danger" onclick="app.removeBed(${this.bedConfigDormitoryIndex}, ${this.bedConfigRoomIndex}, ${bedIndex})">Remove</button>
                </div>
            `;
            
            container.appendChild(bedCard);
        });
    },
    
    addBed(dormitoryIndex, roomIndex, bedType) {
        const dormitory = this.dormitories[dormitoryIndex];
        const room = dormitory.rooms[roomIndex];
        
        if (!room.beds) {
            room.beds = [];
        }
        
        // Generate unique bed ID
        const bedId = this.generateBedId(room.roomName, room.beds.length);
        const position = room.beds.length + 1;
        
        const newBed = {
            bedId: bedId,
            bedType: bedType,
            assignedGuestId: null,
            position: position
        };
        
        room.beds.push(newBed);
        
        // Update interfaces
        this.renderBedConfiguration();
        this.renderRoomConfiguration();
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
        
        return newBed;
    },
    
    addBedToCurrent() {
        if (this.bedConfigDormitoryIndex === null || this.bedConfigRoomIndex === null) {
            return;
        }
        
        this.addBed(this.bedConfigDormitoryIndex, this.bedConfigRoomIndex, this.selectedBedType);
        this.hideAddBedInterface();
    },
    
    removeBed(dormitoryIndex, roomIndex, bedIndex) {
        const dormitory = this.dormitories[dormitoryIndex];
        const room = dormitory.rooms[roomIndex];
        const bed = room.beds[bedIndex];
        
        if (!confirm(`Are you sure you want to remove bed "${bed.bedId}"?${bed.assignedGuestId ? ' The assigned guest will be unassigned.' : ''}`)) {
            return;
        }
        
        // Unassign guest if assigned
        if (bed.assignedGuestId) {
            this.assignments.delete(bed.assignedGuestId);
        }
        
        // Remove bed
        room.beds.splice(bedIndex, 1);
        
        // Update bed positions
        room.beds.forEach((bed, index) => {
            bed.position = index + 1;
        });
        
        // Update interfaces
        this.renderBedConfiguration();
        this.renderRoomConfiguration();
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.renderGuestsTable();
        this.updateCounts();
        this.saveToLocalStorage();
    },
    
    changeBedType(dormitoryIndex, roomIndex, bedIndex) {
        const dormitory = this.dormitories[dormitoryIndex];
        const room = dormitory.rooms[roomIndex];
        const bed = room.beds[bedIndex];
        
        const newType = prompt(`Change bed type for "${bed.bedId}".\nCurrent type: ${bed.bedType}\n\nEnter new type (upper/lower/single):`, bed.bedType);
        
        if (!newType || !['upper', 'lower', 'single'].includes(newType.toLowerCase())) {
            if (newType !== null) {
                alert('Invalid bed type. Use: upper, lower, or single');
            }
            return;
        }
        
        bed.bedType = newType.toLowerCase();
        
        // Update interfaces
        this.renderBedConfiguration();
        this.renderRoomConfiguration();
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    },

    // Room Configuration Import/Export Methods
    exportRoomConfig() {
        if (!this.dormitories || this.dormitories.length === 0) {
            this.showStatus('No room configuration to export', 'error');
            return;
        }
        
        try {
            const csvRows = [];
            
            // Create CSV headers
            const headers = [
                'Dormitory Name',
                'Room Name',
                'Room Gender',
                'Bed ID',
                'Bed Type',
                'Bed Position',
                'Active'
            ];
            csvRows.push(headers.join(','));
            
            // Export each dormitory, room, and bed
            this.dormitories.forEach(dormitory => {
                if (dormitory.rooms && dormitory.rooms.length > 0) {
                    dormitory.rooms.forEach(room => {
                        if (room.beds && room.beds.length > 0) {
                            room.beds.forEach(bed => {
                                const row = [
                                    this.escapeCSVField(dormitory.dormitoryName),
                                    this.escapeCSVField(room.roomName),
                                    this.escapeCSVField(room.roomGender),
                                    this.escapeCSVField(bed.bedId),
                                    this.escapeCSVField(bed.bedType),
                                    bed.position || 1,
                                    dormitory.active && room.active ? 'true' : 'false'
                                ];
                                csvRows.push(row.join(','));
                            });
                        } else {
                            // Room with no beds - still include it for import reference
                            const row = [
                                this.escapeCSVField(dormitory.dormitoryName),
                                this.escapeCSVField(room.roomName),
                                this.escapeCSVField(room.roomGender),
                                '', // No bed ID
                                '', // No bed type
                                '', // No bed position
                                dormitory.active && room.active ? 'true' : 'false'
                            ];
                            csvRows.push(row.join(','));
                        }
                    });
                } else {
                    // Dormitory with no rooms - still include it for import reference
                    const row = [
                        this.escapeCSVField(dormitory.dormitoryName),
                        '', // No room name
                        '', // No room gender
                        '', // No bed ID
                        '', // No bed type
                        '', // No bed position
                        dormitory.active ? 'true' : 'false'
                    ];
                    csvRows.push(row.join(','));
                }
            });
            
            // Create and download CSV file
            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.generateTimestampedFilename('room_configuration', 'csv');
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showStatus('Room configuration exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting room configuration:', error);
            this.showStatus('Error exporting room configuration: ' + error.message, 'error');
        }
    },
    
    importRoomConfig() {
        // Trigger file input click
        const fileInput = document.getElementById('roomConfigFile');
        fileInput.click();
    },
    
    handleRoomConfigUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showStatus('Please select a CSV file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseRoomConfigCSV(e.target.result);
                this.showStatus('Room configuration imported successfully!', 'success');
                
                // Update all interfaces
                this.renderDormitories();
                this.renderRoomConfiguration();
                this.refreshRoomsFromDormitories();
                this.renderRooms();
                this.renderGuestsTable();
                this.updateCounts();
                this.saveToLocalStorage();
            } catch (error) {
                console.error('Error importing room configuration:', error);
                this.showStatus('Error importing room configuration: ' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showStatus('Error reading file', 'error');
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    },
    
    parseRoomConfigCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Create a mapping of expected fields to actual header variations
        const fieldMappings = {
            dormitoryName: ['Dormitory Name', 'dormitory_name', 'dormitoryName', 'Dormitory'],
            roomName: ['Room Name', 'room_name', 'roomName', 'Room'],
            roomGender: ['Room Gender', 'room_gender', 'roomGender', 'Gender'],
            bedId: ['Bed ID', 'bed_id', 'bedId', 'BedID'],
            bedType: ['Bed Type', 'bed_type', 'bedType', 'Type'],
            bedPosition: ['Bed Position', 'bed_position', 'bedPosition', 'Position'],
            active: ['Active', 'active', 'Status']
        };
        
        // Find actual column names
        const columnMap = {};
        Object.keys(fieldMappings).forEach(field => {
            const matchingHeader = fieldMappings[field].find(variation => 
                headers.some(h => h.toLowerCase() === variation.toLowerCase())
            );
            if (matchingHeader) {
                const actualHeader = headers.find(h => h.toLowerCase() === matchingHeader.toLowerCase());
                columnMap[field] = actualHeader;
            }
        });
        
        // Check for required fields
        const requiredFields = ['dormitoryName'];
        const missingFields = requiredFields.filter(field => !columnMap[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required columns: ${missingFields.join(', ')}. Available columns: ${headers.join(', ')}`);
        }
        
        // Store current guest assignments for preservation
        const currentAssignments = new Map();
        this.assignments.forEach((bedId, guestId) => {
            currentAssignments.set(bedId, guestId);
        });
        
        // Parse CSV data
        const dormitoryMap = new Map();
        const invalidRows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVRow(lines[i]);
            if (values.length !== headers.length) {
                invalidRows.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
                continue;
            }
            
            const rowData = {};
            Object.keys(columnMap).forEach(field => {
                const headerName = columnMap[field];
                const headerIndex = headers.indexOf(headerName);
                if (headerIndex !== -1) {
                    rowData[field] = (values[headerIndex] || '').trim().replace(/^"|"$/g, '');
                }
            });
            
            // Skip rows with no dormitory name
            if (!rowData.dormitoryName) {
                continue;
            }
            
            // Get or create dormitory
            if (!dormitoryMap.has(rowData.dormitoryName)) {
                dormitoryMap.set(rowData.dormitoryName, {
                    dormitoryName: rowData.dormitoryName,
                    active: rowData.active !== 'false',
                    rooms: new Map()
                });
            }
            
            const dormitory = dormitoryMap.get(rowData.dormitoryName);
            
            // Handle room data
            if (rowData.roomName) {
                const roomKey = `${rowData.dormitoryName}:${rowData.roomName}`;
                if (!dormitory.rooms.has(roomKey)) {
                    dormitory.rooms.set(roomKey, {
                        roomName: rowData.roomName,
                        roomGender: rowData.roomGender || 'Coed',
                        active: rowData.active !== 'false',
                        beds: []
                    });
                }
                
                const room = dormitory.rooms.get(roomKey);
                
                // Handle bed data
                if (rowData.bedId) {
                    const bed = {
                        bedId: rowData.bedId,
                        bedType: rowData.bedType || 'single',
                        assignedGuestId: null,
                        position: parseInt(rowData.bedPosition) || room.beds.length + 1
                    };
                    
                    // Preserve existing guest assignment if bed ID matches
                    if (currentAssignments.has(rowData.bedId)) {
                        bed.assignedGuestId = currentAssignments.get(rowData.bedId);
                    }
                    
                    room.beds.push(bed);
                }
            }
        }
        
        // Convert maps to arrays and update dormitories
        const newDormitories = Array.from(dormitoryMap.values()).map(dormitory => ({
            dormitoryName: dormitory.dormitoryName,
            active: dormitory.active,
            rooms: Array.from(dormitory.rooms.values())
        }));
        
        if (newDormitories.length === 0) {
            throw new Error('No valid dormitory data found in CSV');
        }
        
        // Update assignments map to preserve guest assignments
        this.assignments.clear();
        newDormitories.forEach(dormitory => {
            dormitory.rooms.forEach(room => {
                room.beds.forEach(bed => {
                    if (bed.assignedGuestId) {
                        this.assignments.set(bed.assignedGuestId, bed.bedId);
                    }
                });
            });
        });
        
        // Replace dormitories with imported data
        this.dormitories = newDormitories;
        
        // Reset selected dormitory if it no longer exists
        if (this.selectedDormitory !== null && 
            (this.selectedDormitory >= this.dormitories.length || 
             !this.dormitories[this.selectedDormitory])) {
            this.selectedDormitory = null;
        }
        
        if (invalidRows.length > 0) {
            console.warn('Invalid rows during import:', invalidRows);
        }
    }
};

// Export the mixin for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppRooms;
}