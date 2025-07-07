// Test script to verify the persistence system works correctly
// This would be run in a browser environment

function testPersistence() {
    console.log("Testing persistence system...");
    
    // Test data structure
    const testData = {
        guests: [
            { id: 'guest_1', firstName: 'John', lastName: 'Doe', gender: 'M', age: 25 }
        ],
        assignments: [['guest_1', 'MA1']],
        dormitories: [
            {
                dormitoryName: "Test Building",
                active: true,
                rooms: [
                    {
                        roomName: "Test Room A",
                        roomGender: "M",
                        active: true,
                        beds: [
                            { bedId: "MA1", bedType: "single", assignedGuestId: "guest_1", position: 1 }
                        ]
                    }
                ]
            }
        ],
        version: '2.0'
    };
    
    // Store test data
    localStorage.setItem('dormAssignments', JSON.stringify(testData));
    
    // Create a new instance and test loading
    const testApp = new DormAssignmentTool();
    
    // Verify data was loaded correctly
    console.log("Loaded dormitories:", testApp.dormitories);
    console.log("Loaded assignments:", testApp.assignments);
    console.log("Flat rooms array:", testApp.rooms);
    
    // Test that bed assignment was restored
    const bed = testApp.findBed('MA1');
    console.log("Found bed MA1:", bed);
    
    if (bed && bed.assignedGuestId === 'guest_1') {
        console.log("✓ Persistence test passed - bed assignment restored correctly");
    } else {
        console.log("✗ Persistence test failed - bed assignment not restored");
    }
    
    // Test migration from old structure
    const oldData = {
        guests: [
            { id: 'guest_2', firstName: 'Jane', lastName: 'Smith', gender: 'F', age: 30 }
        ],
        assignments: [['guest_2', 'OLD1']],
        rooms: [
            {
                roomName: "Old Room",
                roomGender: "F",
                active: true,
                beds: [
                    { bedId: "OLD1", bedType: "single", assignedGuestId: "guest_2", position: 1 }
                ]
            }
        ]
    };
    
    // Store old data
    localStorage.setItem('dormAssignments', JSON.stringify(oldData));
    
    // Create new instance and test migration
    const migrationApp = new DormAssignmentTool();
    
    console.log("Migrated dormitories:", migrationApp.dormitories);
    console.log("Migration test - found bed OLD1:", migrationApp.findBed('OLD1'));
    
    if (migrationApp.dormitories.length > 0 && migrationApp.dormitories[0].dormitoryName === "Main Building") {
        console.log("✓ Migration test passed - old structure migrated correctly");
    } else {
        console.log("✗ Migration test failed - old structure not migrated");
    }
    
    // Clean up
    localStorage.removeItem('dormAssignments');
    console.log("Test completed");
}

// Note: This test would need to be run in a browser environment with the DormAssignmentTool class loaded
console.log("Test script loaded. Run testPersistence() in browser console after loading app.js");