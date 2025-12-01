class DormAssignmentTool {
    constructor() {
        this.guests = [];
        this.rooms = [];
        this.assignments = new Map();
        this.suggestedAssignments = new Map(); // Auto-placement suggestions
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchQuery = '';
        this.assignmentHistory = [];
        this.maxHistorySize = APP_CONSTANTS.HISTORY_SIZE;
        this.currentTab = 'assignment';
        this.dormitories = [];
        this.selectedDormitory = null;
        this.bedConfigDormitoryIndex = null;
        this.bedConfigRoomIndex = null;
        this.selectedBedType = 'single';
        this.pickedUpGuestId = null; // Track picked up guest

        // Initialize settings with defaults from constants
        this.settings = { ...APP_CONSTANTS.DEFAULT_SETTINGS };

        this.initializeRooms();
        this.bindEvents();
        this.loadFromLocalStorage();
    }


    initializeRooms() {
        // Initialize default dormitory structure
        this.dormitories = [
            {
                dormitoryName: "Main Building",
                active: true,
                color: "#f8f9fa",
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
    }
    
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
    }

    bindEvents() {
        // Tab switching
        document.getElementById('assignmentTab').addEventListener('click', () => this.switchTab('assignment'));
        document.getElementById('configurationTab').addEventListener('click', () => this.switchTab('configuration'));
        document.getElementById('settingsTab').addEventListener('click', () => this.switchTab('settings'));

        // Assignment tab events
        document.getElementById('csvFile').addEventListener('change', (e) => this.handleCSVUpload(e));
        document.getElementById('loadTestDataBtn').addEventListener('click', () => autoLoadTestData());
        document.getElementById('searchGuests').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('autoPlaceBtn').addEventListener('click', () => this.autoPlaceGuests());
        document.getElementById('acceptAllBtn').addEventListener('click', () => this.acceptAllSuggestions());
        document.getElementById('clearSuggestionsBtn').addEventListener('click', () => this.clearSuggestions());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('resetAssignmentsBtn').addEventListener('click', () => this.resetAllAssignments());
        document.getElementById('deletePeopleBtn').addEventListener('click', () => this.deleteAllPeopleData());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoLastAction());
        
        // Configuration tab events
        document.getElementById('addDormitoryBtn').addEventListener('click', () => this.addDormitory());
        document.getElementById('addRoomBtn').addEventListener('click', () => this.addRoom());
        document.getElementById('loadDefaultRoomsBtn').addEventListener('click', () => autoLoadDefaultRooms());
        document.getElementById('exportRoomsBtn').addEventListener('click', () => this.exportRoomConfig());
        document.getElementById('importRoomsBtn').addEventListener('click', () => this.importRoomConfig());
        document.getElementById('roomConfigFile').addEventListener('change', (e) => this.handleRoomConfigUpload(e));
        
        // Settings tab events
        document.getElementById('showAgeHistograms').addEventListener('change', (e) => {
            this.updateSettings({ display: { showAgeHistograms: e.target.checked } });
        });
        document.getElementById('genderMismatchWarnings').addEventListener('change', (e) => {
            this.updateSettings({ warnings: { genderMismatch: e.target.checked } });
        });
        document.getElementById('bunkPreferenceWarnings').addEventListener('change', (e) => {
            this.updateSettings({ warnings: { bunkPreference: e.target.checked } });
        });
        document.getElementById('familySeparationWarnings').addEventListener('change', (e) => {
            this.updateSettings({ warnings: { familySeparation: e.target.checked } });
        });
        document.getElementById('roomAvailabilityWarnings').addEventListener('change', (e) => {
            this.updateSettings({ warnings: { roomAvailability: e.target.checked } });
        });
        document.getElementById('autoPlacementEnabled').addEventListener('change', (e) => {
            this.settings.autoPlacement.enabled = e.target.checked;
            this.saveToLocalStorage();
        });
        document.getElementById('allowConstraintRelaxation').addEventListener('change', (e) => {
            this.settings.autoPlacement.allowConstraintRelaxation = e.target.checked;
            this.saveToLocalStorage();
        });

        // Bed configuration modal events
        document.getElementById('bedConfigModal').addEventListener('click', (e) => {
            if (e.target.id === 'bedConfigModal') {
                this.closeBedConfiguration();
            }
        });
        
        // Keyboard support for bed configuration modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('bedConfigModal').classList.contains('active')) {
                this.closeBedConfiguration();
            }
        });
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tabName === 'assignment') {
            document.getElementById('assignmentTab').classList.add('active');
            document.getElementById('assignmentContent').classList.add('active');
            // Refresh assignment interface to update warnings based on current settings
            if (this.guests.length > 0) {
                this.renderGuestsTable();
                this.renderRooms();
            }
        } else if (tabName === 'configuration') {
            document.getElementById('configurationTab').classList.add('active');
            document.getElementById('configurationContent').classList.add('active');
            this.renderDormitories();
        } else if (tabName === 'settings') {
            document.getElementById('settingsTab').classList.add('active');
            document.getElementById('settingsContent').classList.add('active');
            this.renderSettings();
        }
        
        this.currentTab = tabName;
    }
    
    refreshRoomsFromDormitories() {
        this.rooms = this.getFlatRoomsList();
        // Re-render assignment interface if we're in assignment mode
        if (this.currentTab === 'assignment') {
            this.renderRooms();
        }
    }

    handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseCSV(e.target.result);
                this.showStatus('CSV file uploaded successfully!', 'success');
                this.renderGuestsTable();
                this.renderRooms();
                this.updateCounts();
                // Auto Place button visibility handled by updateCounts()
                document.getElementById('exportBtn').style.display = 'inline-block';
                document.getElementById('resetAssignmentsBtn').style.display = 'inline-block';
                document.getElementById('deletePeopleBtn').style.display = 'inline-block';
                document.getElementById('undoBtn').style.display = 'inline-block';
            } catch (error) {
                this.showStatus('Error parsing CSV: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row');

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Create a mapping of expected fields to actual header variations
        const fieldMappings = {
            firstName: ['firstName', 'FIRST NAME', 'First Name', 'first_name'],
            lastName: ['lastName', 'LAST NAME', 'Last Name', 'last_name'],
            gender: ['gender', 'GENDER', 'Gender'],
            age: ['age', 'AGE', 'Age'],
            preferredName: ['preferredName', 'Preferred name if different from above', 'Preferred Name', 'preferred_name'],
            groupName: ['groupName', 'GroupName', 'Group Name', 'group_name'],
            lowerBunk: ['lowerBunk', 'Lower bunk?', 'Lower Bunk', 'lower_bunk'],
            arrival: ['arrival', 'ARRIVAL', 'Arrival'],
            departure: ['departure', 'DEPARTURE', 'Departure'],
            firstVisit: ['firstVisit', 'First visit to a TNH monastery', 'First Visit', 'first_visit'],
            housingType: ['housingType', 'Housing type', 'Housing Type', 'housing_type'],
            ratePerNight: ['ratePerNight', 'Rate per night', 'Rate Per Night', 'rate_per_night'],
            priceQuoted: ['priceQuoted', 'Price quoted', 'Price Quoted', 'price_quoted'],
            amountPaid: ['amountPaid', 'Amount Paid', 'amount_paid'],
            groupOrIndiv: ['groupOrIndiv', 'Group or Indiv?', 'Group or Individual', 'group_or_indiv'],
            room: ['room', 'Room'],
            retreat: ['retreat', 'Retreat'],
            notes: ['notes', 'Notes'],
            arrivalTime: ['arrivalTime', 'Arrival time', 'Arrival Time', 'arrival_time'],
            departureMeals: ['departureMeals', 'Departure Meals', 'departure_meals'],
            mentalHealth: ['mentalHealth', 'Mental Health', 'mental_health'],
            physicalHealth: ['physicalHealth', 'Physical Health', 'physical_health'],
            email: ['email', 'Email'],
            column1: ['column1', 'Column 1'],
            column2: ['column2', 'Column 2']
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
        const requiredFields = ['firstName', 'lastName', 'gender', 'age'];
        const missingFields = requiredFields.filter(field => !columnMap[field]);
        if (missingFields.length > 0) {
            throw new Error(`Missing required columns: ${missingFields.join(', ')}. Available columns: ${headers.join(', ')}`);
        }

        this.guests = [];
        const invalidRows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVRow(lines[i]);
            if (values.length !== headers.length) {
                invalidRows.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
                continue;
            }

            const guest = { id: `guest_${i}` };
            
            // Map data using the column mappings
            Object.keys(columnMap).forEach(field => {
                const headerName = columnMap[field];
                const headerIndex = headers.indexOf(headerName);
                if (headerIndex !== -1) {
                    guest[field] = (values[headerIndex] || '').trim();
                }
            });

            // Validate required fields
            if (!guest.firstName || !guest.lastName) {
                invalidRows.push(`Row ${i + 1}: Missing first name or last name`);
                continue;
            }
            
            if (!guest.gender || !['M', 'F', 'Male', 'Female', 'male', 'female', 'm', 'f', 'Non-binary', 'non-binary', 'Other', 'other', 'N', 'n', 'NB', 'nb'].includes(guest.gender.trim())) {
                invalidRows.push(`Row ${i + 1}: Invalid gender '${guest.gender}'. Use M, F, Male, Female, Non-binary, or Other`);
                continue;
            }
            
            // Normalize and clean data
            guest.age = this.parseInteger(guest.age);
            guest.gender = this.normalizeGender(guest.gender);
            guest.lowerBunk = this.parseBoolean(guest.lowerBunk);
            guest.firstVisit = this.parseBoolean(guest.firstVisit);
            guest.groupName = guest.groupName || '';
            guest.room = guest.room || '';
            guest.preferredName = guest.preferredName || '';
            
            this.guests.push(guest);
        }

        if (this.guests.length === 0) {
            let debugInfo = `No valid guest data found in CSV. `;
            debugInfo += `Total rows processed: ${lines.length - 1}. `;
            debugInfo += `Invalid rows: ${invalidRows.length}. `;
            if (invalidRows.length > 0) {
                debugInfo += `Errors: ${invalidRows.slice(0, 3).join('; ')}`;
            }
            debugInfo += ` Column mappings found: ${Object.keys(columnMap).join(', ')}`;
            throw new Error(debugInfo);
        }
        
        if (invalidRows.length > 0) {
            this.showStatus(`CSV imported with ${invalidRows.length} invalid rows. Check: ${invalidRows.slice(0, 3).join('; ')}${invalidRows.length > 3 ? '...' : ''}`, 'error');
        }
    }

    // parseCSVRow method is now provided by AppUtils mixin

    handleSearch(event) {
        this.searchQuery = event.target.value.toLowerCase();
        this.renderGuestsTable();
    }

    renderGuestsTable() {
        const container = document.getElementById('guestsContainer');
        const unassignedGuests = this.guests.filter(guest => !this.assignments.has(guest.id));
        
        if (unassignedGuests.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>${APP_CONSTANTS.MESSAGES.ALL_ASSIGNED}</p></div>`;
            return;
        }

        let filteredGuests = unassignedGuests;
        if (this.searchQuery) {
            filteredGuests = unassignedGuests.filter(guest => 
                Object.values(guest).some(value => 
                    value && value.toString().toLowerCase().includes(this.searchQuery)
                )
            );
        }

        const sortedGuests = this.sortGuests(filteredGuests);
        
        const table = document.createElement('table');
        table.className = 'table';
        
        const headerRow = document.createElement('tr');
        const columns = [
            { key: 'displayName', label: 'Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'gender', label: 'Gender' },
            { key: 'age', label: 'Age' },
            { key: 'lowerBunk', label: 'Lower Bunk' },
            { key: 'groupName', label: 'Group' },
            { key: 'arrival', label: 'Arrival' },
            { key: 'departure', label: 'Departure' },
            { key: 'warnings', label: 'Assignment Issues' }
        ];

        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label;
            th.addEventListener('click', () => this.sortBy(col.key));
            
            if (this.sortColumn === col.key) {
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator active';
                indicator.textContent = this.sortDirection === 'asc' ? '▲' : '▼';
                th.appendChild(indicator);
            }
            
            headerRow.appendChild(th);
        });
        
        table.appendChild(headerRow);
        
        sortedGuests.forEach((guest, index) => {
            const row = document.createElement('tr');
            row.className = 'guest-row';
            row.draggable = true;
            row.dataset.guestId = guest.id;
            
            // Group member styling temporarily disabled
            
            columns.forEach(col => {
                const td = document.createElement('td');
                let value = guest[col.key] || '';
                
                if (col.key === 'displayName') {
                    value = this.createDisplayName(guest);
                } else if (col.key === 'gender') {
                    value = guest.gender || '';
                    if (value) {
                        const span = document.createElement('span');
                        span.className = 'badge';
                        span.textContent = value;
                        
                        // Add color class based on gender
                        if (value === 'M') {
                            span.classList.add('badge-gender-m');
                        } else if (value === 'F') {
                            span.classList.add('badge-gender-f');
                        } else {
                            span.classList.add('badge-gender-coed');
                        }
                        
                        td.appendChild(span);
                        row.appendChild(td);
                        return; // Skip setting textContent and adding td again
                    }
                } else if (col.key === 'lowerBunk') {
                    value = guest.lowerBunk ? 'Lower bunk required' : '';
                } else if (col.key === 'arrival' || col.key === 'departure') {
                    value = this.formatDate(value);
                } else if (col.key === 'warnings') {
                    const warnings = this.getAssignmentWarningsForUnassignedGuest(guest);
                    if (warnings.length > 0) {
                        value = warnings.join('; ');
                        td.className = 'warning-cell';
                        td.title = warnings.join('\n');
                    } else {
                        value = '';
                    }
                }
                
                td.textContent = value;
                row.appendChild(td);
            });
            
            row.addEventListener('dragstart', (e) => this.handleDragStart(e));
            row.addEventListener('dragend', (e) => this.handleDragEnd(e));
            
            table.appendChild(row);
        });
        
        container.innerHTML = '';
        container.appendChild(table);
        
        // Add drag and drop handlers to the guests container for unassigning
        container.addEventListener('dragover', (e) => this.handleDragOver(e));
        container.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Add global group connection lines after guest table is rendered
        setTimeout(() => this.addGlobalGroupLines(), 50);
        
        // Update lines on scroll/resize
        this.setupGlobalLineUpdates();
    }

    groupGuestsByGroupName(guests) {
        const groups = {};
        const ungrouped = [];
        
        guests.forEach(guest => {
            if (guest.groupName && guest.groupName.trim()) {
                if (!groups[guest.groupName]) {
                    groups[guest.groupName] = [];
                }
                groups[guest.groupName].push(guest);
            } else {
                ungrouped.push(guest);
            }
        });
        
        const result = [];
        Object.keys(groups).sort().forEach(groupName => {
            result.push(...groups[groupName]);
        });
        result.push(...ungrouped);
        
        return result;
    }

    sortBy(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.renderGuestsTable();
    }

    sortGuests(guests) {
        if (!this.sortColumn) return guests;
        
        return [...guests].sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];
            
            if (this.sortColumn === 'displayName') {
                aVal = this.createDisplayName(a);
                bVal = this.createDisplayName(b);
            } else if (this.sortColumn === 'lowerBunk') {
                aVal = a.lowerBunk ? 1 : 0;
                bVal = b.lowerBunk ? 1 : 0;
            } else if (this.sortColumn === 'age') {
                aVal = parseInt(a.age) || 0;
                bVal = parseInt(b.age) || 0;
            } else if (this.sortColumn === 'warnings') {
                // Sort by number of warnings
                const aWarnings = this.getAssignmentWarningsForUnassignedGuest(a);
                const bWarnings = this.getAssignmentWarningsForUnassignedGuest(b);
                aVal = aWarnings.length;
                bVal = bWarnings.length;
            } else {
                // Default string handling
                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
            }
            
            return this.compareValues(aVal, bVal, this.sortDirection);
        });
    }

    renderRooms() {
        const container = document.getElementById('roomsContainer');
        container.innerHTML = '';
        
        this.rooms.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card';
            
            const roomHeader = document.createElement('div');
            roomHeader.className = 'room-header';
            
            // Find the dormitory this room belongs to and apply its color to header
            const dormitory = this.dormitories.find(dorm => 
                dorm.rooms.some(r => r.roomName === room.roomName)
            );
            if (dormitory && dormitory.color) {
                roomHeader.style.backgroundColor = dormitory.color;
                roomHeader.style.borderColor = dormitory.color;
            }
            
            const roomTitle = document.createElement('h3');
            roomTitle.textContent = room.roomName;
            
            const roomInfo = document.createElement('div');
            roomInfo.className = 'room-info';
            const occupiedBeds = room.beds.filter(bed => bed.assignedGuestId).length;
            
            // Get age range for assigned guests
            const assignedGuests = room.beds
                .filter(bed => bed.assignedGuestId)
                .map(bed => this.guests.find(g => g.id === bed.assignedGuestId))
                .filter(guest => guest);
            
            let ageRangeText = '';
            if (assignedGuests.length > 0) {
                const ages = assignedGuests.map(g => parseInt(g.age) || 0);
                const minAge = Math.min(...ages);
                const maxAge = Math.max(...ages);
                ageRangeText = minAge === maxAge ? `, age ${minAge}` : `, ages ${minAge}-${maxAge}`;
            }
            
            // Create gender badge
            const genderBadge = document.createElement('span');
            genderBadge.className = 'badge';
            genderBadge.textContent = room.roomGender;
            
            // Add color class based on gender
            if (room.roomGender === 'M') {
                genderBadge.classList.add('badge-gender-m');
            } else if (room.roomGender === 'F') {
                genderBadge.classList.add('badge-gender-f');
            } else {
                genderBadge.classList.add('badge-gender-coed');
            }
            
            roomInfo.innerHTML = '';
            roomInfo.appendChild(genderBadge);
            roomInfo.appendChild(document.createTextNode(` • ${occupiedBeds}/${room.beds.length} beds${ageRangeText}`));
            
            roomHeader.appendChild(roomTitle);
            roomHeader.appendChild(roomInfo);
            
            // Add age histogram if enabled and there are assigned guests
            let ageHistogram = null;
            if (this.settings.display.showAgeHistograms && assignedGuests.length > 0) {
                ageHistogram = this.createAgeHistogram(assignedGuests);
            }
            
            const bedsContainer = document.createElement('div');
            bedsContainer.className = 'beds-container';
            
            room.beds.forEach(bed => {
                const bedRow = document.createElement('div');
                bedRow.className = 'bed-row';
                bedRow.dataset.bedId = bed.bedId;
                bedRow.dataset.roomName = room.roomName;
                
                const bedLabel = document.createElement('div');
                bedLabel.className = 'bed-label';
                bedLabel.textContent = `${bed.bedType} ${bed.position}`;
                
                const bedAssignment = document.createElement('div');
                bedAssignment.className = 'bed-assignment';
                
                // Add pickup/drop button
                const actionButton = document.createElement('button');
                actionButton.className = 'btn btn-tiny';
                
                if (bed.assignedGuestId) {
                    const guest = this.guests.find(g => g.id === bed.assignedGuestId);
                    if (guest) {
                        bedRow.classList.add('occupied');
                        
                        // Setup pickup/swap button
                        if (this.pickedUpGuestId && this.pickedUpGuestId !== guest.id) {
                            // Show swap button when another guest is picked up
                            actionButton.textContent = '↔';
                            actionButton.title = 'Swap with picked up guest';
                            actionButton.classList.add('btn-swap');
                            actionButton.addEventListener('click', () => this.swapGuests(guest.id));
                        } else {
                            // Normal pickup button
                            actionButton.textContent = '↑';
                            actionButton.title = 'Pick up guest';
                            actionButton.classList.add('btn-pickup');
                            actionButton.addEventListener('click', () => this.pickupGuest(guest.id));
                        }
                        
                        const warnings = this.getAssignmentWarnings(guest, bed, room);
                        if (warnings.length > 0) {
                            bedRow.classList.add('warning');
                            bedRow.title = warnings.join('; ');
                        }
                        
                        const assignedGuest = document.createElement('div');
                        assignedGuest.className = 'assigned-guest';
                        if (this.pickedUpGuestId === guest.id) {
                            assignedGuest.classList.add('picked-up');
                        }
                        assignedGuest.draggable = true;
                        assignedGuest.dataset.guestId = guest.id;
                        
                        // Create single line with all info
                        const displayName = this.createDisplayName(guest);
                        const guestName = `${displayName} ${guest.lastName}`;
                        
                        // Build single line text with all info
                        let guestText = guestName;
                        
                        // Add combined age+gender badge
                        const ageGenderSpan = document.createElement('span');
                        ageGenderSpan.className = 'badge';
                        ageGenderSpan.textContent = `${guest.age}${guest.gender}`;
                        
                        if (guest.gender === 'M') {
                            ageGenderSpan.classList.add('badge-gender-m');
                        } else if (guest.gender === 'F') {
                            ageGenderSpan.classList.add('badge-gender-f');
                        } else {
                            ageGenderSpan.classList.add('badge-gender-coed');
                        }
                        
                        assignedGuest.appendChild(ageGenderSpan);
                        
                        // Add rest of info as text with spacing
                        let infoText = '';
                        
                        if (guest.lowerBunk) {
                            infoText += '  🛏️';
                        }
                        
                        if (guest.groupName) {
                            infoText += `  👥${guest.groupName}`;
                        }
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.style.fontWeight = '600';
                        nameSpan.style.marginRight = 'var(--space-2)';
                        nameSpan.textContent = guestName;
                        
                        const infoSpan = document.createElement('span');
                        infoSpan.style.fontSize = 'var(--font-size-sm)';
                        infoSpan.style.color = 'var(--text-secondary)';
                        infoSpan.textContent = infoText;
                        
                        assignedGuest.appendChild(nameSpan);
                        assignedGuest.appendChild(infoSpan);
                        
                        // Add floating warning if needed
                        if (warnings.length > 0) {
                            const floatingWarning = document.createElement('div');
                            floatingWarning.className = 'floating-warning';
                            // Format each warning with bullet points on separate lines
                            const formattedWarnings = warnings.map(warning => `• ${warning}`).join('\n');
                            floatingWarning.textContent = formattedWarnings;
                            assignedGuest.appendChild(floatingWarning);
                        }
                        bedAssignment.appendChild(assignedGuest);
                        
                        assignedGuest.addEventListener('dragstart', (e) => this.handleDragStart(e));
                        assignedGuest.addEventListener('dragend', (e) => this.handleDragEnd(e));
                    }
                } else {
                    // Check if this bed has a suggested assignment
                    const suggestedGuest = this.getSuggestedGuestForBed(bed.bedId);

                    if (suggestedGuest) {
                        // Render suggested assignment with transparency
                        bedRow.classList.add('suggested');

                        const assignedGuest = document.createElement('div');
                        assignedGuest.className = 'assigned-guest suggested-guest';

                        // Create display
                        const displayName = this.createDisplayName(suggestedGuest);
                        const guestName = `${displayName} ${suggestedGuest.lastName}`;

                        // Add suggestion badge
                        const suggestionBadge = document.createElement('span');
                        suggestionBadge.className = 'badge badge-suggestion';
                        suggestionBadge.textContent = '💡 SUGGESTED';
                        suggestionBadge.style.marginRight = 'var(--space-2)';

                        // Add age/gender badge
                        const ageGenderSpan = document.createElement('span');
                        ageGenderSpan.className = 'badge';
                        ageGenderSpan.textContent = `${suggestedGuest.age}${suggestedGuest.gender}`;

                        if (suggestedGuest.gender === 'M') {
                            ageGenderSpan.classList.add('badge-gender-m');
                        } else if (suggestedGuest.gender === 'F') {
                            ageGenderSpan.classList.add('badge-gender-f');
                        } else {
                            ageGenderSpan.classList.add('badge-gender-coed');
                        }

                        const nameSpan = document.createElement('span');
                        nameSpan.style.fontWeight = '600';
                        nameSpan.style.marginRight = 'var(--space-2)';
                        nameSpan.textContent = guestName;

                        let infoText = '';
                        if (suggestedGuest.lowerBunk) {
                            infoText += '  🛏️';
                        }
                        if (suggestedGuest.groupName) {
                            infoText += `  👥${suggestedGuest.groupName}`;
                        }

                        const infoSpan = document.createElement('span');
                        infoSpan.style.fontSize = 'var(--font-size-sm)';
                        infoSpan.style.color = 'var(--text-secondary)';
                        infoSpan.textContent = infoText;

                        assignedGuest.appendChild(suggestionBadge);
                        assignedGuest.appendChild(ageGenderSpan);
                        assignedGuest.appendChild(nameSpan);
                        assignedGuest.appendChild(infoSpan);

                        bedAssignment.appendChild(assignedGuest);

                        // Add accept button (green check)
                        const acceptBtn = document.createElement('button');
                        acceptBtn.className = 'btn btn-tiny btn-accept';
                        acceptBtn.textContent = '✓';
                        acceptBtn.title = 'Accept this suggestion';
                        acceptBtn.style.backgroundColor = '#10b981';
                        acceptBtn.style.color = 'white';
                        acceptBtn.style.marginLeft = 'var(--space-2)';
                        acceptBtn.addEventListener('click', () => this.acceptSuggestion(suggestedGuest.id));

                        // Add reject button (red X)
                        const rejectBtn = document.createElement('button');
                        rejectBtn.className = 'btn btn-tiny btn-reject';
                        rejectBtn.textContent = '✕';
                        rejectBtn.title = 'Reject this suggestion';
                        rejectBtn.style.backgroundColor = '#ef4444';
                        rejectBtn.style.color = 'white';
                        rejectBtn.style.marginLeft = 'var(--space-1)';
                        rejectBtn.addEventListener('click', () => this.rejectSuggestion(suggestedGuest.id));

                        bedRow.appendChild(bedLabel);
                        bedRow.appendChild(bedAssignment);
                        bedRow.appendChild(acceptBtn);
                        bedRow.appendChild(rejectBtn);
                        bedsContainer.appendChild(bedRow);

                        bedRow.addEventListener('dragover', (e) => this.handleDragOver(e));
                        bedRow.addEventListener('drop', (e) => this.handleDrop(e));

                        // Skip the default button/row append logic below
                        return;
                    } else {
                        // Empty bed - setup drop button
                        actionButton.textContent = '↓';
                        actionButton.title = 'Drop guest here';
                        actionButton.classList.add('btn-drop');
                        actionButton.style.display = this.pickedUpGuestId ? 'inline-flex' : 'none';
                        actionButton.addEventListener('click', () => this.dropGuest(bed.bedId));

                        bedAssignment.textContent = 'Empty';
                    }
                }
                
                bedRow.appendChild(bedLabel);
                bedRow.appendChild(bedAssignment);
                bedRow.appendChild(actionButton);
                bedsContainer.appendChild(bedRow);
                
                bedRow.addEventListener('dragover', (e) => this.handleDragOver(e));
                bedRow.addEventListener('drop', (e) => this.handleDrop(e));
            });
            
            roomCard.appendChild(roomHeader);
            if (ageHistogram) {
                roomCard.appendChild(ageHistogram);
            }
            roomCard.appendChild(bedsContainer);
            
            // Group lines will be added globally after all rooms are rendered
            container.appendChild(roomCard);
        });
        
        // Add global group connection lines after all rooms are rendered
        setTimeout(() => this.addGlobalGroupLines(), 50);
    }

    createAgeHistogram(guests) {
        if (!guests || guests.length === 0) return null;
        
        const histogramContainer = document.createElement('div');
        histogramContainer.className = 'age-histogram';
        
        // Get ages and find the overall max age across all guests (for consistent buckets)
        const ages = guests.map(g => parseInt(g.age) || 0);
        const maxAgeInRoom = Math.max(...ages);
        
        // Find max age across ALL guests for consistent bucket range
        const allAges = this.guests.map(g => parseInt(g.age) || 0);
        const globalMaxAge = Math.max(...allAges);
        
        // Create age buckets (5-year ranges) from 0 to max age
        const bucketSize = 5;
        const maxBucketStart = Math.floor(globalMaxAge / bucketSize) * bucketSize;
        
        // Initialize all buckets with 0 count
        const buckets = new Map();
        for (let bucketStart = 0; bucketStart <= maxBucketStart; bucketStart += bucketSize) {
            const bucketKey = `${bucketStart}-${bucketStart + bucketSize - 1}`;
            buckets.set(bucketKey, 0);
        }
        
        // Count guests in each bucket for this room
        for (const age of ages) {
            const bucketStart = Math.floor(age / bucketSize) * bucketSize;
            const bucketKey = `${bucketStart}-${bucketStart + bucketSize - 1}`;
            buckets.set(bucketKey, buckets.get(bucketKey) + 1);
        }
        
        const maxCount = Math.max(...buckets.values());
        
        // Create histogram bars for all buckets
        for (const [range, count] of buckets) {
            const bar = document.createElement('div');
            bar.className = 'histogram-bar';
            
            const barFill = document.createElement('div');
            barFill.className = 'histogram-bar-fill';
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            barFill.style.height = `${height}%`;
            barFill.title = count > 0 ? `Ages ${range}: ${count} guest${count !== 1 ? 's' : ''}` : `Ages ${range}: 0 guests`;
            
            // Style empty buckets differently
            if (count === 0) {
                barFill.style.opacity = '0.1';
                barFill.style.minHeight = '2px';
            } else {
                barFill.style.minHeight = '0';
            }
            
            const barLabel = document.createElement('div');
            barLabel.className = 'histogram-label';
            barLabel.textContent = range;
            
            bar.appendChild(barFill);
            bar.appendChild(barLabel);
            histogramContainer.appendChild(bar);
        }
        
        return histogramContainer;
    }

    // getAssignmentWarnings method moved to AppValidation mixin

    // getAssignmentWarningsForUnassignedGuest method moved to AppValidation mixin

    handleDragStart(e) {
        const guestId = e.target.dataset.guestId;
        e.dataTransfer.setData('text/plain', guestId);
        e.target.classList.add('dragging');
        
        const guest = this.guests.find(g => g.id === guestId);
        if (!guest) return;
        
        // Highlight valid and invalid drop zones
        document.querySelectorAll('.bed-row').forEach(bed => {
            if (!bed.querySelector('.assigned-guest')) {
                bed.classList.add('drop-zone');
                
                // Check if this would be a valid assignment
                const bedId = bed.dataset.bedId;
                const bedObj = this.findBed(bedId);
                if (bedObj) {
                    const room = this.rooms.find(r => r.beds.includes(bedObj));
                    if (room) {
                        const warnings = this.getAssignmentWarnings(guest, bedObj, room);
                        // Only show as invalid if serious warnings are enabled and present
                        if (this.hasSeriousValidationIssues(guest, bedObj, room)) {
                            bed.classList.add('invalid');
                        }
                    }
                }
            }
        });
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.bed-row').forEach(bed => {
            bed.classList.remove('drop-zone', 'invalid');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        const guestId = e.dataTransfer.getData('text/plain');
        const bedRow = e.target.closest('.bed-row');
        const guestsContainer = e.target.closest('#guestsContainer');
        
        if (!guestId) return;
        
        // Check if dropping on unassigned guests table to unassign
        if (guestsContainer) {
            this.unassignGuest(guestId);
            return;
        }
        
        // Check if dropping on a bed
        if (bedRow) {
            const bedId = bedRow.dataset.bedId;
            if (!bedId) return;
            
            const bed = this.findBed(bedId);
            if (!bed || bed.assignedGuestId) return;
            
            this.assignGuestToBed(guestId, bedId);
        }
    }

    findBed(bedId) {
        for (const room of this.rooms) {
            const bed = room.beds.find(b => b.bedId === bedId);
            if (bed) return bed;
        }
        return null;
    }
    
    findBedInDormitories(bedId) {
        for (const dormitory of this.dormitories) {
            if (!dormitory.active) continue;
            for (const room of dormitory.rooms) {
                if (!room.active) continue;
                const bed = room.beds.find(b => b.bedId === bedId);
                if (bed) return { bed, room, dormitory };
            }
        }
        return null;
    }

    assignGuestToBed(guestId, bedId) {
        // Save current state for undo
        this.saveToHistory();
        
        const existingBedId = this.assignments.get(guestId);
        if (existingBedId) {
            const existingBed = this.findBed(existingBedId);
            if (existingBed) {
                existingBed.assignedGuestId = null;
            }
        }
        
        const bed = this.findBed(bedId);
        if (bed) {
            bed.assignedGuestId = guestId;
            this.assignments.set(guestId, bedId);
        }
        
        this.renderGuestsTable();
        this.renderRooms();
        this.updateCounts();
        this.updateUndoButton();
        this.saveToLocalStorage();
    }
    
    unassignGuest(guestId) {
        // Save current state for undo
        this.saveToHistory();

        const bedId = this.assignments.get(guestId);
        if (bedId) {
            const bed = this.findBed(bedId);
            if (bed) {
                bed.assignedGuestId = null;
            }
            this.assignments.delete(guestId);
        }

        this.renderGuestsTable();
        this.renderRooms();
        this.updateCounts();
        this.updateUndoButton();
        this.saveToLocalStorage();
    }

    // Auto-placement helper methods
    getSuggestedGuestForBed(bedId) {
        // Find guestId that has this bedId as suggested assignment
        for (const [guestId, suggestedBedId] of this.suggestedAssignments) {
            if (suggestedBedId === bedId) {
                return this.guests.find(g => g.id === guestId);
            }
        }
        return null;
    }

    isBedSuggested(bedId) {
        // Check if this bed has a suggested assignment
        for (const suggestedBedId of this.suggestedAssignments.values()) {
            if (suggestedBedId === bedId) {
                return true;
            }
        }
        return false;
    }

    clearSuggestions() {
        // Clear all suggested assignments
        this.suggestedAssignments.clear();
        this.renderGuestsTable();
        this.renderRooms();
        this.updateSuggestionButtons();
    }

    // ================================
    // AUTO-PLACEMENT ALGORITHM
    // ================================

    /**
     * Main auto-placement method - assigns unassigned guests to available beds
     * Uses multi-pass algorithm with progressive constraint relaxation
     */
    autoPlaceGuests() {
        if (!this.settings.autoPlacement.enabled) {
            this.showStatus('Auto-placement is disabled in settings', 'error');
            return;
        }

        // Clear any existing suggestions
        this.suggestedAssignments.clear();

        // Get unassigned guests
        const unassignedGuests = this.guests.filter(g => !this.assignments.has(g.id));

        if (unassignedGuests.length === 0) {
            this.showStatus('All guests are already assigned', 'info');
            return;
        }

        // Get available beds
        const availableBeds = this.getAllAvailableBeds();

        if (availableBeds.length === 0) {
            this.showStatus('No available beds for placement', 'error');
            return;
        }

        // Multi-pass placement with constraint relaxation
        const passes = [
            { name: 'strict', allowRelaxation: false },
            { name: 'relaxed', allowRelaxation: true, relaxBunkPreference: true },
            { name: 'emergency', allowRelaxation: true, relaxBunkPreference: true, relaxAge: true }
        ];

        let placedCount = 0;
        const guestsToPlace = [...unassignedGuests];

        for (const pass of passes) {
            if (guestsToPlace.length === 0) break;

            const placedInPass = this.placementPass(guestsToPlace, availableBeds, pass);
            placedCount += placedInPass;

            // Remove placed guests from queue
            for (let i = guestsToPlace.length - 1; i >= 0; i--) {
                if (this.suggestedAssignments.has(guestsToPlace[i].id)) {
                    guestsToPlace.splice(i, 1);
                }
            }

            // Stop after strict pass if constraint relaxation is disabled
            if (!this.settings.autoPlacement.allowConstraintRelaxation && pass.name === 'strict') {
                break;
            }
        }

        // Refresh UI to show suggestions
        this.renderGuestsTable();
        this.renderRooms();

        this.showStatus(
            `Auto-placement complete: ${placedCount} suggestions created (${guestsToPlace.length} guests could not be placed)`,
            placedCount > 0 ? 'success' : 'warning'
        );

        // Show/hide suggestion action buttons
        this.updateSuggestionButtons();
    }

    /**
     * Accept a single suggested assignment
     */
    acceptSuggestion(guestId) {
        const bedId = this.suggestedAssignments.get(guestId);
        if (!bedId) return;

        // Remove from suggestions
        this.suggestedAssignments.delete(guestId);

        // Make permanent assignment
        this.assignGuestToBed(guestId, bedId);

        // Update suggestion buttons
        this.updateSuggestionButtons();
    }

    /**
     * Reject a single suggested assignment
     */
    rejectSuggestion(guestId) {
        this.suggestedAssignments.delete(guestId);
        this.renderGuestsTable();
        this.renderRooms();

        // Update suggestion buttons
        this.updateSuggestionButtons();
    }

    /**
     * Accept all suggested assignments at once
     */
    acceptAllSuggestions() {
        const suggestions = Array.from(this.suggestedAssignments.entries());

        if (suggestions.length === 0) {
            this.showStatus('No suggestions to accept', 'info');
            return;
        }

        // Save to history before batch operation
        this.saveToHistory();

        for (const [guestId, bedId] of suggestions) {
            // Make assignment without saving to history each time
            const bed = this.findBed(bedId);
            if (bed) {
                bed.assignedGuestId = guestId;
                this.assignments.set(guestId, bedId);
            }
        }

        // Clear all suggestions
        this.suggestedAssignments.clear();

        // Refresh UI once
        this.renderGuestsTable();
        this.renderRooms();
        this.updateCounts();
        this.updateUndoButton();
        this.saveToLocalStorage();

        // Update suggestion buttons
        this.updateSuggestionButtons();

        this.showStatus(`Accepted ${suggestions.length} suggested assignments`, 'success');
    }

    /**
     * Update visibility of suggestion action buttons
     */
    updateSuggestionButtons() {
        const hasSuggestions = this.suggestedAssignments.size > 0;
        document.getElementById('acceptAllBtn').style.display = hasSuggestions ? 'inline-block' : 'none';
        document.getElementById('clearSuggestionsBtn').style.display = hasSuggestions ? 'inline-block' : 'none';
    }

    /**
     * Update visibility of Auto Place button
     */
    updateAutoPlaceButton() {
        const hasUnassignedGuests = this.guests.some(g => !this.assignments.has(g.id));
        const hasGuests = this.guests.length > 0;
        document.getElementById('autoPlaceBtn').style.display = (hasGuests && hasUnassignedGuests) ? 'inline-block' : 'none';
    }

    /**
     * Single placement pass - attempts to place guests with given constraints
     */
    placementPass(guests, availableBeds, passConfig) {
        let placedCount = 0;

        for (const guest of guests) {
            // Skip if already placed in previous pass
            if (this.suggestedAssignments.has(guest.id)) continue;

            // Find best bed for this guest
            let bestBed = null;
            let bestScore = -Infinity;

            for (const bed of availableBeds) {
                // Skip if bed is already assigned or suggested
                if (bed.assignedGuestId) continue;
                if (this.isBedSuggested(bed.bedId)) continue;

                // Calculate placement score
                const score = this.calculatePlacementScore(guest, bed, passConfig);

                if (score > bestScore) {
                    bestScore = score;
                    bestBed = bed;
                }
            }

            // Assign to best bed if score is acceptable
            if (bestBed && bestScore > 0) {
                this.suggestedAssignments.set(guest.id, bestBed.bedId);
                placedCount++;
            }
        }

        return placedCount;
    }

    /**
     * Calculate placement score for guest-bed combination
     */
    calculatePlacementScore(guest, bed, passConfig) {
        let score = 0;
        const priorities = this.settings.autoPlacement.priorities;

        // Find room containing this bed
        const room = this.findRoomForBed(bed.bedId);
        if (!room) return -Infinity;

        // Gender matching (highest priority)
        const genderPriority = priorities.find(p => p.name === 'gender');
        if (genderPriority?.enabled) {
            const genderScore = this.scoreGenderMatch(guest, room);
            if (genderScore < 0) return -Infinity; // Hard constraint
            score += genderScore * genderPriority.weight;
        }

        // Gendered room preference (prefer gendered rooms over co-ed for same-gender groups)
        const genderedRoomPriority = priorities.find(p => p.name === 'genderedRoomPreference');
        if (genderedRoomPriority?.enabled) {
            score += this.scoreGenderedRoomPreference(guest, room) * genderedRoomPriority.weight;
        }

        // Family/group grouping
        const familyPriority = priorities.find(p => p.name === 'families');
        if (familyPriority?.enabled) {
            score += this.scoreFamilyGrouping(guest, room, bed) * familyPriority.weight;
        }

        // Bunk preference
        const bunkPriority = priorities.find(p => p.name === 'bunkPreference');
        if (bunkPriority?.enabled && !passConfig.relaxBunkPreference) {
            score += this.scoreBunkPreference(guest, bed) * bunkPriority.weight;
        }

        // Age compatibility
        const agePriority = priorities.find(p => p.name === 'ageCompatibility');
        if (agePriority?.enabled && !passConfig.relaxAge) {
            score += this.scoreAgeCompatibility(guest, room) * agePriority.weight;
        }

        return score;
    }

    /**
     * Score gender matching (hard constraint)
     */
    scoreGenderMatch(guest, room) {
        // Coed rooms accept anyone
        if (room.roomGender === 'Coed') return 1.0;

        // Check guest gender
        const guestGender = guest.gender?.toUpperCase();

        if (!guestGender) return 0; // Unknown gender gets neutral score

        // Male/Female must match room gender
        if (room.roomGender === 'M' && guestGender === 'M') return 1.0;
        if (room.roomGender === 'F' && guestGender === 'F') return 1.0;

        // Gender mismatch is forbidden
        return -1;
    }

    /**
     * Score preference for gendered rooms over co-ed when appropriate
     * Prefers gendered rooms (M/F) over co-ed for same-gender individuals/groups
     * Prefers co-ed rooms for mixed-gender groups
     */
    scoreGenderedRoomPreference(guest, room) {
        const guestGender = guest.gender?.toUpperCase();

        // Unknown gender = neutral
        if (!guestGender) return 0;

        // Determine if guest's group (if any) is same-gender or mixed
        let groupGenders = [guestGender];

        if (guest.groupName) {
            // Collect genders of all group members
            for (const otherGuest of this.guests) {
                if (otherGuest.groupName === guest.groupName && otherGuest.id !== guest.id) {
                    const otherGender = otherGuest.gender?.toUpperCase();
                    if (otherGender) {
                        groupGenders.push(otherGender);
                    }
                }
            }
        }

        // Check if all group members are same gender
        const isSameGenderGroup = groupGenders.every(g => g === guestGender);
        const isMixedGenderGroup = !isSameGenderGroup && groupGenders.length > 1;

        // For same-gender individuals/groups: prefer gendered rooms over co-ed
        if (isSameGenderGroup) {
            // Matching gendered room gets highest score
            if ((room.roomGender === 'M' && guestGender === 'M') ||
                (room.roomGender === 'F' && guestGender === 'F')) {
                return 1.0;
            }
            // Co-ed room is acceptable but not preferred
            if (room.roomGender === 'Coed') {
                return 0.5;
            }
            // Wrong gendered room (will be blocked by scoreGenderMatch anyway)
            return 0;
        }

        // For mixed-gender groups: prefer co-ed rooms
        if (isMixedGenderGroup) {
            if (room.roomGender === 'Coed') {
                return 1.0;
            }
            // Gendered rooms are less preferred for mixed-gender groups
            return -0.3;
        }

        return 0;
    }

    /**
     * Score family/group grouping preference
     */
    scoreFamilyGrouping(guest, room, bed) {
        // No group = neutral
        if (!guest.groupName) return 0;

        // Count family members already in this room (actual + suggested)
        let familyInRoom = 0;
        let familyElsewhere = 0;

        for (const otherGuest of this.guests) {
            if (otherGuest.id === guest.id) continue;
            if (otherGuest.groupName !== guest.groupName) continue;

            const assignedBedId = this.assignments.get(otherGuest.id) || this.suggestedAssignments.get(otherGuest.id);
            if (!assignedBedId) continue;

            const otherBed = this.findBed(assignedBedId);
            if (!otherBed) continue;

            const otherRoom = this.findRoomForBed(assignedBedId);
            if (otherRoom?.roomName === room.roomName) {
                familyInRoom++;
            } else {
                familyElsewhere++;
            }
        }

        // Prefer rooms where family is already present
        if (familyInRoom > 0) return 1.0;

        // Penalize if splitting family
        if (familyElsewhere > 0) return -0.5;

        return 0;
    }

    /**
     * Score bunk preference matching
     */
    scoreBunkPreference(guest, bed) {
        // No preference = neutral
        if (!guest.lowerBunk) return 0;

        const needsLowerBunk = guest.lowerBunk === 'Yes' || guest.lowerBunk === true || guest.lowerBunk === 'TRUE';

        if (!needsLowerBunk) return 0;

        // Reward lower bunk or single bed
        if (bed.bedType === 'lower' || bed.bedType === 'single') {
            return 1.0;
        }

        // Penalize upper bunk
        if (bed.bedType === 'upper') {
            return -0.5;
        }

        return 0;
    }

    /**
     * Score age compatibility with roommates
     */
    scoreAgeCompatibility(guest, room) {
        if (!guest.age) return 0;

        const guestAge = parseInt(guest.age);
        if (isNaN(guestAge)) return 0;

        // Get ages of current and suggested roommates
        const roommateAges = [];

        for (const bed of room.beds) {
            const assignedGuestId = bed.assignedGuestId ||
                (this.suggestedAssignments.has(bed.bedId) ?
                    [...this.suggestedAssignments.entries()].find(([gId, bId]) => bId === bed.bedId)?.[0] : null);

            if (assignedGuestId) {
                const roommate = this.guests.find(g => g.id === assignedGuestId);
                if (roommate?.age) {
                    const age = parseInt(roommate.age);
                    if (!isNaN(age)) roommateAges.push(age);
                }
            }
        }

        if (roommateAges.length === 0) return 0;

        // Calculate average age gap
        const avgAge = roommateAges.reduce((sum, age) => sum + age, 0) / roommateAges.length;
        const ageGap = Math.abs(guestAge - avgAge);

        // Score based on age gap (smaller gap = better)
        if (ageGap < 5) return 1.0;
        if (ageGap < 10) return 0.5;
        if (ageGap < 20) return 0.0;
        return -0.3;
    }

    /**
     * Get all available beds across all dormitories
     */
    getAllAvailableBeds() {
        const availableBeds = [];

        for (const dormitory of this.dormitories) {
            if (!dormitory.active) continue;

            for (const room of dormitory.rooms) {
                if (!room.active) continue;

                for (const bed of room.beds) {
                    if (!bed.assignedGuestId) {
                        availableBeds.push({
                            ...bed,
                            roomName: room.roomName,
                            roomGender: room.roomGender,
                            dormitoryName: dormitory.dormitoryName
                        });
                    }
                }
            }
        }

        return availableBeds;
    }

    /**
     * Find room containing a specific bed
     */
    findRoomForBed(bedId) {
        for (const dormitory of this.dormitories) {
            for (const room of dormitory.rooms) {
                if (room.beds.some(b => b.bedId === bedId)) {
                    return room;
                }
            }
        }
        return null;
    }

    updateCounts() {
        const unassignedCount = this.guests.filter(guest => !this.assignments.has(guest.id)).length;
        const assignedCount = this.assignments.size;

        document.getElementById('unassignedCount').textContent = `(${unassignedCount})`;
        document.getElementById('assignedCount').textContent = `(${assignedCount})`;

        // Update Auto Place button visibility
        this.updateAutoPlaceButton();
    }
    
    saveToHistory() {
        const state = {
            assignments: new Map(this.assignments),
            rooms: JSON.parse(JSON.stringify(this.rooms)),
            dormitories: JSON.parse(JSON.stringify(this.dormitories))
        };
        
        this.assignmentHistory.push(state);
        
        // Limit history size
        if (this.assignmentHistory.length > this.maxHistorySize) {
            this.assignmentHistory.shift();
        }
    }
    
    undoLastAction() {
        if (this.assignmentHistory.length === 0) return;
        
        const previousState = this.assignmentHistory.pop();
        this.assignments = new Map(previousState.assignments);
        this.rooms = JSON.parse(JSON.stringify(previousState.rooms));
        
        // Restore dormitory structure if available
        if (previousState.dormitories) {
            this.dormitories = JSON.parse(JSON.stringify(previousState.dormitories));
        }
        
        this.renderGuestsTable();
        this.renderRooms();
        this.updateCounts();
        this.updateUndoButton();
        this.saveToLocalStorage();
    }
    
    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        undoBtn.disabled = this.assignmentHistory.length === 0;
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    exportCSV() {
        const csvRows = [];
        const headers = Object.keys(this.guests[0] || {});
        headers.push('assignedRoom', 'assignedBed');
        csvRows.push(headers.join(','));
        
        this.guests.forEach(guest => {
            const row = [];
            headers.forEach(header => {
                if (header === 'assignedRoom') {
                    const bedId = this.assignments.get(guest.id);
                    if (bedId) {
                        const room = this.rooms.find(r => r.beds.some(b => b.bedId === bedId));
                        row.push(room ? room.roomName : '');
                    } else {
                        row.push('');
                    }
                } else if (header === 'assignedBed') {
                    const bedId = this.assignments.get(guest.id);
                    row.push(bedId || '');
                } else {
                    const value = guest[header] || '';
                    row.push(typeof value === 'string' && value.includes(',') ? `"${value}"` : value);
                }
            });
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.generateTimestampedFilename('dorm_assignments', 'csv');
        a.click();
        window.URL.revokeObjectURL(url);
    }

    resetAllAssignments() {
        if (confirm('Are you sure you want to reset all assignments? This will move all guests back to unassigned status but keep guest data and room configuration.')) {
            // Clear assignments but keep guests and room configuration
            this.assignments.clear();
            this.assignmentHistory = [];
            
            // Clear assigned guest IDs from all beds
            this.rooms.forEach(room => {
                room.beds.forEach(bed => {
                    bed.assignedGuestId = null;
                });
            });
            
            this.renderGuestsTable();
            this.renderRooms();
            this.updateCounts();
            this.updateUndoButton();
            this.saveToLocalStorage();
            
            this.showStatus('All assignments reset successfully', 'success');
        }
    }
    
    deleteAllPeopleData() {
        if (confirm('Are you sure you want to delete all people data? This will remove all guests but keep room configuration. This action cannot be undone.')) {
            // Clear guests and assignments but keep room configuration
            this.guests = [];
            this.assignments.clear();
            this.assignmentHistory = [];
            
            // Clear assigned guest IDs from all beds
            this.rooms.forEach(room => {
                room.beds.forEach(bed => {
                    bed.assignedGuestId = null;
                });
            });
            
            this.renderGuestsTable();
            this.renderRooms();
            this.updateCounts();
            this.updateUndoButton();
            this.saveToLocalStorage();
            
            // Hide action buttons since no guests exist
            document.getElementById('autoPlaceBtn').style.display = 'none';
            document.getElementById('acceptAllBtn').style.display = 'none';
            document.getElementById('clearSuggestionsBtn').style.display = 'none';
            document.getElementById('exportBtn').style.display = 'none';
            document.getElementById('resetAssignmentsBtn').style.display = 'none';
            document.getElementById('deletePeopleBtn').style.display = 'none';
            document.getElementById('undoBtn').style.display = 'none';
            document.getElementById('csvFile').value = '';
            
            this.showStatus('All people data deleted successfully', 'success');
        }
    }

    // saveToLocalStorage method moved to AppStorage mixin

    // loadFromLocalStorage method moved to AppStorage mixin
    // migrateFromOldStructure method moved to AppStorage mixin
    
    // Room Configuration Methods
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
                <div class="dormitory-color-picker">
                    <label for="dormColor${index}">Color:</label>
                    <input type="color" id="dormColor${index}" value="${dormitory.color || '#f8f9fa'}" 
                           onchange="app.updateDormitoryColor(${index}, this.value)">
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
    }
    
    selectDormitory(dormitoryIndex) {
        this.selectedDormitory = dormitoryIndex;
        const dormitory = this.dormitories[dormitoryIndex];
        
        // Update UI
        document.querySelectorAll('.dormitory-card').forEach(card => card.classList.remove('selected'));
        document.querySelector(`[data-dormitory-index="${dormitoryIndex}"]`).classList.add('selected');
        
        document.getElementById('selectedDormitoryName').textContent = dormitory.dormitoryName;
        document.getElementById('addRoomBtn').style.display = 'inline-block';
        
        this.renderRoomConfiguration();
    }
    
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
                               room.roomGender === 'F' ? 'female' : 
                               room.roomGender === 'Coed' ? 'coed' : 'nonbinary';
            
            roomCard.innerHTML = `
                <div class="room-config-header">
                    <h4>${room.roomName}</h4>
                    <span class="status-badge ${room.active ? 'active' : 'inactive'}">
                        ${room.active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="room-config-info">
                    <span class="badge badge-gender-${room.roomGender === 'M' ? 'm' : room.roomGender === 'F' ? 'f' : 'coed'}">${room.roomGender}</span>
                    <span class="room-config-detail">🛏️ ${bedCount} beds</span>
                    <span class="room-config-detail">👤 ${occupiedBeds} occupied</span>
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
    }
    
    addDormitory() {
        const name = prompt('Enter dormitory name:');
        if (!name) return;
        
        this.dormitories.push({
            dormitoryName: name,
            active: true,
            color: "#f8f9fa",
            rooms: []
        });
        
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    }
    
    updateDormitoryColor(dormitoryIndex, color) {
        if (dormitoryIndex >= 0 && dormitoryIndex < this.dormitories.length) {
            this.dormitories[dormitoryIndex].color = color;
            this.renderRooms(); // Re-render rooms to apply new color
            this.saveToLocalStorage();
        }
    }
    
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
    }
    
    toggleDormitoryActive(dormitoryIndex) {
        this.dormitories[dormitoryIndex].active = !this.dormitories[dormitoryIndex].active;
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    }
    
    renameDormitory(dormitoryIndex) {
        const newName = prompt('Enter new dormitory name:', this.dormitories[dormitoryIndex].dormitoryName);
        if (!newName) return;
        
        this.dormitories[dormitoryIndex].dormitoryName = newName;
        this.renderDormitories();
        this.refreshRoomsFromDormitories();
        this.saveToLocalStorage();
    }
    
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
    }
    
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
                'Dormitory Color',
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
                                    this.escapeCSVField(dormitory.color || '#f8f9fa'),
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
                                this.escapeCSVField(dormitory.color || '#f8f9fa'),
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
    }
    
    importRoomConfig() {
        // Trigger file input click
        const fileInput = document.getElementById('roomConfigFile');
        fileInput.click();
    }
    
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
    }
    
    parseRoomConfigCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Create a mapping of expected fields to actual header variations
        const fieldMappings = {
            dormitoryName: ['Dormitory Name', 'dormitory_name', 'dormitoryName', 'Dormitory'],
            dormitoryColor: ['Dormitory Color', 'dormitory_color', 'dormitoryColor', 'Color'],
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
                    color: rowData.dormitoryColor || '#f8f9fa',
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
            color: dormitory.color,
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
    }
    
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
    }
    
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
    }
    
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
    }
    
    closeBedConfiguration() {
        document.getElementById('bedConfigModal').classList.remove('active');
        this.hideAddBedInterface();
        this.bedConfigDormitoryIndex = null;
        this.bedConfigRoomIndex = null;
    }
    
    showAddBedInterface() {
        document.getElementById('addBedInterface').style.display = 'block';
    }
    
    hideAddBedInterface() {
        document.getElementById('addBedInterface').style.display = 'none';
    }
    
    bindBedTypeSelector() {
        const options = document.querySelectorAll('.bed-type-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedBedType = option.dataset.type;
            });
        });
    }
    
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
    }
    
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
    }
    
    addBedToCurrent() {
        if (this.bedConfigDormitoryIndex === null || this.bedConfigRoomIndex === null) {
            return;
        }
        
        this.addBed(this.bedConfigDormitoryIndex, this.bedConfigRoomIndex, this.selectedBedType);
        this.hideAddBedInterface();
    }
    
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
    }
    
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
    }
    
    // Pickup and Drop functionality
    pickupGuest(guestId) {
        this.pickedUpGuestId = guestId;
        
        // Update UI to show picked up state
        this.renderRooms(); // Re-render to show drop buttons and highlight picked guest
    }
    
    dropGuest(bedId) {
        if (!this.pickedUpGuestId) return;
        
        // Find the bed and assign the guest
        const targetBed = this.findBedById(bedId);
        if (!targetBed) return;
        
        // Find and clear the original bed assignment
        const currentBedId = this.assignments.get(this.pickedUpGuestId);
        if (currentBedId) {
            const currentBed = this.findBedById(currentBedId);
            if (currentBed) {
                currentBed.assignedGuestId = null;
            }
        }
        
        // Remove guest from current assignment
        this.assignments.delete(this.pickedUpGuestId);
        
        // Assign to new bed
        this.assignments.set(this.pickedUpGuestId, bedId);
        targetBed.assignedGuestId = this.pickedUpGuestId;
        
        // Clear pickup state
        this.pickedUpGuestId = null;
        
        // Update history and save
        this.saveToHistory();
        this.saveToLocalStorage();
        
        // Update UI
        this.renderGuestsTable();
        this.renderRooms();
        this.updateCounts();
    }
    
    swapGuests(targetGuestId) {
        if (!this.pickedUpGuestId || this.pickedUpGuestId === targetGuestId) return;
        
        // Get bed assignments for both guests
        const pickedUpBedId = this.assignments.get(this.pickedUpGuestId);
        const targetBedId = this.assignments.get(targetGuestId);
        
        if (!pickedUpBedId || !targetBedId) return;
        
        // Find the actual bed objects
        const pickedUpBed = this.findBedById(pickedUpBedId);
        const targetBed = this.findBedById(targetBedId);
        
        if (!pickedUpBed || !targetBed) return;
        
        // Swap assignments in the Map
        this.assignments.set(this.pickedUpGuestId, targetBedId);
        this.assignments.set(targetGuestId, pickedUpBedId);
        
        // Swap assignments in bed objects
        pickedUpBed.assignedGuestId = targetGuestId;
        targetBed.assignedGuestId = this.pickedUpGuestId;
        
        // Clear pickup state
        this.pickedUpGuestId = null;
        
        // Update history and save
        this.saveToHistory();
        this.saveToLocalStorage();
        
        // Update UI
        this.renderGuestsTable();
        this.renderRooms();
        this.updateCounts();
    }
    
    findBedById(bedId) {
        for (const dormitory of this.dormitories) {
            for (const room of dormitory.rooms) {
                for (const bed of room.beds) {
                    if (bed.bedId === bedId) {
                        return bed;
                    }
                }
            }
        }
        return null;
    }
    
    addGlobalGroupLines() {
        try {
            // Remove any existing SVG in guests container
            const guestsContainer = document.getElementById('guestsContainer');
            const existingGuestsSvg = guestsContainer.querySelector('.group-lines-svg');
            if (existingGuestsSvg) {
                existingGuestsSvg.remove();
            }

            // Remove any existing SVG in rooms container
            const roomsContainer = document.getElementById('roomsContainer');
            const existingRoomsSvg = roomsContainer.querySelector('.group-lines-svg');
            if (existingRoomsSvg) {
                existingRoomsSvg.remove();
            }

            // Find all guests with group names (unassigned only for guests container)
            const unassignedGroupMap = {};
            const unassignedGuests = this.guests.filter(guest => !this.assignments.has(guest.id));
            unassignedGuests.forEach(guest => {
                if (guest.groupName && guest.groupName.trim()) {
                    const groupName = guest.groupName.trim();
                    if (!unassignedGroupMap[groupName]) {
                        unassignedGroupMap[groupName] = [];
                    }
                    unassignedGroupMap[groupName].push({
                        guest,
                        element: this.findGuestRowElement(guest.id)
                    });
                }
            });

            // Draw lines in guests container
            if (Object.keys(unassignedGroupMap).length > 0) {
                this.drawGroupLinesInContainer(guestsContainer, unassignedGroupMap);
            }

            // Find assigned guests with group names for rooms container
            const assignedGroupMap = {};
            this.assignments.forEach((bedId, guestId) => {
                const guest = this.guests.find(g => g.id === guestId);
                if (guest && guest.groupName && guest.groupName.trim()) {
                    const groupName = guest.groupName.trim();
                    if (!assignedGroupMap[groupName]) {
                        assignedGroupMap[groupName] = [];
                    }
                    assignedGroupMap[groupName].push({
                        guest,
                        bedId,
                        element: this.findBedRowElement(bedId)
                    });
                }
            });

            // Draw lines in rooms container
            if (Object.keys(assignedGroupMap).length > 0) {
                this.drawGroupLinesInContainer(roomsContainer, assignedGroupMap);
            }
        } catch (error) {
            console.error('Error adding global group lines:', error);
        }
    }
    
    findGuestRowElement(guestId) {
        // Find the table row for an unassigned guest
        const guestsTable = document.querySelector('#guestsContainer table');
        if (!guestsTable) return null;
        
        const rows = guestsTable.querySelectorAll('tr[data-guest-id]');
        for (const row of rows) {
            if (row.dataset.guestId === guestId) {
                return row;
            }
        }
        return null;
    }
    
    findBedRowElement(bedId) {
        // Find the bed row element for an assigned guest
        const bedRows = document.querySelectorAll('.bed-row');
        for (const row of bedRows) {
            if (row.dataset.bedId === bedId) {
                return row;
            }
        }
        return null;
    }
    
    drawGroupLinesInContainer(container, groupMap) {
        // Create SVG positioned inside the container
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('group-lines-svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1';

        // Make sure container has relative positioning
        if (window.getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        // Get container's bounding rect for offset calculation
        const containerRect = container.getBoundingClientRect();

        // Draw lines for each group
        Object.entries(groupMap).forEach(([groupName, members]) => {
            if (members.length < 2) return;

            // Calculate positions relative to container
            const positions = members
                .map(member => {
                    if (!member.element) return null;

                    // Find the gender/age badge within the element
                    const badge = member.element.querySelector('.badge');
                    let x, y;

                    if (badge) {
                        // Use the badge position as the connection point
                        const badgeRect = badge.getBoundingClientRect();
                        x = badgeRect.left - containerRect.left + container.scrollLeft + (badgeRect.width / 2);
                        y = badgeRect.top - containerRect.top + container.scrollTop + (badgeRect.height / 2);
                    } else {
                        // Fallback to row position if no badge found
                        const rect = member.element.getBoundingClientRect();
                        x = rect.left - containerRect.left + container.scrollLeft + 20;
                        y = rect.top - containerRect.top + container.scrollTop + (rect.height / 2);
                    }

                    return { x, y, member };
                })
                .filter(pos => pos !== null);

            if (positions.length < 2) return;

            // Draw connecting lines between consecutive members
            for (let i = 0; i < positions.length - 1; i++) {
                const start = positions[i];
                const end = positions[i + 1];

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', start.x);
                line.setAttribute('y1', start.y);
                line.setAttribute('x2', end.x);
                line.setAttribute('y2', end.y);
                line.setAttribute('stroke', '#dc3545');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('opacity', '0.6');
                line.setAttribute('class', 'group-connection-line');

                svg.appendChild(line);
            }

            // Add circle indicators at each position
            positions.forEach(pos => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', pos.x);
                circle.setAttribute('cy', pos.y);
                circle.setAttribute('r', '4');
                circle.setAttribute('fill', '#dc3545');
                circle.setAttribute('opacity', '0.8');
                circle.setAttribute('class', 'group-connection-indicator');

                svg.appendChild(circle);
            });
        });

        container.appendChild(svg);
    }
    
    drawGroupConnections(overlay, groupMembers) {
        // Sort members by bed index for consistent line drawing
        groupMembers.sort((a, b) => a.bedIndex - b.bedIndex);
        
        // Simple approach: use fixed row height and position calculation
        const rowHeight = 28; // Fixed bed row height from CSS
        const x = 180; // Position near the age badge area
        
        // Calculate positions based on bed index
        const positions = groupMembers.map(member => {
            const y = (member.bedIndex * rowHeight) + (rowHeight / 2);
            return { x, y, member };
        });
        
        // Draw lines connecting consecutive group members
        for (let i = 0; i < positions.length - 1; i++) {
            const start = positions[i];
            const end = positions[i + 1];
            
            // Create vertical connector line
            const line = document.createElement('div');
            line.className = 'group-line group-line-vertical';
            
            const top = Math.min(start.y, end.y);
            const height = Math.abs(end.y - start.y);
            
            line.style.left = `${start.x}px`;
            line.style.top = `${top}px`;
            line.style.height = `${height}px`;
            
            overlay.appendChild(line);
        }
        
        // Add small horizontal indicators at each member
        positions.forEach(pos => {
            const indicator = document.createElement('div');
            indicator.className = 'group-line group-line-horizontal';
            indicator.style.left = `${pos.x - 8}px`;
            indicator.style.top = `${pos.y - 1}px`;
            indicator.style.width = '16px';
            overlay.appendChild(indicator);
        });
    }
    
    setupGlobalLineUpdates() {
        // Only need to update on resize now, since SVG is inside scrollable containers
        if (!this.globalLineUpdateTimeout) {
            const updateLines = () => {
                this.addGlobalGroupLines();
            };

            // Update on resize with debouncing
            window.addEventListener('resize', () => {
                clearTimeout(this.globalLineUpdateTimeout);
                this.globalLineUpdateTimeout = setTimeout(updateLines, 100);
            });
        }
    }
    
    // generateBedId method is now provided by AppUtils mixin
    
    // escapeCSVField method is now provided by AppUtils mixin
}

