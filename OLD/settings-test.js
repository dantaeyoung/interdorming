// Test script to verify settings integration
// This can be run in the browser console to test the settings system

function testSettingsIntegration() {
    console.log('Testing Settings Integration...');
    
    if (typeof app === 'undefined') {
        console.error('App not found. Make sure the application is loaded.');
        return;
    }
    
    // Test 1: Check default settings
    console.log('Test 1: Default settings loaded');
    console.log('Default settings:', JSON.stringify(app.settings, null, 2));
    
    const expectedDefaults = {
        warnings: {
            ageGap: { enabled: true, threshold: 20 },
            genderMismatch: true,
            bunkPreference: true,
            familySeparation: true,
            adultMinor: true,
            roomAvailability: true
        },
        display: {
            showAgeHistograms: true
        }
    };
    
    let defaultsCorrect = true;
    if (!app.settings.warnings.ageGap.enabled || app.settings.warnings.ageGap.threshold !== 20) {
        defaultsCorrect = false;
    }
    if (!app.settings.warnings.genderMismatch || !app.settings.warnings.bunkPreference || 
        !app.settings.warnings.familySeparation || !app.settings.warnings.adultMinor || 
        !app.settings.warnings.roomAvailability) {
        defaultsCorrect = false;
    }
    
    console.log(defaultsCorrect ? '✓ Default settings are correct' : '✗ Default settings are incorrect');
    
    // Test 2: Update age gap threshold
    console.log('\nTest 2: Update age gap threshold');
    const originalThreshold = app.settings.warnings.ageGap.threshold;
    app.updateSettings({
        warnings: {
            ageGap: { threshold: 30 }
        }
    });
    
    const thresholdUpdated = app.settings.warnings.ageGap.threshold === 30;
    console.log(thresholdUpdated ? '✓ Age gap threshold updated correctly' : '✗ Age gap threshold not updated');
    
    // Test 3: Disable gender mismatch warnings
    console.log('\nTest 3: Disable gender mismatch warnings');
    app.updateSettings({
        warnings: {
            genderMismatch: false
        }
    });
    
    const genderDisabled = app.settings.warnings.genderMismatch === false;
    console.log(genderDisabled ? '✓ Gender mismatch warnings disabled' : '✗ Gender mismatch warnings not disabled');
    
    // Test 4: Create test guests and verify warnings respect settings
    console.log('\nTest 4: Test warning system with settings');
    
    // Mock some test data if none exists
    if (app.guests.length === 0) {
        app.guests = [
            { id: 'test1', firstName: 'John', lastName: 'Doe', gender: 'M', age: 25, lowerBunk: false, groupName: '' },
            { id: 'test2', firstName: 'Jane', lastName: 'Smith', gender: 'F', age: 30, lowerBunk: false, groupName: '' }
        ];
    }
    
    // Test gender mismatch warning (should be disabled)
    const testGuest = { id: 'test-guest', firstName: 'Test', lastName: 'Guest', gender: 'F', age: 25, lowerBunk: false, groupName: '' };
    const testBed = { bedId: 'test-bed', bedType: 'single', assignedGuestId: null, position: 1 };
    const testRoom = { roomName: 'Test Room', roomGender: 'M', beds: [testBed] };
    
    const warnings = app.getAssignmentWarnings(testGuest, testBed, testRoom);
    const hasGenderWarning = warnings.some(w => w.includes('Gender mismatch'));
    console.log(!hasGenderWarning ? '✓ Gender mismatch warning correctly disabled' : '✗ Gender mismatch warning still showing');
    
    // Test 5: Reset to defaults
    console.log('\nTest 5: Reset to defaults');
    app.resetSettingsToDefaults();
    
    const resetCorrect = app.settings.warnings.genderMismatch === true && 
                        app.settings.warnings.ageGap.threshold === 20;
    console.log(resetCorrect ? '✓ Settings reset to defaults correctly' : '✗ Settings not reset correctly');
    
    // Test 6: Test invalid settings rejection
    console.log('\nTest 6: Test invalid settings rejection');
    const beforeUpdate = JSON.parse(JSON.stringify(app.settings));
    const updateResult = app.updateSettings({
        warnings: {
            ageGap: { threshold: 100 } // Invalid threshold (> 50)
        }
    });
    
    const thresholdUnchanged = app.settings.warnings.ageGap.threshold === beforeUpdate.warnings.ageGap.threshold;
    console.log(thresholdUnchanged ? '✓ Invalid threshold correctly rejected' : '✗ Invalid threshold was accepted');
    
    console.log('\nSettings integration test completed!');
    console.log('Final settings:', JSON.stringify(app.settings, null, 2));
}

// Helper function to test specific warning types
function testWarningType(warningType, testScenario) {
    console.log(`Testing ${warningType} warnings...`);
    
    const originalSetting = app.settings.warnings[warningType];
    
    // Test with warning enabled
    app.updateSettings({ warnings: { [warningType]: true } });
    console.log(`${warningType} enabled: warnings should appear`);
    
    // Test with warning disabled  
    app.updateSettings({ warnings: { [warningType]: false } });
    console.log(`${warningType} disabled: warnings should not appear`);
    
    // Restore original setting
    app.updateSettings({ warnings: { [warningType]: originalSetting } });
}

console.log('Settings test functions loaded. Run testSettingsIntegration() to test the settings system.');