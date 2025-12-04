<template>
  <div class="timeline-view">
    <h2 class="timeline-title">Timeline View - Mockup</h2>
    <p class="timeline-description">
      This view shows guest occupancy across dates. Drag guests vertically to move between rooms.
      Dates are fixed horizontally.
    </p>

    <div class="timeline-container">
      <table class="timeline-table">
        <thead>
          <tr>
            <th class="bed-header">Bed</th>
            <th class="date-header">12/1</th>
            <th class="date-header">12/2</th>
            <th class="date-header">12/3</th>
            <th class="date-header">12/4</th>
            <th class="date-header">12/5</th>
            <th class="date-header">12/6</th>
            <th class="date-header">12/7</th>
          </tr>
        </thead>
        <tbody>
          <!-- Crystal Sunshine Room 1 -->
          <tr class="bed-row">
            <td class="bed-label">CS101 (L)</td>
            <td class="guest-cell"></td>
            <td class="guest-cell" style="position: relative;">
              <div class="guest-blob" style="width: calc(300% + 2px); left: 0;">John Smith</div>
            </td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
          </tr>
          <tr class="bed-row">
            <td class="bed-label">CS102 (U)</td>
            <td class="guest-cell"></td>
            <td class="guest-cell" style="position: relative;">
              <div class="guest-blob" style="width: calc(300% + 2px); left: 0;">Jane Doe</div>
            </td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
          </tr>

          <!-- Crystal Sunshine Room 2 -->
          <tr class="bed-row">
            <td class="bed-label">CS201 (L)</td>
            <td class="guest-cell" style="position: relative;">
              <div class="guest-blob" style="width: calc(500% + 4px); left: 0;">Alice Johnson</div>
            </td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
          </tr>
          <tr class="bed-row">
            <td class="bed-label">CS202 (U)</td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell" style="position: relative;">
              <div class="guest-blob" style="width: calc(300% + 2px); left: 0;">Bob Wilson</div>
            </td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
          </tr>

          <!-- Fresh Rain Room 1 -->
          <tr class="bed-row">
            <td class="bed-label">FR101 (L)</td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell" style="position: relative;">
              <div class="guest-blob" style="width: calc(500% + 4px); left: 0;">Mary Chen</div>
            </td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
          </tr>
          <tr class="bed-row">
            <td class="bed-label">FR102 (U)</td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
            <td class="guest-cell" style="position: relative;">
              <div class="guest-blob" style="width: calc(200% + 1px); left: 0;">Tom Garcia</div>
            </td>
            <td class="guest-cell"></td>
            <td class="guest-cell"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mockup-notes">
      <h3>How it works:</h3>
      <ul>
        <li><strong>Rows:</strong> Each bed in each room (e.g., CS101 = Crystal Sunshine Room 1, Bed 1, Lower bunk)</li>
        <li><strong>Columns:</strong> Dates (12/1, 12/2, etc.)</li>
        <li><strong>Cells:</strong> Guest names shown as chips spanning their stay dates</li>
        <li><strong>Dragging:</strong> Guests can be dragged vertically between beds, but dates remain fixed</li>
        <li><strong>Visual:</strong> Occupied cells have colored chips, empty cells are blank and available</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// Mockup component - no logic yet
</script>

<style scoped lang="scss">
.timeline-view {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #f9fafb;
}

.timeline-title {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.timeline-description {
  margin: 0 0 20px 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.timeline-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  margin-bottom: 30px;
}

.timeline-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;

  thead {
    background-color: #f3f4f6;
    position: sticky;
    top: 0;
    z-index: 10;

    th {
      padding: 12px 16px;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;

      &.bed-header {
        text-align: left;
        background-color: #e5e7eb;
        position: sticky;
        left: 0;
        z-index: 11;
        min-width: 120px;
      }

      &.date-header {
        min-width: 150px;
        background-color: #f3f4f6;
      }

      &:last-child {
        border-right: none;
      }
    }
  }

  tbody {
    tr {
      &:hover {
        background-color: #f9fafb;
      }

      &:nth-child(2n) {
        background-color: #fafafa;
      }
    }

    td {
      padding: 8px 16px;
      border-bottom: 1px solid #e5e7eb;
      border-right: 1px solid #e5e7eb;
      text-align: center;
      vertical-align: middle;
      height: 50px;

      &.bed-label {
        font-weight: 600;
        font-size: 0.85rem;
        color: #1f2937;
        background-color: #f9fafb;
        position: sticky;
        left: 0;
        z-index: 9;
        text-align: left;
        border-right: 2px solid #d1d5db;
      }

      &.guest-cell {
        min-width: 150px;
        background-color: white;
        position: relative;
      }

      &:last-child {
        border-right: none;
      }
    }
  }
}

.guest-blob {
  position: absolute;
  top: 4px;
  bottom: 4px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: move;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: auto;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }
}

.mockup-notes {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 12px 0;
    font-size: 1.1rem;
    color: #111827;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      margin-bottom: 8px;
      color: #4b5563;
      font-size: 0.9rem;
      line-height: 1.5;

      strong {
        color: #1f2937;
      }
    }
  }
}
</style>