// Apply AppUtils, AppStorage, and AppValidation mixins to DormAssignmentTool
Object.assign(DormAssignmentTool.prototype, AppUtils);
Object.assign(DormAssignmentTool.prototype, AppStorage);
Object.assign(DormAssignmentTool.prototype, AppValidation);

// Make app globally accessible for onclick handlers
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new DormAssignmentTool();

    // Auto-load test CSV if URL parameter is present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('autoload') || urlParams.has('test')) {
        autoLoadTestData();
    }
});

// Auto-load test_guests.csv for development/testing
async function autoLoadTestData() {
    try {
        const response = await fetch('test_guests.csv');
        if (!response.ok) {
            console.warn('test_guests.csv not found - skipping auto-load');
            return;
        }

        const csvText = await response.text();
        app.parseCSV(csvText);
        app.renderGuestsTable();
        app.renderRooms();
        app.updateCounts();

        // Show action buttons (Auto Place button visibility handled by updateCounts())
        document.getElementById('exportBtn').style.display = 'inline-block';
        document.getElementById('resetAssignmentsBtn').style.display = 'inline-block';
        document.getElementById('deletePeopleBtn').style.display = 'inline-block';
        document.getElementById('undoBtn').style.display = 'inline-block';

        app.showStatus('Test data auto-loaded successfully!', 'success');
        console.log('Auto-loaded test_guests.csv');
    } catch (error) {
        console.error('Error auto-loading test data:', error);
        app.showStatus('Failed to auto-load test data: ' + error.message, 'error');
    }
}

// Auto-load default_room_config.csv for monastery's default room setup
async function autoLoadDefaultRooms() {
    try {
        const response = await fetch('default_room_config.csv');
        if (!response.ok) {
            app.showStatus('Default room configuration file not found', 'error');
            console.warn('default_room_config.csv not found');
            return;
        }

        const csvText = await response.text();
        app.parseRoomConfigCSV(csvText);
        app.showStatus('Default room configuration loaded successfully!', 'success');

        // Update all interfaces
        app.renderDormitories();
        app.renderRoomConfiguration();
        app.refreshRoomsFromDormitories();
        app.renderRooms();
        app.renderGuestsTable();
        app.updateCounts();
        app.saveToLocalStorage();

        console.log('Auto-loaded default_room_config.csv');
    } catch (error) {
        console.error('Error auto-loading default room configuration:', error);
        app.showStatus('Failed to auto-load default room configuration: ' + error.message, 'error');
    }
}