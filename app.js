class DormAssignmentTool {
    constructor() {
        this.guests = [];
        this.rooms = [];
        this.assignments = new Map();
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchQuery = '';
        this.assignmentHistory = [];
        this.maxHistorySize = 10;
        
        this.initializeRooms();
        this.bindEvents();
        this.loadFromLocalStorage();
    }

    initializeRooms() {
        this.rooms = [
            {
                roomName: "Men's Dorm A",
                roomGender: "M",
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
                beds: [
                    { bedId: "WB1", bedType: "lower", assignedGuestId: null, position: 1 },
                    { bedId: "WB2", bedType: "upper", assignedGuestId: null, position: 2 },
                    { bedId: "WB3", bedType: "lower", assignedGuestId: null, position: 3 },
                    { bedId: "WB4", bedType: "upper", assignedGuestId: null, position: 4 }
                ]
            },
            {
                roomName: "Family Room",
                roomGender: "Coed",
                beds: [
                    { bedId: "FR1", bedType: "single", assignedGuestId: null, position: 1 },
                    { bedId: "FR2", bedType: "single", assignedGuestId: null, position: 2 },
                    { bedId: "FR3", bedType: "single", assignedGuestId: null, position: 3 },
                    { bedId: "FR4", bedType: "single", assignedGuestId: null, position: 4 }
                ]
            }
        ];
    }

    bindEvents() {
        document.getElementById('csvFile').addEventListener('change', (e) => this.handleCSVUpload(e));
        document.getElementById('searchGuests').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoLastAction());
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
                document.getElementById('exportBtn').style.display = 'inline-block';
                document.getElementById('clearBtn').style.display = 'inline-block';
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
            
            if (!guest.gender || !['M', 'F', 'Male', 'Female', 'male', 'female', 'm', 'f'].includes(guest.gender.trim())) {
                invalidRows.push(`Row ${i + 1}: Invalid gender '${guest.gender}'. Use M, F, Male, or Female`);
                continue;
            }
            
            // Normalize and clean data
            guest.age = parseInt(guest.age) || 0;
            guest.gender = guest.gender.trim().toUpperCase().charAt(0); // Normalize to M/F
            guest.lowerBunk = guest.lowerBunk === 'YES' || guest.lowerBunk === 'yes' || guest.lowerBunk === 'true' || guest.lowerBunk === 'TRUE' || guest.lowerBunk === '1';
            guest.firstVisit = guest.firstVisit === 'Yes' || guest.firstVisit === 'YES' || guest.firstVisit === 'true' || guest.firstVisit === 'TRUE' || guest.firstVisit === '1';
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
    }

    handleSearch(event) {
        this.searchQuery = event.target.value.toLowerCase();
        this.renderGuestsTable();
    }

    renderGuestsTable() {
        const container = document.getElementById('guestsContainer');
        const unassignedGuests = this.guests.filter(guest => !this.assignments.has(guest.id));
        
        if (unassignedGuests.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>All guests have been assigned to rooms.</p></div>';
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
        table.className = 'guests-table';
        
        const headerRow = document.createElement('tr');
        const columns = [
            { key: 'displayName', label: 'Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'gender', label: 'Gender' },
            { key: 'age', label: 'Age' },
            { key: 'lowerBunk', label: 'Lower Bunk' },
            { key: 'groupName', label: 'Group' },
            { key: 'arrival', label: 'Arrival' },
            { key: 'departure', label: 'Departure' }
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
        
        const groupedGuests = this.groupGuestsByGroupName(sortedGuests);
        
        groupedGuests.forEach((guest, index) => {
            const row = document.createElement('tr');
            row.className = 'guest-row';
            row.draggable = true;
            row.dataset.guestId = guest.id;
            
            if (guest.groupName && guest.groupName.trim()) {
                row.classList.add('group-member');
                
                // Add visual connection lines for grouped guests
                const groupMembers = groupedGuests.filter(g => g.groupName === guest.groupName);
                if (groupMembers.length > 1) {
                    const groupIndex = groupMembers.indexOf(guest);
                    const connectionLine = document.createElement('div');
                    connectionLine.className = 'group-connection-line';
                    
                    if (groupMembers.length === 1) {
                        connectionLine.classList.add('single');
                    } else if (groupIndex === 0) {
                        connectionLine.classList.add('first');
                    } else if (groupIndex === groupMembers.length - 1) {
                        connectionLine.classList.add('last');
                    } else {
                        connectionLine.classList.add('middle');
                    }
                    
                    row.appendChild(connectionLine);
                }
            }
            
            columns.forEach(col => {
                const td = document.createElement('td');
                let value = guest[col.key] || '';
                
                if (col.key === 'displayName') {
                    value = guest.preferredName || guest.firstName;
                    if (guest.preferredName && guest.preferredName !== guest.firstName) {
                        value += ` (${guest.firstName})`;
                    }
                } else if (col.key === 'lowerBunk') {
                    value = guest.lowerBunk ? 'Lower bunk required' : '';
                } else if (col.key === 'arrival' || col.key === 'departure') {
                    if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            value = date.toLocaleDateString();
                        }
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
                aVal = (a.preferredName || a.firstName || '').toString().toLowerCase();
                bVal = (b.preferredName || b.firstName || '').toString().toLowerCase();
            } else if (this.sortColumn === 'age') {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            } else if (this.sortColumn === 'lowerBunk') {
                aVal = a.lowerBunk ? 1 : 0;
                bVal = b.lowerBunk ? 1 : 0;
            } else {
                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
            }
            
            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
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
            
            const roomTitle = document.createElement('h3');
            roomTitle.textContent = room.roomName;
            
            const roomInfo = document.createElement('div');
            roomInfo.className = 'room-info';
            const occupiedBeds = room.beds.filter(bed => bed.assignedGuestId).length;
            roomInfo.textContent = `${room.roomGender} • ${occupiedBeds}/${room.beds.length} beds`;
            
            roomHeader.appendChild(roomTitle);
            roomHeader.appendChild(roomInfo);
            
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
                
                if (bed.assignedGuestId) {
                    const guest = this.guests.find(g => g.id === bed.assignedGuestId);
                    if (guest) {
                        bedRow.classList.add('occupied');
                        
                        const warnings = this.getAssignmentWarnings(guest, bed, room);
                        if (warnings.length > 0) {
                            bedRow.classList.add('warning');
                            bedRow.title = warnings.join('; ');
                        }
                        
                        const assignedGuest = document.createElement('div');
                        assignedGuest.className = 'assigned-guest';
                        assignedGuest.draggable = true;
                        assignedGuest.dataset.guestId = guest.id;
                        
                        const guestName = document.createElement('div');
                        guestName.className = 'guest-name';
                        const displayName = guest.preferredName || guest.firstName;
                        guestName.textContent = `${displayName} ${guest.lastName}`;
                        
                        const guestDetails = document.createElement('div');
                        guestDetails.className = 'guest-details';
                        let details = `${guest.gender}, Age ${guest.age}`;
                        if (guest.lowerBunk) {
                            details += ', Lower bunk required';
                        }
                        if (guest.groupName) {
                            details += `, Group: ${guest.groupName}`;
                        }
                        guestDetails.textContent = details;
                        
                        assignedGuest.appendChild(guestName);
                        assignedGuest.appendChild(guestDetails);
                        bedAssignment.appendChild(assignedGuest);
                        
                        assignedGuest.addEventListener('dragstart', (e) => this.handleDragStart(e));
                        assignedGuest.addEventListener('dragend', (e) => this.handleDragEnd(e));
                    }
                } else {
                    bedAssignment.textContent = 'Empty';
                }
                
                bedRow.appendChild(bedLabel);
                bedRow.appendChild(bedAssignment);
                bedsContainer.appendChild(bedRow);
                
                bedRow.addEventListener('dragover', (e) => this.handleDragOver(e));
                bedRow.addEventListener('drop', (e) => this.handleDrop(e));
            });
            
            roomCard.appendChild(roomHeader);
            roomCard.appendChild(bedsContainer);
            container.appendChild(roomCard);
        });
    }

    getAssignmentWarnings(guest, bed, room) {
        const warnings = [];
        
        if (guest.gender !== room.roomGender && room.roomGender !== 'Coed') {
            warnings.push(`Gender mismatch: ${guest.gender} guest in ${room.roomGender} room`);
        }
        
        if (guest.lowerBunk && bed.bedType === 'upper') {
            warnings.push('Upper bunk assigned to guest requiring lower bunk');
        }
        
        // Check for family/group separation warnings
        if (guest.groupName && guest.groupName.trim()) {
            const groupMembers = this.guests.filter(g => g.groupName === guest.groupName && g.id !== guest.id);
            const separatedMembers = groupMembers.filter(member => {
                const memberBedId = this.assignments.get(member.id);
                if (!memberBedId) return false; // Not assigned yet
                
                const memberRoom = this.rooms.find(r => r.beds.some(b => b.bedId === memberBedId));
                return memberRoom && memberRoom.roomName !== room.roomName;
            });
            
            if (separatedMembers.length > 0) {
                warnings.push(`Family/group separation: ${separatedMembers.length} group member(s) in different room(s)`);
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
            if (maxAgeDiff > 20) {
                warnings.push(`Large age gap: ${maxAgeDiff} year difference with roommate(s)`);
            }
            
            // Check for very young with adults
            if (guestAge < 16 && roommates.some(r => parseInt(r.age) >= 18)) {
                warnings.push('Minor assigned with adult(s)');
            }
            if (guestAge >= 18 && roommates.some(r => parseInt(r.age) < 16)) {
                warnings.push('Adult assigned with minor(s)');
            }
        }
        
        return warnings;
    }

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
                        if (warnings.some(w => w.includes('Gender mismatch') || w.includes('Minor assigned with adult'))) {
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

    updateCounts() {
        const unassignedCount = this.guests.filter(guest => !this.assignments.has(guest.id)).length;
        const assignedCount = this.assignments.size;
        
        document.getElementById('unassignedCount').textContent = `(${unassignedCount})`;
        document.getElementById('assignedCount').textContent = `(${assignedCount})`;
    }
    
    saveToHistory() {
        const state = {
            assignments: new Map(this.assignments),
            rooms: JSON.parse(JSON.stringify(this.rooms))
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
        a.download = `dorm_assignments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all assignments? This action cannot be undone.')) {
            this.guests = [];
            this.assignments.clear();
            this.assignmentHistory = [];
            this.initializeRooms();
            this.renderGuestsTable();
            this.renderRooms();
            this.updateCounts();
            this.updateUndoButton();
            this.saveToLocalStorage();
            
            document.getElementById('exportBtn').style.display = 'none';
            document.getElementById('clearBtn').style.display = 'none';
            document.getElementById('undoBtn').style.display = 'none';
            document.getElementById('csvFile').value = '';
            
            this.showStatus('All data cleared successfully', 'success');
        }
    }

    saveToLocalStorage() {
        const data = {
            guests: this.guests,
            assignments: Array.from(this.assignments.entries()),
            assignmentHistory: this.assignmentHistory.map(state => ({
                assignments: Array.from(state.assignments.entries()),
                rooms: state.rooms
            }))
        };
        localStorage.setItem('dormAssignments', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('dormAssignments');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.guests = data.guests || [];
                this.assignments = new Map(data.assignments || []);
                
                // Load assignment history
                this.assignmentHistory = (data.assignmentHistory || []).map(state => ({
                    assignments: new Map(state.assignments || []),
                    rooms: state.rooms
                }));
                
                this.assignments.forEach((bedId, guestId) => {
                    const bed = this.findBed(bedId);
                    if (bed) {
                        bed.assignedGuestId = guestId;
                    }
                });
                
                if (this.guests.length > 0) {
                    this.renderGuestsTable();
                    this.renderRooms();
                    this.updateCounts();
                    this.updateUndoButton();
                    document.getElementById('exportBtn').style.display = 'inline-block';
                    document.getElementById('clearBtn').style.display = 'inline-block';
                    document.getElementById('undoBtn').style.display = 'inline-block';
                }
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DormAssignmentTool();
});