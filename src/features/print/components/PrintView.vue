<template>
  <div class="print-view">
    <div class="print-header no-print">
      <h2>Room Assignment Report</h2>
    </div>

    <!-- Date Range Filter - at the top -->
    <div class="date-filter-section no-print">
      <div class="date-range-filter">
        <label class="date-label">
          Date range:
          <input type="date" class="date-input" v-model="filterDateStart" />
          <span>to</span>
          <input type="date" class="date-input" v-model="filterDateEnd" />
        </label>
        <button v-if="filterDateStart || filterDateEnd" class="btn-clear-dates" @click="filterDateStart = ''; filterDateEnd = ''">Clear</button>
      </div>
    </div>

    <!-- Sub-tabs -->
    <div class="print-sub-tabs no-print">
      <button :class="['sub-tab', { active: printMode === 'dorm' }]" @click="printMode = 'dorm'">
        <span class="sub-tab-label" data-label="List by Dorm">List by Dorm</span>
      </button>
      <button :class="['sub-tab', { active: printMode === 'alpha' }]" @click="printMode = 'alpha'">
        <span class="sub-tab-label" data-label="List by A-Z">List by A-Z</span>
      </button>
      <button :class="['sub-tab', { active: printMode === 'nametags' }]" @click="printMode = 'nametags'">
        <span class="sub-tab-label" data-label="Name Tags">Name Tags</span>
      </button>
      <button :class="['sub-tab', { active: printMode === 'guestmaster' }]" @click="printMode = 'guestmaster'">
        <span class="sub-tab-label" data-label="Guestmaster">Guestmaster</span>
      </button>
      <button :class="['sub-tab', { active: printMode === 'work-coordinator' }]" @click="printMode = 'work-coordinator'">
        <span class="sub-tab-label" data-label="Work Coordinator">Work Coordinator</span>
      </button>
      <button :class="['sub-tab', { active: printMode === 'checkin-slips' }]" @click="printMode = 'checkin-slips'">
        <span class="sub-tab-label" data-label="Check-in Slips">Check-in Slips</span>
      </button>
    </div>

    <!-- Print button -->
    <div class="action-buttons no-print">
      <button @click="handlePrint" class="print-button">🖨️ Print</button>
      <button v-if="printMode === 'nametags'" @click="exportNameTagsCSV" class="export-button">📥 Export CSV</button>
    </div>

    <!-- Dorm mode options -->
    <div v-if="printMode === 'dorm'" class="display-options no-print">
      <label class="checkbox-label">
        <input type="checkbox" v-model="showOnlyAssignedBeds" />
        <span>Only show beds with guests assigned</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="flatTableMode" />
        <span>Flat table (for cutting into strips)</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="showCampingCommuter" />
        <span>Include Camping & Commuter guests</span>
      </label>
    </div>

    <!-- A-Z mode options -->
    <div v-if="printMode === 'alpha'" class="display-options no-print">
      <div class="sort-toggle">
        Sort by:
        <button :class="{ active: alphabeticalSortBy === 'last' }" @click="alphabeticalSortBy = 'last'">Last Name</button>
        <button :class="{ active: alphabeticalSortBy === 'first' }" @click="alphabeticalSortBy = 'first'">First Name</button>
      </div>
    </div>

    <!-- Name Tags options -->
    <div v-if="printMode === 'nametags'" class="display-options no-print">
      <p class="name-tag-help">
        Staff status is auto-detected from retreat name containing "staff". Check/uncheck to override.
      </p>
    </div>

    <!-- Guestmaster options -->
    <div v-if="printMode === 'guestmaster'" class="display-options no-print">
      <p class="name-tag-help">
        Compact two-column layout for hand-checking arrivals. Empty rows
        are intentional — write in any guests not yet assigned.
      </p>
      <div class="checkbox-grid" style="margin-top: 8px">
        <label class="checkbox-label">
          <input type="checkbox" v-model="guestmasterColumns.beds" />
          <span>Beds</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="guestmasterColumns.lb" />
          <span>LB?</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="guestmasterColumns.age" />
          <span>Age</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="guestmasterColumns.gender" />
          <span>Gender</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="guestmasterColumns.group" />
          <span>Group</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="guestmasterShowEmpty" />
          <span>Include empty beds</span>
        </label>
        <button class="btn-reset-prefs" @click="resetGuestmasterPrefs" title="Restore default checkboxes">
          ↺ Reset
        </button>
      </div>
    </div>

    <!-- Work Coordinator options -->
    <div v-if="printMode === 'work-coordinator'" class="display-options no-print">
      <p class="name-tag-help">
        Sequential roster of every assigned guest, sorted by gender
        (Non-binary → Female → Male) then by age (ascending). One
        line per guest with their room.
      </p>
      <div class="checkbox-grid" style="margin-top: 8px">
        <label class="checkbox-label">
          <input type="checkbox" v-model="workCoordinatorColumns.gender" />
          <span>Gender</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="workCoordinatorColumns.age" />
          <span>Age</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="workCoordinatorColumns.group" />
          <span>Group</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="workCoordinatorColumns.notes" />
          <span>Notes</span>
        </label>
        <button class="btn-reset-prefs" @click="resetWorkCoordinatorPrefs" title="Restore default checkboxes">
          ↺ Reset
        </button>
      </div>
    </div>

    <!-- Check-in Slips options -->
    <div v-if="printMode === 'checkin-slips'" class="display-options no-print">
      <p class="name-tag-help">
        One slip per guest, sorted by last name. The column header is
        repeated above each row so you can slice the printed sheet
        into individual strips with a paper cutter.
      </p>
      <div class="checkbox-grid" style="margin-top: 8px">
        <label class="checkbox-label">
          <input type="checkbox" v-model="checkInSlipsColumns.housing" />
          <span>Housing</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="checkInSlipsColumns.lowerBunk" />
          <span>Lower bunk requested?</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="checkInSlipsColumns.arrival" />
          <span>Arrival</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="checkInSlipsColumns.departure" />
          <span>Departure</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="checkInSlipsColumns.internalNotes" />
          <span>Internal Notes</span>
        </label>
        <button class="btn-reset-prefs" @click="resetCheckInSlipsPrefs" title="Restore default checkboxes">
          ↺ Reset
        </button>
      </div>
    </div>

    <!-- Column Selection (dorm and alpha modes) -->
    <div v-if="printMode !== 'nametags' && printMode !== 'guestmaster' && printMode !== 'work-coordinator' && printMode !== 'checkin-slips'" class="column-selector no-print">
      <h3>Select Columns to Print</h3>
      <div class="checkbox-grid">
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.bedInfo" />
          <span>Bed Info</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.guestName" />
          <span>Guest Name</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.gender" />
          <span>Gender</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.age" />
          <span>Age</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.group" />
          <span>Group</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.lowerBunk" />
          <span>Lower Bunk</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.arrival" />
          <span>Arrival Date</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.departure" />
          <span>Departure Date</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.indivGrp" />
          <span>Indiv/Grp?</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.notes" />
          <span>Notes</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.retreat" />
          <span>Retreat</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.ratePerNight" />
          <span>Rate/Night</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.priceQuoted" />
          <span>Price Quoted</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.amountPaid" />
          <span>Amount Paid</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.firstVisit" />
          <span>First Visit</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="columns.roomPreference" />
          <span>Rm Preference</span>
        </label>
      </div>
    </div>

    <div class="print-content" :class="{
      'guestmaster-mode': printMode === 'guestmaster',
      'hide-header-on-print': ['guestmaster', 'work-coordinator', 'checkin-slips'].includes(printMode),
    }">
      <!-- Header for printed page (hidden on print in Guestmaster mode) -->
      <div class="report-header header-printable">
        <h1>Blue Cliff Monastery</h1>
        <h2>Room Assignment Report</h2>
        <p class="report-date">{{ currentDate }}</p>
      </div>

      <!-- Summary Statistics (hidden on print in Guestmaster mode) -->
      <div class="summary-section header-printable">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Guests:</span>
            <span class="summary-value">{{ filteredGuestCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Assigned:</span>
            <span class="summary-value">{{ filteredAssignedCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Unassigned:</span>
            <span class="summary-value">{{ filteredGuestCount - filteredAssignedCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Beds:</span>
            <span class="summary-value">{{ totalBeds }}</span>
          </div>
        </div>
      </div>

      <!-- === DORM MODE === -->
      <template v-if="printMode === 'dorm'">
      <!-- Flat Table Mode (for cutting into strips) -->
      <div v-if="flatTableMode" class="flat-table-section">
        <table class="flat-table">
          <thead>
            <tr>
              <th>Dorm</th>
              <th>Room</th>
              <th v-if="columns.bedInfo">Bed</th>
              <th v-if="columns.guestName">Guest Name</th>
              <th v-if="columns.gender">Gender</th>
              <th v-if="columns.age">Age</th>
              <th v-if="columns.group">Group</th>
              <th v-if="columns.lowerBunk">Lower Bunk?</th>
              <th v-if="columns.arrival">Arrival</th>
              <th v-if="columns.departure">Departure</th>
              <th v-if="columns.indivGrp">Indiv/Grp?</th>
              <th v-if="columns.notes">Notes</th>
              <th v-if="columns.retreat">Retreat</th>
              <th v-if="columns.ratePerNight">Rate/Night</th>
              <th v-if="columns.priceQuoted">Price Quoted</th>
              <th v-if="columns.amountPaid">Amount Paid</th>
              <th v-if="columns.firstVisit">First Visit</th>
              <th v-if="columns.roomPreference">Rm Preference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(bed, index) in flatBedList" :key="index">
              <td>{{ bed.dormName }}</td>
              <td>{{ bed.roomName }}</td>
              <td v-if="columns.bedInfo" class="bed-info">{{ bed.bedPosition }} {{ bed.bedType }}</td>
              <td v-if="columns.guestName" class="guest-name">{{ getGuestFullName(bed.guestId) }}</td>
              <td v-if="columns.gender">{{ getGuestField(bed.guestId, 'gender') }}</td>
              <td v-if="columns.age">{{ getGuestField(bed.guestId, 'age') }}</td>
              <td v-if="columns.group">{{ getGuestField(bed.guestId, 'groupName') }}</td>
              <td v-if="columns.lowerBunk">{{ getGuestField(bed.guestId, 'lowerBunk') }}</td>
              <td v-if="columns.arrival">{{ getGuestField(bed.guestId, 'arrival') }}</td>
              <td v-if="columns.departure">{{ getGuestField(bed.guestId, 'departure') }}</td>
              <td v-if="columns.indivGrp">{{ getGuestField(bed.guestId, 'indivGrp') }}</td>
              <td v-if="columns.notes">{{ getGuestField(bed.guestId, 'notes') }}</td>
              <td v-if="columns.retreat">{{ getGuestField(bed.guestId, 'retreat') }}</td>
              <td v-if="columns.ratePerNight">{{ getGuestField(bed.guestId, 'ratePerNight') }}</td>
              <td v-if="columns.priceQuoted">{{ getGuestField(bed.guestId, 'priceQuoted') }}</td>
              <td v-if="columns.amountPaid">{{ getGuestField(bed.guestId, 'amountPaid') }}</td>
              <td v-if="columns.firstVisit">{{ getGuestField(bed.guestId, 'firstVisit') }}</td>
              <td v-if="columns.roomPreference">{{ getGuestField(bed.guestId, 'roomPreference') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Room Assignments by Dormitory (grouped view) -->
      <template v-else>
        <div
          v-for="(dormitory, dormIndex) in dormitoryStore.dormitories.filter(d => !showOnlyAssignedBeds || dormHasAssignedGuests(d))"
          :key="dormIndex"
          class="dormitory-section"
        >
          <h3 class="dormitory-name">{{ dormitory.dormitoryName }}</h3>

          <div
            v-for="(room, roomIndex) in dormitory.rooms.filter(r => r.active && (!showOnlyAssignedBeds || roomHasAssignedGuests(r)))"
            :key="roomIndex"
            class="room-section"
          >
            <div class="room-header">
              <h4>{{ room.roomName }}</h4>
              <span class="room-gender">{{ room.roomGender }}</span>
            </div>

            <table class="room-table">
              <thead>
                <tr>
                  <th v-if="columns.bedInfo">Bed</th>
                  <th v-if="columns.guestName">Guest Name</th>
                  <th v-if="columns.gender">Gender</th>
                  <th v-if="columns.age">Age</th>
                  <th v-if="columns.group">Group</th>
                  <th v-if="columns.lowerBunk">Lower Bunk?</th>
                  <th v-if="columns.arrival">Arrival</th>
                  <th v-if="columns.departure">Departure</th>
                  <th v-if="columns.indivGrp">Indiv/Grp?</th>
                  <th v-if="columns.notes">Notes</th>
                  <th v-if="columns.retreat">Retreat</th>
                  <th v-if="columns.ratePerNight">Rate/Night</th>
                  <th v-if="columns.priceQuoted">Price Quoted</th>
                  <th v-if="columns.amountPaid">Amount Paid</th>
                  <th v-if="columns.firstVisit">First Visit</th>
                  <th v-if="columns.roomPreference">Rm Preference</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bed in room.beds.filter(b => b.active !== false && (!showOnlyAssignedBeds || getPrintGuestIdForBed(b)) && (!hasDateFilter || !getPrintGuestIdForBed(b) || isGuestInDateRange(getPrintGuestIdForBed(b))))" :key="bed.bedId">
                  <td v-if="columns.bedInfo" class="bed-info">
                    {{ bed.position }} {{ bed.bedType }}
                  </td>
                  <td v-if="columns.guestName" class="guest-name">{{ getGuestFullName(getPrintGuestIdForBed(bed)) }}</td>
                  <td v-if="columns.gender">{{ getGuestField(getPrintGuestIdForBed(bed), 'gender') }}</td>
                  <td v-if="columns.age">{{ getGuestField(getPrintGuestIdForBed(bed), 'age') }}</td>
                  <td v-if="columns.group">{{ getGuestField(getPrintGuestIdForBed(bed), 'groupName') }}</td>
                  <td v-if="columns.lowerBunk">{{ getGuestField(getPrintGuestIdForBed(bed), 'lowerBunk') }}</td>
                  <td v-if="columns.arrival">{{ getGuestField(getPrintGuestIdForBed(bed), 'arrival') }}</td>
                  <td v-if="columns.departure">{{ getGuestField(getPrintGuestIdForBed(bed), 'departure') }}</td>
                  <td v-if="columns.indivGrp">{{ getGuestField(getPrintGuestIdForBed(bed), 'indivGrp') }}</td>
                  <td v-if="columns.notes">{{ getGuestField(getPrintGuestIdForBed(bed), 'notes') }}</td>
                  <td v-if="columns.retreat">{{ getGuestField(getPrintGuestIdForBed(bed), 'retreat') }}</td>
                  <td v-if="columns.ratePerNight">{{ getGuestField(getPrintGuestIdForBed(bed), 'ratePerNight') }}</td>
                  <td v-if="columns.priceQuoted">{{ getGuestField(getPrintGuestIdForBed(bed), 'priceQuoted') }}</td>
                  <td v-if="columns.amountPaid">{{ getGuestField(getPrintGuestIdForBed(bed), 'amountPaid') }}</td>
                  <td v-if="columns.firstVisit">{{ getGuestField(getPrintGuestIdForBed(bed), 'firstVisit') }}</td>
                  <td v-if="columns.roomPreference">{{ getGuestField(getPrintGuestIdForBed(bed), 'roomPreference') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Unassigned Guests -->
      <div v-if="assignmentStore.unassignedCount > 0" class="unassigned-section">
        <h3>Unassigned Guests</h3>
        <table class="unassigned-table">
          <thead>
            <tr>
              <th v-if="columns.guestName">Name</th>
              <th v-if="columns.gender">Gender</th>
              <th v-if="columns.age">Age</th>
              <th v-if="columns.group">Group</th>
              <th v-if="columns.lowerBunk">Lower Bunk?</th>
              <th v-if="columns.arrival">Arrival</th>
              <th v-if="columns.departure">Departure</th>
              <th v-if="columns.indivGrp">Indiv/Grp?</th>
              <th v-if="columns.notes">Notes</th>
              <th v-if="columns.retreat">Retreat</th>
              <th v-if="columns.ratePerNight">Rate/Night</th>
              <th v-if="columns.priceQuoted">Price Quoted</th>
              <th v-if="columns.amountPaid">Amount Paid</th>
              <th v-if="columns.firstVisit">First Visit</th>
              <th v-if="columns.roomPreference">Rm Preference</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guestId in assignmentStore.unassignedGuestIds.filter(id => !hasDateFilter || isGuestInDateRange(id))" :key="guestId">
              <td v-if="columns.guestName" class="guest-name">{{ getGuestFullName(guestId) }}</td>
              <td v-if="columns.gender">{{ getGuestFieldById(guestId, 'gender') }}</td>
              <td v-if="columns.age">{{ getGuestFieldById(guestId, 'age') }}</td>
              <td v-if="columns.group">{{ getGuestFieldById(guestId, 'groupName') }}</td>
              <td v-if="columns.lowerBunk">{{ getGuestFieldById(guestId, 'lowerBunk') }}</td>
              <td v-if="columns.arrival">{{ getGuestFieldById(guestId, 'arrival') }}</td>
              <td v-if="columns.departure">{{ getGuestFieldById(guestId, 'departure') }}</td>
              <td v-if="columns.indivGrp">{{ getGuestFieldById(guestId, 'indivGrp') }}</td>
              <td v-if="columns.notes">{{ getGuestFieldById(guestId, 'notes') }}</td>
              <td v-if="columns.retreat">{{ getGuestFieldById(guestId, 'retreat') }}</td>
              <td v-if="columns.ratePerNight">{{ getGuestFieldById(guestId, 'ratePerNight') }}</td>
              <td v-if="columns.priceQuoted">{{ getGuestFieldById(guestId, 'priceQuoted') }}</td>
              <td v-if="columns.amountPaid">{{ getGuestFieldById(guestId, 'amountPaid') }}</td>
              <td v-if="columns.firstVisit">{{ getGuestFieldById(guestId, 'firstVisit') }}</td>
              <td v-if="columns.roomPreference">{{ getGuestFieldById(guestId, 'roomPreference') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Camping & Commuter Guests -->
      <div v-if="showCampingCommuter && campingCommuterGuests.length > 0" class="unassigned-section">
        <h3>Camping & Commuter Guests</h3>
        <table class="unassigned-table">
          <thead>
            <tr>
              <th>Housing</th>
              <th v-if="columns.guestName">Name</th>
              <th v-if="columns.gender">Gender</th>
              <th v-if="columns.age">Age</th>
              <th v-if="columns.group">Group</th>
              <th v-if="columns.arrival">Arrival</th>
              <th v-if="columns.departure">Departure</th>
              <th v-if="columns.notes">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guest in campingCommuterGuests" :key="guest.id">
              <td>{{ guest.housingType || '—' }}</td>
              <td v-if="columns.guestName" class="guest-name">{{ getGuestFullName(guest.id) }}</td>
              <td v-if="columns.gender">{{ guest.gender || '—' }}</td>
              <td v-if="columns.age">{{ guest.age || '—' }}</td>
              <td v-if="columns.group">{{ guest.groupName || '—' }}</td>
              <td v-if="columns.arrival">{{ formatGuestDate(guest.arrival) || '—' }}</td>
              <td v-if="columns.departure">{{ formatGuestDate(guest.departure) || '—' }}</td>
              <td v-if="columns.notes">{{ guest.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      </template>

      <!-- === ALPHA MODE === -->
      <template v-if="printMode === 'alpha'">
      <div class="alphabetical-section">
        <h3>Alphabetical Guest List (by {{ alphabeticalSortBy === 'first' ? 'First' : 'Last' }} Name)</h3>
        <table class="room-table">
          <thead>
            <tr>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Accommodation</th>
              <th v-if="columns.gender">Gender</th>
              <th v-if="columns.age">Age</th>
              <th v-if="columns.group">Group</th>
              <th v-if="columns.arrival">Arrival</th>
              <th v-if="columns.departure">Departure</th>
              <th v-if="columns.notes">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guest in alphabeticalGuests" :key="guest.id">
              <td>{{ guest.lastName }}</td>
              <td>{{ guest.firstName }}</td>
              <td>{{ getGuestAccommodation(guest.id) }}</td>
              <td v-if="columns.gender">{{ guest.gender || '' }}</td>
              <td v-if="columns.age">{{ guest.age || '' }}</td>
              <td v-if="columns.group">{{ guest.groupName || '' }}</td>
              <td v-if="columns.arrival">{{ formatGuestDate(guest.arrival) || '' }}</td>
              <td v-if="columns.departure">{{ formatGuestDate(guest.departure) || '' }}</td>
              <td v-if="columns.notes">{{ guest.notes || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      </template>

      <!-- === NAME TAGS MODE === -->
      <template v-if="printMode === 'guestmaster'">
        <div class="guestmaster-section">
          <!-- Print-only mini-header (visible only on paper) -->
          <div class="guestmaster-print-header">
            <span class="title">Guestmaster</span>
            <span class="timestamp">{{ guestmasterPrintTimestamp }}</span>
          </div>
          <div class="guestmaster-grid">
            <table v-for="(col, colIdx) in guestmasterColumnsSplit" :key="colIdx" class="guestmaster-table">
              <thead>
                <tr>
                  <th class="th-rm">Rm</th>
                  <th v-if="guestmasterColumns.beds" class="th-bed">Beds</th>
                  <th v-if="guestmasterColumns.lb" class="th-lb">LB?</th>
                  <th class="th-name">Guest Name</th>
                  <th v-if="guestmasterColumns.gender" class="th-narrow">G</th>
                  <th v-if="guestmasterColumns.age" class="th-narrow">Age</th>
                  <th v-if="guestmasterColumns.group" class="th-group">Group</th>
                  <th class="th-date">ARR</th>
                  <th class="th-date">DEP</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(group, gIdx) in col" :key="gIdx">
                  <tr
                    v-for="(row, rIdx) in group.rows"
                    :key="row.bedId"
                    :class="{ 'first-of-room': rIdx === 0, 'last-of-room': rIdx === group.rows.length - 1 }"
                  >
                    <td
                      class="td-rm"
                      :style="rIdx === 0 ? { background: group.dormColor } : undefined"
                    >{{ rIdx === 0 ? group.roomName : '' }}</td>
                    <td v-if="guestmasterColumns.beds" class="td-bed">{{ row.bedLabel }}</td>
                    <td v-if="guestmasterColumns.lb" class="td-lb">{{ row.lowerBunk ? '✓' : '' }}</td>
                    <td class="td-name">{{ row.guestName }}</td>
                    <td v-if="guestmasterColumns.gender" class="td-narrow">{{ row.gender }}</td>
                    <td v-if="guestmasterColumns.age" class="td-narrow">{{ row.age }}</td>
                    <td v-if="guestmasterColumns.group" class="td-group">{{ row.groupName }}</td>
                    <td class="td-date">{{ row.arrival }}</td>
                    <td class="td-date">{{ row.departure }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Camping & commuter guests live outside the bed grid since
               they aren't assigned to physical beds. Rendered as a flat
               table with no Rm/Beds/LB? columns at the very bottom of
               the Guestmaster sheet. -->
          <div v-if="campingCommuterGuests.length > 0" class="guestmaster-camping">
            <h4 class="guestmaster-camping-title">Camping & Commuter</h4>
            <table class="guestmaster-table guestmaster-camping-table">
              <thead>
                <tr>
                  <th class="th-housing">Housing</th>
                  <th class="th-name">Guest Name</th>
                  <th v-if="guestmasterColumns.gender" class="th-narrow">G</th>
                  <th v-if="guestmasterColumns.age" class="th-narrow">Age</th>
                  <th v-if="guestmasterColumns.group" class="th-group">Group</th>
                  <th class="th-date">ARR</th>
                  <th class="th-date">DEP</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in campingCommuterGuests" :key="g.id">
                  <td class="td-housing">{{ g.housingType || '' }}</td>
                  <td class="td-name">{{ `${g.firstName || ''} ${g.lastName || ''}`.trim() }}</td>
                  <td v-if="guestmasterColumns.gender" class="td-narrow">{{ g.gender || '' }}</td>
                  <td v-if="guestmasterColumns.age" class="td-narrow">{{ g.age != null ? String(g.age) : '' }}</td>
                  <td v-if="guestmasterColumns.group" class="td-group">{{ g.groupName || '' }}</td>
                  <td class="td-date">{{ formatGuestmasterDate(g.arrival) }}</td>
                  <td class="td-date">{{ formatGuestmasterDate(g.departure) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- === WORK COORDINATOR MODE === -->
      <template v-if="printMode === 'work-coordinator'">
        <div class="guestmaster-section work-coordinator-section">
          <div class="guestmaster-print-header">
            <span class="title">Work Coordinator</span>
            <span class="timestamp">{{ guestmasterPrintTimestamp }}</span>
          </div>
          <table class="guestmaster-table work-coordinator-table">
            <thead>
              <tr>
                <th class="th-num">#</th>
                <th class="th-housing">Housing</th>
                <th class="th-rm">Room</th>
                <th class="th-name">Guest Name</th>
                <th v-if="workCoordinatorColumns.gender" class="th-narrow">G</th>
                <th v-if="workCoordinatorColumns.age" class="th-narrow">Age</th>
                <th v-if="workCoordinatorColumns.group" class="th-group">Group</th>
                <th class="th-date">ARR</th>
                <th class="th-date">DEP</th>
                <th v-if="workCoordinatorColumns.notes" class="th-notes">Internal Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in workCoordinatorRows" :key="row.guest.id">
                <td class="td-num">{{ idx + 1 }}</td>
                <td
                  class="td-housing"
                  :style="row.dormColor ? { background: row.dormColorTint } : undefined"
                >{{ row.housing }}</td>
                <td class="td-rm">{{ row.roomName }}</td>
                <td class="td-name">{{ `${row.guest.firstName || ''} ${row.guest.lastName || ''}`.trim() }}</td>
                <td v-if="workCoordinatorColumns.gender" class="td-narrow">{{ row.guest.gender || '' }}</td>
                <td v-if="workCoordinatorColumns.age" class="td-narrow">{{ row.guest.age != null ? String(row.guest.age) : '' }}</td>
                <td v-if="workCoordinatorColumns.group" class="td-group">{{ row.guest.groupName || '' }}</td>
                <td class="td-date">{{ formatGuestmasterDate(row.guest.arrival) }}</td>
                <td class="td-date">{{ formatGuestmasterDate(row.guest.departure) }}</td>
                <td v-if="workCoordinatorColumns.notes" class="td-notes">{{ row.guest.internalNotes || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- === CHECK-IN SLIPS MODE === -->
      <template v-if="printMode === 'checkin-slips'">
        <div class="checkin-slips-section">
          <div
            v-for="row in checkInSlipsRows"
            :key="row.guest.id"
            class="checkin-slip"
          >
            <table class="checkin-slip-table">
              <thead>
                <tr>
                  <th v-if="checkInSlipsColumns.housing" class="slip-col-housing">Housing</th>
                  <th class="slip-col-first">First Name</th>
                  <th class="slip-col-last">Last Name</th>
                  <th v-if="checkInSlipsColumns.lowerBunk" class="slip-col-lb">Lower bunk requested?</th>
                  <th v-if="checkInSlipsColumns.arrival" class="slip-col-arr">Arrival</th>
                  <th v-if="checkInSlipsColumns.departure" class="slip-col-dep">Departure</th>
                  <th v-if="checkInSlipsColumns.internalNotes" class="slip-col-internal">Internal Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td v-if="checkInSlipsColumns.housing" class="slip-col-housing">{{ row.housingDisplay }}</td>
                  <td class="slip-col-first">{{ row.guest.firstName || '' }}</td>
                  <td class="slip-col-last">{{ row.guest.lastName || '' }}</td>
                  <td v-if="checkInSlipsColumns.lowerBunk" class="slip-col-lb">{{ row.guest.lowerBunk ? 'Yes' : '' }}</td>
                  <td v-if="checkInSlipsColumns.arrival" class="slip-col-arr">{{ formatGuestmasterDate(row.guest.arrival) || '' }}</td>
                  <td v-if="checkInSlipsColumns.departure" class="slip-col-dep">{{ formatGuestmasterDate(row.guest.departure) || '' }}</td>
                  <td v-if="checkInSlipsColumns.internalNotes" class="slip-col-internal">{{ row.guest.internalNotes || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <template v-if="printMode === 'nametags'">
      <div class="name-tag-print-section">
        <h3>Name Tags</h3>
        <table class="name-tag-table">
          <thead>
            <tr>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Accommodation</th>
              <th>Bed</th>
              <th>Staff</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="guest in nameTagGuests" :key="guest.id">
              <td>{{ guest.lastName }}</td>
              <td>{{ guest.firstName }}</td>
              <td>{{ getGuestAccommodation(guest.id) }}</td>
              <td>{{ getGuestBedType(guest.id) }}</td>
              <td>{{ isStaff(guest.id) ? 'Yes' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Dormitory } from '@/types'
import { useGuestStore, useDormitoryStore, useAssignmentStore } from '@/stores'
import { useUtils, parseLocalDate, formatGuestDate } from '@/shared/composables/useUtils'
import type { Room } from '@/types'

const STORAGE_KEY = 'dormAssignments-printPreferences'

const guestStore = useGuestStore()
const dormitoryStore = useDormitoryStore()
const assignmentStore = useAssignmentStore()
const { createDisplayName } = useUtils()

// Column visibility state
const columns = reactive({
  bedInfo: true,
  guestName: true,
  gender: true,
  age: true,
  group: true,
  lowerBunk: true,
  arrival: true,
  departure: true,
  indivGrp: false,
  notes: false,
  retreat: false,
  ratePerNight: false,
  priceQuoted: false,
  amountPaid: false,
  firstVisit: false,
  roomPreference: false,
})

// Display options
const showOnlyAssignedBeds = ref(false)
const flatTableMode = ref(false)
const showCampingCommuter = ref(false)
// Persist the active print sub-tab across reloads.
const PRINT_MODE_KEY = 'dormAssignments-printMode'
type PrintMode = 'dorm' | 'alpha' | 'nametags' | 'guestmaster' | 'work-coordinator' | 'checkin-slips'
const VALID_PRINT_MODES: PrintMode[] = ['dorm', 'alpha', 'nametags', 'guestmaster', 'work-coordinator', 'checkin-slips']

const _savedPrintMode = localStorage.getItem(PRINT_MODE_KEY) as PrintMode | null
const printMode = ref<PrintMode>(
  _savedPrintMode && VALID_PRINT_MODES.includes(_savedPrintMode) ? _savedPrintMode : 'dorm'
)
watch(printMode, value => {
  localStorage.setItem(PRINT_MODE_KEY, value)
})

/**
 * Hint the print engine to default to landscape orientation when the
 * Guestmaster compact view is active. `@page` can't live inside a scoped
 * style block, so we inject/remove a global <style> element keyed off
 * `printMode`. Browsers generally honor `@page { size: landscape }` by
 * pre-selecting landscape in the print dialog.
 */
const PRINT_ORIENTATION_STYLE_ID = 'print-page-orientation'

/**
 * Inject a global \`@page\` rule based on the active print sub-tab so the
 * print dialog opens with the right orientation pre-selected. Removed
 * on leaving the Print tab so the rule doesn't leak into other views.
 */
function applyPrintOrientation(mode: PrintMode) {
  const existing = document.getElementById(PRINT_ORIENTATION_STYLE_ID)
  let css: string | null = null
  if (mode === 'guestmaster') {
    css = '@page { size: landscape; margin: 0.4in; }'
  } else if (mode === 'work-coordinator' || mode === 'checkin-slips') {
    css = '@page { size: portrait; margin: 0.4in; }'
  }

  if (css) {
    if (existing) {
      existing.textContent = css
    } else {
      const style = document.createElement('style')
      style.id = PRINT_ORIENTATION_STYLE_ID
      style.textContent = css
      document.head.appendChild(style)
    }
  } else if (existing) {
    existing.remove()
  }
}

watch(printMode, applyPrintOrientation, { immediate: true })

onBeforeUnmount(() => {
  // Don't leak the global @page rule when the operator leaves the Print tab.
  const existing = document.getElementById(PRINT_ORIENTATION_STYLE_ID)
  if (existing) existing.remove()
})

const alphabeticalSortBy = ref<'first' | 'last'>('last')

// Guestmaster compact view options. Defaults match operator's preferred
// minimal layout: just the bed grid + empty rows. Persist user
// overrides in localStorage so the choice survives reloads.
const GUESTMASTER_PREFS_KEY = 'dormAssignments-guestmasterPrefs'
const GUESTMASTER_DEFAULTS = {
  beds: false,
  lb: true,
  age: false,
  gender: false,
  group: false,
  showEmpty: true,
}

function loadGuestmasterPrefs() {
  try {
    const saved = localStorage.getItem(GUESTMASTER_PREFS_KEY)
    if (!saved) return { ...GUESTMASTER_DEFAULTS }
    const parsed = JSON.parse(saved)
    return { ...GUESTMASTER_DEFAULTS, ...parsed }
  } catch {
    return { ...GUESTMASTER_DEFAULTS }
  }
}

const _initialPrefs = loadGuestmasterPrefs()
const guestmasterColumns = reactive({
  beds: _initialPrefs.beds,
  lb: _initialPrefs.lb,
  age: _initialPrefs.age,
  gender: _initialPrefs.gender,
  group: _initialPrefs.group,
})
const guestmasterShowEmpty = ref(_initialPrefs.showEmpty)

function saveGuestmasterPrefs() {
  try {
    localStorage.setItem(
      GUESTMASTER_PREFS_KEY,
      JSON.stringify({
        beds: guestmasterColumns.beds,
        lb: guestmasterColumns.lb,
        age: guestmasterColumns.age,
        gender: guestmasterColumns.gender,
        group: guestmasterColumns.group,
        showEmpty: guestmasterShowEmpty.value,
      })
    )
  } catch {
    /* localStorage unavailable — ignore */
  }
}

watch(
  () => [
    guestmasterColumns.beds,
    guestmasterColumns.lb,
    guestmasterColumns.age,
    guestmasterColumns.gender,
    guestmasterColumns.group,
    guestmasterShowEmpty.value,
  ],
  saveGuestmasterPrefs
)

function resetGuestmasterPrefs() {
  guestmasterColumns.beds = GUESTMASTER_DEFAULTS.beds
  guestmasterColumns.lb = GUESTMASTER_DEFAULTS.lb
  guestmasterColumns.age = GUESTMASTER_DEFAULTS.age
  guestmasterColumns.gender = GUESTMASTER_DEFAULTS.gender
  guestmasterColumns.group = GUESTMASTER_DEFAULTS.group
  guestmasterShowEmpty.value = GUESTMASTER_DEFAULTS.showEmpty
}

// ---------- Work Coordinator (sequential roster) ----------
const WORK_COORDINATOR_PREFS_KEY = 'dormAssignments-workCoordinatorPrefs'
const WORK_COORDINATOR_DEFAULTS = {
  gender: true,
  age: true,
  group: false,
  notes: false,
}

function loadWorkCoordinatorPrefs() {
  try {
    const saved = localStorage.getItem(WORK_COORDINATOR_PREFS_KEY)
    if (!saved) return { ...WORK_COORDINATOR_DEFAULTS }
    return { ...WORK_COORDINATOR_DEFAULTS, ...JSON.parse(saved) }
  } catch {
    return { ...WORK_COORDINATOR_DEFAULTS }
  }
}

const _initialWcPrefs = loadWorkCoordinatorPrefs()
const workCoordinatorColumns = reactive({
  gender: _initialWcPrefs.gender,
  age: _initialWcPrefs.age,
  group: _initialWcPrefs.group,
  notes: _initialWcPrefs.notes,
})

watch(
  () => [
    workCoordinatorColumns.gender,
    workCoordinatorColumns.age,
    workCoordinatorColumns.group,
    workCoordinatorColumns.notes,
  ],
  () => {
    try {
      localStorage.setItem(
        WORK_COORDINATOR_PREFS_KEY,
        JSON.stringify({
          gender: workCoordinatorColumns.gender,
          age: workCoordinatorColumns.age,
          group: workCoordinatorColumns.group,
          notes: workCoordinatorColumns.notes,
        })
      )
    } catch {
      /* localStorage unavailable */
    }
  }
)

function resetWorkCoordinatorPrefs() {
  workCoordinatorColumns.gender = WORK_COORDINATOR_DEFAULTS.gender
  workCoordinatorColumns.age = WORK_COORDINATOR_DEFAULTS.age
  workCoordinatorColumns.group = WORK_COORDINATOR_DEFAULTS.group
  workCoordinatorColumns.notes = WORK_COORDINATOR_DEFAULTS.notes
}

// ---------- Check-in Slips ----------
const CHECKIN_SLIPS_PREFS_KEY = 'dormAssignments-checkInSlipsPrefs'
const CHECKIN_SLIPS_DEFAULTS = {
  housing: true,
  lowerBunk: true,
  arrival: true,
  departure: true,
  internalNotes: true,
}

function loadCheckInSlipsPrefs() {
  try {
    const saved = localStorage.getItem(CHECKIN_SLIPS_PREFS_KEY)
    if (!saved) return { ...CHECKIN_SLIPS_DEFAULTS }
    return { ...CHECKIN_SLIPS_DEFAULTS, ...JSON.parse(saved) }
  } catch {
    return { ...CHECKIN_SLIPS_DEFAULTS }
  }
}

const _initialSlipsPrefs = loadCheckInSlipsPrefs()
const checkInSlipsColumns = reactive({
  housing: _initialSlipsPrefs.housing,
  lowerBunk: _initialSlipsPrefs.lowerBunk,
  arrival: _initialSlipsPrefs.arrival,
  departure: _initialSlipsPrefs.departure,
  internalNotes: _initialSlipsPrefs.internalNotes,
})

watch(
  () => [
    checkInSlipsColumns.housing,
    checkInSlipsColumns.lowerBunk,
    checkInSlipsColumns.arrival,
    checkInSlipsColumns.departure,
    checkInSlipsColumns.internalNotes,
  ],
  () => {
    try {
      localStorage.setItem(
        CHECKIN_SLIPS_PREFS_KEY,
        JSON.stringify({
          housing: checkInSlipsColumns.housing,
          lowerBunk: checkInSlipsColumns.lowerBunk,
          arrival: checkInSlipsColumns.arrival,
          departure: checkInSlipsColumns.departure,
          internalNotes: checkInSlipsColumns.internalNotes,
        })
      )
    } catch {
      /* localStorage unavailable */
    }
  }
)

function resetCheckInSlipsPrefs() {
  checkInSlipsColumns.housing = CHECKIN_SLIPS_DEFAULTS.housing
  checkInSlipsColumns.lowerBunk = CHECKIN_SLIPS_DEFAULTS.lowerBunk
  checkInSlipsColumns.arrival = CHECKIN_SLIPS_DEFAULTS.arrival
  checkInSlipsColumns.departure = CHECKIN_SLIPS_DEFAULTS.departure
  checkInSlipsColumns.internalNotes = CHECKIN_SLIPS_DEFAULTS.internalNotes
}

interface CheckInSlipRow {
  guest: Guest
  /**
   * What to show in the Housing column. For dorm-assigned guests, the
   * room name (e.g. 'Crystal Sunshine 1') — much more useful than the
   * generic 'Dorm' label. For camping / commuter / unassigned guests,
   * the housing type as-is.
   */
  housingDisplay: string
}

/**
 * Every guest gets a slip — assigned, unassigned, camping, commuter,
 * cancelled. Sorted by last name (case-insensitive). Date filter
 * applies as for other modes.
 */
const checkInSlipsRows = computed<CheckInSlipRow[]>(() => {
  const rows: CheckInSlipRow[] = []
  for (const guest of guestStore.guests) {
    if (hasDateFilter.value && !isGuestInDateRange(guest.id)) continue

    let housingDisplay = guest.housingType || ''
    // Dorm guests get their room name instead of the generic label.
    const housingLower = housingDisplay.toLowerCase()
    const isCampingOrCommuter = housingLower === 'camping' || housingLower === 'commuter'
    if (!isCampingOrCommuter) {
      const bedId = assignmentStore.assignments.get(guest.id)
      if (bedId) {
        const room = dormitoryStore.getRoomByBedId(bedId)
        if (room?.roomName) housingDisplay = room.roomName
      }
    }

    rows.push({ guest, housingDisplay })
  }
  rows.sort((a, b) => {
    const al = (a.guest.lastName || '').toLowerCase()
    const bl = (b.guest.lastName || '').toLowerCase()
    if (al < bl) return -1
    if (al > bl) return 1
    return (a.guest.firstName || '').localeCompare(b.guest.firstName || '')
  })
  return rows
})

interface WorkCoordinatorRow {
  guest: Guest
  roomName: string
  housing: string
  dormColor?: string
  dormColorTint?: string
}

/**
 * Sort key for gender: Non-binary first, then Female, then Male, then
 * unknown / blank. Matches the operator's preferred reading order for
 * dorm assignments.
 */
function genderSortRank(g: string | undefined | null): number {
  const lower = (g || '').toLowerCase().trim()
  if (!lower) return 4
  if (lower === 'non-binary' || lower === 'nb' || lower.startsWith('non')) return 0
  if (lower === 'f' || lower === 'female') return 1
  if (lower === 'm' || lower === 'male') return 2
  return 3
}

const workCoordinatorRows = computed<WorkCoordinatorRow[]>(() => {
  const rows: WorkCoordinatorRow[] = []

  // Assigned guests (one row per occupied bed)
  for (const dorm of dormitoryStore.dormitories) {
    if (!dorm.active) continue
    const dormColor = dorm.color || '#9ca3af'
    const dormColorTint = `color-mix(in srgb, ${dormColor} 22%, white)`
    for (const room of dorm.rooms) {
      if (!room.active) continue
      for (const bed of room.beds) {
        if (bed.active === false) continue
        const guestId = getPrintGuestIdForBed(bed)
        if (!guestId) continue
        if (hasDateFilter.value && !isGuestInDateRange(guestId)) continue
        const guest = guestStore.getGuestById(guestId)
        if (!guest) continue
        rows.push({
          guest,
          roomName: room.roomName,
          housing: guest.housingType || 'Dorm',
          dormColor,
          dormColorTint,
        })
      }
    }
  }

  // Camping & commuter guests (no bed, no dorm color)
  for (const guest of campingCommuterGuests.value) {
    rows.push({
      guest,
      roomName: '',
      housing: guest.housingType || '—',
    })
  }

  // Sort: gender first, then age (ascending). NaN ages sort to the end.
  rows.sort((a, b) => {
    const ga = genderSortRank(a.guest.gender)
    const gb = genderSortRank(b.guest.gender)
    if (ga !== gb) return ga - gb
    const aa = parseInt(String(a.guest.age ?? ''), 10)
    const ab = parseInt(String(b.guest.age ?? ''), 10)
    const aaNum = isNaN(aa) ? Infinity : aa
    const abNum = isNaN(ab) ? Infinity : ab
    return aaNum - abNum
  })

  return rows
})

interface GuestmasterRow {
  bedId: string
  bedLabel: string
  lowerBunk: boolean
  guestName: string
  gender: string
  age: string
  groupName: string
  arrival: string
  departure: string
  notes: string
}

interface GuestmasterRoomGroup {
  dormName: string
  dormColor: string
  roomName: string
  rows: GuestmasterRow[]
}

const guestmasterColumnCount = computed(() => {
  // Rm, Name, Arrive, Depart = 4 base
  let n = 4
  if (guestmasterColumns.beds) n++
  if (guestmasterColumns.lb) n++
  if (guestmasterColumns.gender) n++
  if (guestmasterColumns.age) n++
  if (guestmasterColumns.group) n++
  return n
})

/** Format a date as "Mon DD" (no year) for the compact guestmaster view. */
function formatGuestmasterDate(value: string | null | undefined): string {
  if (!value) return ''
  const formatted = formatGuestDate(value)
  // formatGuestDate returns "Month DD, YYYY" — strip "Month name" → "Mon" and drop year.
  const m = formatted.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*\d{4}$/)
  if (m) {
    const monthShort = m[1].slice(0, 3)
    return `${monthShort} ${m[2]}`
  }
  return formatted
}

/**
 * Live-updating timestamp for the print header. Resampled when the
 * operator opens the print dialog (the browser captures it at that
 * moment via window.onbeforeprint). For simplicity we just compute it
 * fresh on every render of the Guestmaster view — by the time the
 * print dialog opens, the value reflects the moment of preview.
 */
const guestmasterPrintTimestamp = computed(() => {
  const now = new Date()
  return now.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

function bedTypeSuffix(bedType: string): string {
  if (bedType === 'lower') return 'L'
  if (bedType === 'upper') return 'U'
  if (bedType === 'single') return ''
  return ''
}

const guestmasterRoomGroups = computed((): GuestmasterRoomGroup[] => {
  const groups: GuestmasterRoomGroup[] = []
  for (const dorm of dormitoryStore.dormitories) {
    if (!dorm.active) continue
    const dormColor = (dorm.color || '#f3f4f6') + '80' // 50% alpha for softer fill
    for (const room of dorm.rooms) {
      if (!room.active) continue
      const rows: GuestmasterRow[] = []
      for (const bed of room.beds) {
        if (bed.active === false) continue
        const guestId = getPrintGuestIdForBed(bed)
        const guest = guestId ? guestStore.getGuestById(guestId) : null
        if (!guestmasterShowEmpty.value && !guest) continue
        if (hasDateFilter.value && guestId && !isGuestInDateRange(guestId)) continue
        const suffix = bedTypeSuffix(bed.bedType)
        const bedLabel = `${bed.position}${suffix ? suffix : ''}`
        rows.push({
          bedId: bed.bedId,
          bedLabel: bed.bedType === 'single' ? `${bed.position}/Single` : bedLabel,
          lowerBunk: !!guest?.lowerBunk,
          guestName: guest ? `${guest.firstName || ''} ${guest.lastName || ''}`.trim() : '',
          gender: guest?.gender || '',
          age: guest?.age != null ? String(guest.age) : '',
          groupName: guest?.groupName || '',
          arrival: guest ? formatGuestmasterDate(guest.arrival) : '',
          departure: guest ? formatGuestmasterDate(guest.departure) : '',
          notes: guest?.notes || '',
        })
      }
      if (rows.length === 0) continue
      groups.push({
        dormName: dorm.dormitoryName,
        dormColor,
        roomName: room.roomName,
        rows,
      })
    }
  }
  return groups
})

/**
 * Split the room groups into two roughly equal columns by total row count.
 * Greedy split keeps room blocks intact.
 */
const guestmasterColumnsSplit = computed((): GuestmasterRoomGroup[][] => {
  const groups = guestmasterRoomGroups.value
  if (groups.length === 0) return [[], []]
  const totalRows = groups.reduce((sum, g) => sum + g.rows.length, 0)
  const target = totalRows / 2
  const left: GuestmasterRoomGroup[] = []
  const right: GuestmasterRoomGroup[] = []
  let leftCount = 0
  for (const g of groups) {
    if (leftCount < target) {
      left.push(g)
      leftCount += g.rows.length
    } else {
      right.push(g)
    }
  }
  return [left, right]
})

const alphabeticalGuests = computed(() => {
  let guests = [...guestStore.guests]
  if (hasDateFilter.value) {
    guests = guests.filter(g => isGuestInDateRange(g.id))
  }
  return guests.sort((a, b) => {
    if (alphabeticalSortBy.value === 'first') {
      return a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName)
    }
    return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  })
})

// Date range filter
const filterDateStart = ref('')
const filterDateEnd = ref('')

function isGuestInDateRange(guestId: string | null): boolean {
  if (!guestId) return false
  if (!filterDateStart.value && !filterDateEnd.value) return true
  const guest = guestStore.getGuestById(guestId)
  if (!guest) return false
  if (!guest.arrival || !guest.departure) return true // Show if no dates
  const arrival = parseLocalDate(guest.arrival).getTime()
  const departure = parseLocalDate(guest.departure).getTime()
  const rangeStart = filterDateStart.value ? parseLocalDate(filterDateStart.value).getTime() : -Infinity
  const rangeEnd = filterDateEnd.value ? parseLocalDate(filterDateEnd.value).getTime() : Infinity
  // Guest overlaps range if arrival < rangeEnd and departure > rangeStart
  return arrival <= rangeEnd && departure > rangeStart
}

const hasDateFilter = computed(() => !!(filterDateStart.value || filterDateEnd.value))

/**
 * For multi-assignment beds, picks the guest to print on this row. If a
 * date filter is active, prefers an assignment whose stay overlaps the
 * filter range. Otherwise returns the first assignment, or null.
 */
function getPrintGuestIdForBed(bed: { assignments: Array<{ guestId: string }> } | undefined): string | null {
  if (!bed || !bed.assignments || bed.assignments.length === 0) return null
  if (hasDateFilter.value) {
    for (const a of bed.assignments) {
      if (isGuestInDateRange(a.guestId)) return a.guestId
    }
  }
  return bed.assignments[0].guestId
}

// Non-assignable (camping/commuter) guests
const campingCommuterGuests = computed(() => {
  let guests = guestStore.guests.filter(g => !guestStore.isGuestAssignable(g))
  if (hasDateFilter.value) {
    guests = guests.filter(g => isGuestInDateRange(g.id))
  }
  return guests
})

// Load preferences from localStorage
function loadPreferences() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const prefs = JSON.parse(saved)
      if (prefs.columns) {
        Object.assign(columns, prefs.columns)
      }
      if (prefs.showOnlyAssignedBeds !== undefined) {
        showOnlyAssignedBeds.value = prefs.showOnlyAssignedBeds
      }
      if (prefs.flatTableMode !== undefined) {
        flatTableMode.value = prefs.flatTableMode
      }
      if (prefs.showCampingCommuter !== undefined) {
        showCampingCommuter.value = prefs.showCampingCommuter
      }
    }
  } catch (e) {
    console.warn('Failed to load print preferences:', e)
  }
}

// Save preferences to localStorage
function savePreferences() {
  try {
    const prefs = {
      columns: { ...columns },
      showOnlyAssignedBeds: showOnlyAssignedBeds.value,
      flatTableMode: flatTableMode.value,
      showCampingCommuter: showCampingCommuter.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.warn('Failed to save print preferences:', e)
  }
}

// Load on mount
onMounted(() => {
  loadPreferences()
})

// Watch for changes and save
watch([() => ({ ...columns }), showOnlyAssignedBeds, flatTableMode], savePreferences, { deep: true })

// Flat list of all beds with dorm/room info for strip mode
const flatBedList = computed(() => {
  const beds: Array<{
    dormName: string
    roomName: string
    roomGender: string
    bedPosition: string
    bedType: string
    guestId: string | null
  }> = []

  for (const dorm of dormitoryStore.dormitories) {
    for (const room of dorm.rooms) {
      if (!room.active) continue
      if (showOnlyAssignedBeds.value && !roomHasAssignedGuests(room)) continue

      for (const bed of room.beds) {
        if (bed.active === false) continue
        const guestId = getPrintGuestIdForBed(bed)
        if (showOnlyAssignedBeds.value && !guestId) continue

        beds.push({
          dormName: dorm.dormitoryName,
          roomName: room.roomName,
          roomGender: room.roomGender,
          bedPosition: String(bed.position),
          bedType: bed.bedType,
          guestId: guestId,
        })
      }
    }
  }

  return beds
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const totalBeds = computed(() => {
  return dormitoryStore.getAllBeds.length
})

// Filtered summary stats based on date range
const filteredGuestCount = computed(() => {
  if (!hasDateFilter.value) return guestStore.guests.length
  return guestStore.guests.filter(g => isGuestInDateRange(g.id)).length
})

const filteredAssignedCount = computed(() => {
  if (!hasDateFilter.value) return assignmentStore.assignedCount
  let count = 0
  assignmentStore.assignments.forEach((_, guestId) => {
    if (isGuestInDateRange(guestId)) count++
  })
  return count
})

function getOccupiedCount(room: Room): number {
  return room.beds.filter(bed => bed.assignments.length > 0).length
}

function roomHasAssignedGuests(room: Room): boolean {
  return room.beds.some(bed => bed.assignments.length > 0)
}

function dormHasAssignedGuests(dormitory: { rooms: Room[] }): boolean {
  return dormitory.rooms.some(room => room.active && roomHasAssignedGuests(room))
}

function getGuestName(guestId: string | null): string {
  if (!guestId) return '—'
  const guest = guestStore.getGuestById(guestId)
  return guest ? createDisplayName(guest) : '—'
}

function getGuestFullName(guestId: string | null): string {
  if (!guestId) return '—'
  const guest = guestStore.getGuestById(guestId)
  if (!guest) return '—'
  const firstName = guest.preferredName || guest.firstName || ''
  const lastName = guest.lastName || ''
  return `${firstName} ${lastName}`.trim() || '—'
}

function getGuestNameById(guestId: string): string {
  const guest = guestStore.getGuestById(guestId)
  return guest ? createDisplayName(guest) : '—'
}

function getGuestField(guestId: string | null, field: string): string {
  if (!guestId) return '—'
  const guest = guestStore.getGuestById(guestId)
  if (!guest) return '—'

  const value = guest[field as keyof typeof guest]
  if (value === null || value === undefined || value === '') return '—'

  // Format boolean lowerBunk values
  if (field === 'lowerBunk') {
    if (value === true || value === 'Yes' || value === 'TRUE' || value === 'true') return 'Yes'
    if (value === false || value === 'No' || value === 'FALSE' || value === 'false') return 'No'
  }

  // Normalize date fields to the canonical display format
  if (field === 'arrival' || field === 'departure') {
    return formatGuestDate(String(value)) || '—'
  }

  return String(value)
}

function getGuestFieldById(guestId: string, field: string): string {
  return getGuestField(guestId, field)
}

// Name tag export
const showNameTagExport = ref(false)
const staffOverrides = ref<Map<string, boolean>>(new Map())

const nameTagGuests = computed(() => {
  let guests = [...guestStore.guests]
  if (hasDateFilter.value) {
    guests = guests.filter(g => isGuestInDateRange(g.id))
  }
  return guests.sort((a, b) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  )
})

function isStaffFromRetreat(guest: { retreat?: string }): boolean {
  if (!guest.retreat) return false
  return guest.retreat.toLowerCase().includes('staff')
}

function isStaff(guestId: string): boolean {
  if (staffOverrides.value.has(guestId)) {
    return staffOverrides.value.get(guestId)!
  }
  const guest = guestStore.getGuestById(guestId)
  return guest ? isStaffFromRetreat(guest) : false
}

function toggleStaff(guestId: string) {
  const current = isStaff(guestId)
  staffOverrides.value.set(guestId, !current)
}

function getGuestAccommodation(guestId: string): string {
  const bedId = assignmentStore.getAssignmentByGuest(guestId)
  if (bedId) {
    const room = dormitoryStore.getRoomByBedId(bedId)
    return room ? room.roomName : ''
  }
  // No room assigned — show housing type (Camping, Commuter, etc.)
  const guest = guestStore.getGuestById(guestId)
  return guest?.housingType || ''
}

function getGuestBedType(guestId: string): string {
  const bedId = assignmentStore.getAssignmentByGuest(guestId)
  if (!bedId) return ''
  const bed = dormitoryStore.getBedById(bedId)
  if (!bed) return ''
  return bed.bedType === 'upper' ? 'upper' : 'lower'
}

function getGuestBed(guestId: string): string {
  const bedId = assignmentStore.getAssignmentByGuest(guestId)
  if (!bedId) return '—'
  const bed = dormitoryStore.getBedById(bedId)
  if (!bed) return '—'
  return `${bed.position} ${bed.bedType}`
}

function exportNameTagsCSV() {
  const rows = [['Last Name', 'First Name', 'Accommodation', 'Bed', 'Staff']]

  nameTagGuests.value.forEach(guest => {
    rows.push([
      guest.lastName || '',
      guest.firstName || '',
      getGuestAccommodation(guest.id),
      getGuestBedType(guest.id),
      isStaff(guest.id) ? 'Yes' : '',
    ])
  })

  const csvContent = rows.map(row =>
    row.map(cell => {
      const escaped = String(cell).replace(/"/g, '""')
      return `"${escaped}"`
    }).join(',')
  ).join('\n')

  // UTF-8 BOM so Excel correctly reads diacritics
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'name_tags.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function handlePrint() {
  window.print()
}
</script>

<style scoped lang="scss">
.print-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.print-header {
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #1f2937;
  }
}

.date-filter-section {
  background: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.print-button, .export-button {
  padding: 12px 24px;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.print-button {
  background-color: #3b82f6;
  &:hover { background-color: #2563eb; }
}

.export-button {
  background-color: #8b5cf6;
  &:hover { background-color: #7c3aed; }
}

.name-tag-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.name-tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.name-tag-help {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.btn-export-csv {
  padding: 8px 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;

  &:hover { background: #059669; }
}

.name-tag-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  th {
    text-align: left;
    padding: 6px 10px;
    background: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
    font-weight: 600;
    color: #374151;
  }

  td {
    padding: 5px 10px;
    border-bottom: 1px solid #f3f4f6;
  }

  tr:hover td {
    background: #f9fafb;
  }

  input[type="checkbox"] {
    cursor: pointer;
  }
}

.display-options {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 12px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.column-selector {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 16px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
  }
}

.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.btn-reset-prefs {
  margin-left: auto;
  padding: 4px 10px;
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: #f3f4f6;
    color: #1f2937;
    border-color: #9ca3af;
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  span {
    user-select: none;
  }

  &:hover {
    color: #1f2937;
  }
}

.print-sub-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  position: relative;
}

.sub-tab {
  padding: 10px 24px;
  border: 3px solid transparent;
  border-bottom: none;
  background: transparent;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.15s;
  position: relative;

  &.active {
    background: white;
    color: #1f2937;
    font-weight: 600;
    border: 3px solid #9ca3af;
    border-bottom: none;
    z-index: 2;

    &::before {
      content: '';
      position: absolute;
      bottom: 0;
      right: 100%;
      width: 100vw;
      height: 3px;
      background: #9ca3af;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 100%;
      width: 100vw;
      height: 3px;
      background: #9ca3af;
    }
  }

  &:hover:not(.active) {
    background: #f3f4f6;
    color: #374151;
  }
}

.sub-tab-label {
  display: inline-flex;
  flex-direction: column;
  align-items: center;

  &::after {
    content: attr(data-label);
    display: block;
    font-weight: 600;
    height: 0;
    overflow: hidden;
    visibility: hidden;
  }
}

.name-tag-print-section {
  h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #1f2937;
    padding-bottom: 8px;
    border-bottom: 2px solid #8b5cf6;
  }
}

/* ----- Guestmaster compact view ----- */
.guestmaster-section {
  width: 100%;
}

/* Always-visible mini-header above the table — visible on screen AND
   on paper, so the natural document flow keeps the title with the
   table on the same page. (Earlier we toggled this via `display: none`
   on screen / `display: flex` on print, but page-break logic shoved
   the header onto its own page.) */
.guestmaster-print-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 0 2px;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;

  .title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1f2937;
  }

  .timestamp {
    font-size: 0.65rem;
    color: #4b5563;
  }
}

.guestmaster-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: flex-start;
}

.guestmaster-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  table-layout: fixed;
  /* Force browsers to print background colors (the dorm-color tags on
     room-name cells). Without this, Chrome/Safari strip backgrounds. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;

  th, td {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  th, td {
    border: 1px solid #1f2937;
    padding: 0 4px;
    text-align: left;
    vertical-align: middle;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1;
    /* Uniform row height across the entire table */
    height: 18px;
  }

  thead th {
    background: #f3f4f6;
    font-weight: 700;
    font-size: 0.6rem;
    text-transform: uppercase;
    color: #1f2937;
    height: 22px;
  }

  .th-rm, .td-rm       { width: 16%; font-weight: 600; }
  .th-bed, .td-bed     { width: 9%; text-align: center; }
  .th-lb, .td-lb       { width: 5%; text-align: center; }
  .th-name, .td-name   { width: 28%; }
  .th-narrow, .td-narrow { width: 5%; text-align: center; }
  .th-group, .td-group { width: 12%; }
  .th-date, .td-date   {
    width: 9%;
    text-align: center;
    font-size: 0.6rem;
    padding: 0 2px;
    /* Never truncate the date — operator needs to read it on paper. */
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
  }

  /* Camping/commuter housing column */
  .th-housing, .td-housing { width: 14%; font-weight: 600; }

  /* Thicker bottom border marks the end of each room block */
  tr.last-of-room td {
    border-bottom: 2px solid #1f2937;
  }
}

.guestmaster-camping {
  margin-top: 16px;

  .guestmaster-camping-title {
    margin: 0 0 4px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #4b5563;
  }
}

.guestmaster-camping-table {
  /* No room/bed grid — flat table that spans the full width below the
     two-column bed grid. */
  width: 100%;
}

/* Work Coordinator: a single full-width sequential roster. */
.work-coordinator-section {
  width: 100%;
}

/* Check-in Slips: each guest gets a tall, full-width slip with a
   header row repeated above its values. The operator runs a paper
   cutter horizontally between slips. */
.checkin-slips-section {
  width: 100%;
}

.checkin-slip {
  /* Full-page width for cutting; tall enough to write notes by hand
     during check-in. Each slip stays as one piece across page breaks.
     No vertical margin between slips on screen OR on paper — so the
     stack reads as one continuous sheet ready for the cutter. */
  margin-bottom: 0;
  page-break-inside: avoid;
  break-inside: avoid;
}

.checkin-slip-table {
  width: 100%;
  border-collapse: collapse;
  /* Fixed layout so every slip's column widths match — without this,
     each slip auto-sizes its columns to its own content (Camping vs
     Dorm makes Housing wider on some slips). Operator wants
     consistent widths so the slips stack visually. */
  table-layout: fixed;

  /* First/Last get the lion's share since the operator writes
     signatures or notes in those columns. LB?, Arrival, Departure
     squeezed narrow. Internal Notes takes the right edge. */
  .slip-col-housing  { width: 14%; }
  .slip-col-first    { width: 19%; }
  .slip-col-last     { width: 19%; }
  .slip-col-lb       { width: 9%; }
  .slip-col-arr      { width: 9%; }
  .slip-col-dep      { width: 9%; }
  .slip-col-internal { width: 21%; }

  /* Header labels are smaller than the data and may wrap mid-word so
     they fit a narrow column without overflowing into the next cell.
     Without \`word-break: break-all\`, 'INTERNAL NOTES' would push past
     its column boundary instead of breaking. */
  thead th {
    font-size: 0.6rem !important;
    line-height: 1.1;
    white-space: normal !important;
    word-break: break-all;
    overflow-wrap: anywhere;
  }

  th, td {
    border: 1px solid #1f2937;
    padding: 6px 10px;
    text-align: left;
    vertical-align: middle;
    font-size: 0.85rem;
  }

  thead th {
    background: #f3f4f6;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 10px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  tbody td {
    /* The data row is the writable area. ~1.5in tall so there's space
       for hand-written check-in notes on each slip. */
    height: 1.5in;
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  /* Highlight the Last Name column so it pops on the printed slip
     (operator scans by surname). Header label and data cell both
     get the wash. */
  .slip-col-last {
    background: #FFBD00;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* Work Coordinator: bigger font and pure black so the printed roster
   is easy to read at arm's length on the table. ~130% of the
   inherited 0.65rem Guestmaster body size. */
.work-coordinator-section {
  font-size: 0.85rem;
  color: #000;
}

.work-coordinator-table {
  width: 100%;
  color: #000;

  th, td {
    color: #000;
    font-size: 0.85rem;
  }

  thead th {
    color: #000;
    font-size: 0.78rem;
  }
  /* Override the parent's \`table-layout: fixed\`. The Guestmaster grid
     has a known set of beds and a tight fixed layout works there, but
     Work Coordinator has many optional columns that exceed 100% when
     all are toggled on — fixed layout would push the rightmost column
     (Internal Notes) off the page. Auto layout sizes each column by
     its content and never overflows. */
  table-layout: auto;

  /* Allow long values (group name, internal notes) to wrap so nothing
     ever gets clipped or pushed off the right edge. */
  th, td {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
    word-break: break-word;
  }

  .th-num, .td-num {
    width: auto;
    text-align: center;
    color: #6b7280;
    font-variant-numeric: tabular-nums;
    white-space: nowrap !important;
  }

  .td-narrow,
  .td-date {
    white-space: nowrap !important;
  }

  /* Internal notes column is the largest text consumer — let it eat
     leftover horizontal space. */
  .th-notes, .td-notes {
    width: auto;
    min-width: 100px;
  }
}

@media print {
  .guestmaster-grid {
    gap: 12px;
  }
  .guestmaster-table {
    font-size: 0.55rem;
    th, td { padding: 1px 3px; }
    thead th { font-size: 0.5rem; padding: 2px 3px; }

    /* Date columns get a tiny bit more breathing room on paper so
       'May 15' doesn't get clipped to 'May…'. Override clamps. */
    .th-date, .td-date {
      width: 10%;
      font-size: 0.55rem;
      letter-spacing: -0.01em;
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
    }
  }
  /* In Guestmaster / Work Coordinator / Check-in Slips modes, hide the
     report header + summary so only the table/slips print. The headers
     stay visible on screen — operators still see them when reviewing
     before printing. */
  .print-content.hide-header-on-print .header-printable {
    display: none !important;
  }

  /* Check-in Slips on paper: shrink each writable row to ~0.75in
     (50% of the on-screen 1.5in) and remove inter-slip margin so
     the slips stack flush. Keeps page-break-inside avoided so
     individual slips never split. */
  .checkin-slip {
    margin-bottom: 0 !important;
  }
  .checkin-slip-table tbody td {
    height: 0.75in !important;
  }

  /* Work Coordinator print override: Guestmaster's print rule above
     drops every \`.guestmaster-table\` to 0.55rem. The Work Coordinator
     reuses that class but the operator wants pure black + ~130% of
     the original size for arm's-length reading. */
  .work-coordinator-table {
    color: #000 !important;
    font-size: 0.85rem !important;

    th, td {
      color: #000 !important;
      font-size: 0.85rem !important;
      padding: 3px 6px !important;
    }

    thead th {
      color: #000 !important;
      font-size: 0.78rem !important;
      padding: 4px 6px !important;
    }
  }
}

.sort-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  margin-left: 24px;
  font-size: 0.85rem;
  color: #374151;

  button {
    padding: 4px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    font-size: 0.8rem;
    cursor: pointer;

    &.active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    &:hover:not(.active) {
      background: #f3f4f6;
    }
  }
}

.alphabetical-section {
  margin-top: 32px;
  page-break-before: always;

  h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #1f2937;
    padding-bottom: 8px;
    border-bottom: 2px solid #3b82f6;
  }
}

.date-range-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #374151;
}

.date-input {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.8rem;
}

.btn-clear-dates {
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 0.75rem;
  cursor: pointer;
  color: #6b7280;

  &:hover { background: #f3f4f6; }
}

.print-content {
  background: white;
}

/* Compressed on-screen header — used to be ~200px tall with huge h1
   + h2 + Summary card. Operator wants this collapsed to roughly 20%
   so the actual room table is visible without scrolling. */
.report-header {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 4px 8px;
  text-align: left;

  h1 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #1f2937;
  }

  h2 {
    margin: 0;
    font-size: 0.85rem;
    color: #4b5563;
    font-weight: 500;
  }

  .report-date {
    margin: 0;
    color: #6b7280;
    font-size: 0.75rem;
  }
}

.summary-section {
  margin-bottom: 10px;
  padding: 4px 10px;
  background: #f9fafb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
    color: #1f2937;
    flex-shrink: 0;
  }
}

.summary-grid {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex: 1;
}

.summary-item {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;

  .summary-label {
    font-size: 0.7rem;
    color: #6b7280;
  }

  .summary-value {
    font-size: 0.95rem;
    font-weight: 700;
    color: #1f2937;
  }
}

.dormitory-section {
  margin-bottom: 32px;
  page-break-inside: avoid;

  .dormitory-name {
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #1f2937;
    font-size: 1.5rem;
    color: #1f2937;
  }
}

.room-section {
  margin-bottom: 24px;
  page-break-inside: avoid;

  .room-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    h4 {
      margin: 0;
      font-size: 1.125rem;
      color: #1f2937;
    }

    .room-gender {
      padding: 2px 8px;
      background: #e5e7eb;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .room-capacity {
      margin-left: auto;
      color: #6b7280;
      font-size: 0.875rem;
    }
  }
}

.room-table,
.unassigned-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;

  th {
    text-align: left;
    padding: 8px 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
  }

  td {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    color: #1f2937;

    &.bed-info {
      font-weight: 500;
      white-space: nowrap;
    }

    &.guest-name {
      font-weight: 500;
    }
  }

  tbody tr:nth-child(even) {
    background: #f9fafb;
  }
}

.flat-table-section {
  margin-bottom: 32px;
}

.flat-table {
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 8px 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
  }

  td {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    color: #1f2937;

    &.bed-info {
      font-weight: 500;
      white-space: nowrap;
    }

    &.guest-name {
      font-weight: 500;
    }
  }

  tbody tr:nth-child(even) {
    background: #f9fafb;
  }
}

.unassigned-section {
  margin-top: 32px;
  page-break-before: always;

  h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #1f2937;
    padding-bottom: 8px;
    border-bottom: 2px solid #ef4444;
  }
}

/* Print styles */
@media print {
  .print-view {
    padding: 0;
    max-width: none;
    font-size: 0.7rem;
  }

  .no-print {
    display: none !important;
  }

  .print-content {
    background: white;
  }

  .print-header {
    margin-bottom: 12px;

    h1 { font-size: 1.2rem; margin: 0; }
    h2 { font-size: 1rem; margin: 0 0 4px 0; }
    .print-date { font-size: 0.75rem; margin: 0; }
  }

  .summary-section {
    background: white;
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    margin-bottom: 12px;

    h3 { font-size: 0.85rem; margin: 0 0 6px 0; }
  }

  .summary-grid {
    gap: 4px;

    .stat-value { font-size: 1rem; }
    .stat-label { font-size: 0.65rem; }
  }

  .dormitory-section {
    margin-bottom: 12px;
    page-break-after: auto;

    > h3 {
      font-size: 1rem;
      margin: 0 0 6px 0;
      padding-bottom: 4px;
    }

    &:last-child {
      page-break-after: auto;
    }
  }

  .room-section {
    margin-bottom: 8px;
    page-break-inside: avoid;
  }

  .room-header {
    margin-bottom: 4px;

    h4 { font-size: 0.8rem; margin: 0; }
    .room-badge { font-size: 0.6rem; padding: 1px 4px; }
    .room-occupancy { font-size: 0.65rem; }
  }

  .room-table, .flat-table {
    th {
      padding: 3px 6px;
      font-size: 0.7rem;
    }

    td {
      padding: 3px 6px;
      font-size: 0.7rem;
    }
  }

  .unassigned-section {
    margin-top: 12px;

    h3 {
      font-size: 1rem;
      margin: 0 0 6px 0;
      padding-bottom: 4px;
    }
  }

  table {
    page-break-inside: avoid;
  }

  /* Ensure proper printing on letter paper */
  @page {
    size: letter;
    margin: 0.5in;
  }
}
</style>
