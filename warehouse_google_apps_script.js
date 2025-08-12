
// Google Apps Script for Automatic Warehouse Data Sync
// This script runs on Google's servers and handles automatic data synchronization

// Configuration - Set these values according to your setup
const SPREADSHEET_ID = 'your_spreadsheet_id_here'; // Replace with your actual spreadsheet ID
const SYNC_FREQUENCY_MINUTES = 60; // How often to sync (in minutes)

// Web App entry point for receiving data from the warehouse application
function doPost(e) {
  try {
    console.log('Received POST request for data sync');

    // Parse the incoming data
    const requestData = JSON.parse(e.postData.contents);

    if (requestData.action === 'updateSheets') {
      const success = updateWarehouseSheets(requestData.data);

      return ContentService
        .createTextOutput(JSON.stringify({
          success: success,
          message: success ? 'Data updated successfully' : 'Update failed',
          timestamp: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Invalid action'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in doPost:', error);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Time-driven function that can run automatically
function automaticDataSync() {
  try {
    console.log('Running automatic data sync...');

    // Get data from your warehouse system
    // This could be from a webhook, API call, or database
    const warehouseData = getWarehouseData();

    if (warehouseData) {
      const success = updateWarehouseSheets(warehouseData);

      if (success) {
        console.log('✅ Automatic sync completed successfully');
        sendSyncNotification('success', 'Data synced automatically');
      } else {
        console.error('❌ Automatic sync failed');
        sendSyncNotification('error', 'Automatic sync failed');
      }
    }

  } catch (error) {
    console.error('Error in automatic sync:', error);
    sendSyncNotification('error', `Sync error: ${error.message}`);
  }
}

// Update warehouse data in Google Sheets
function updateWarehouseSheets(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Update Materials sheet
    if (data.materials && data.materials.length > 0) {
      updateSheet(spreadsheet, 'Materials', data.materials);
    }

    // Update Racks sheet
    if (data.racks && data.racks.length > 0) {
      updateSheet(spreadsheet, 'Racks', data.racks);
    }

    // Update Placements sheet
    if (data.placements && data.placements.length > 0) {
      updateSheet(spreadsheet, 'Placements', data.placements);
    }

    // Update Summary sheet
    if (data.summary && data.summary.length > 0) {
      updateSheet(spreadsheet, 'Summary', data.summary);
    }

    // Update last sync timestamp
    updateLastSyncTimestamp(spreadsheet);

    return true;

  } catch (error) {
    console.error('Error updating sheets:', error);
    return false;
  }
}

// Update individual sheet with data
function updateSheet(spreadsheet, sheetName, data) {
  try {
    let sheet = spreadsheet.getSheetByName(sheetName);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      console.log(`Created new sheet: ${sheetName}`);
    }

    // Clear existing data (optional - comment out to append instead)
    sheet.clear();

    // Add data to sheet
    if (data.length > 0) {
      const range = sheet.getRange(1, 1, data.length, data[0].length);
      range.setValues(data);

      // Format header row
      if (data.length > 0) {
        const headerRange = sheet.getRange(1, 1, 1, data[0].length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#E8F0FE');
      }

      console.log(`Updated ${sheetName} with ${data.length} rows`);
    }

  } catch (error) {
    console.error(`Error updating ${sheetName}:`, error);
    throw error;
  }
}

// Update last sync timestamp in a dedicated cell
function updateLastSyncTimestamp(spreadsheet) {
  try {
    let syncSheet = spreadsheet.getSheetByName('Sync_Status');

    if (!syncSheet) {
      syncSheet = spreadsheet.insertSheet('Sync_Status');

      // Setup headers for sync status sheet
      syncSheet.getRange('A1').setValue('Last Sync');
      syncSheet.getRange('B1').setValue('Status');
      syncSheet.getRange('C1').setValue('Sync Count');

      // Format headers
      const headerRange = syncSheet.getRange('A1:C1');
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8F0FE');
    }

    // Get current sync count
    const currentCount = syncSheet.getRange('C2').getValue() || 0;

    // Update sync information
    syncSheet.getRange('A2').setValue(new Date());
    syncSheet.getRange('B2').setValue('Success');
    syncSheet.getRange('C2').setValue(currentCount + 1);

  } catch (error) {
    console.error('Error updating sync timestamp:', error);
  }
}

// Get warehouse data (implement based on your data source)
function getWarehouseData() {
  // Option 1: Call your warehouse API
  // return callWarehouseAPI();

  // Option 2: Read from a different Google Sheet
  // return readFromSourceSheet();

  // Option 3: Use webhook data stored in properties
  // return getStoredWebhookData();

  console.log('No data source configured');
  return null;
}

// Example: Call warehouse API to get data
function callWarehouseAPI() {
  try {
    const API_URL = 'https://your-warehouse-api.com/data'; // Replace with your API
    const API_KEY = 'your-api-key'; // Replace with your API key

    const response = UrlFetchApp.fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    } else {
      console.error('API call failed with status:', response.getResponseCode());
      return null;
    }

  } catch (error) {
    console.error('Error calling warehouse API:', error);
    return null;
  }
}

// Send notification about sync status
function sendSyncNotification(status, message) {
  try {
    // Option 1: Send email notification
    // sendEmailNotification(status, message);

    // Option 2: Send Slack notification
    // sendSlackNotification(status, message);

    // Option 3: Update a monitoring sheet
    logSyncEvent(status, message);

  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Send email notification
function sendEmailNotification(status, message) {
  const EMAIL = 'your-email@company.com'; // Replace with your email
  const subject = `Warehouse Data Sync: ${status.toUpperCase()}`;
  const body = `
    Warehouse Data Sync Status: ${status}

    Message: ${message}
    Timestamp: ${new Date().toLocaleString()}

    Spreadsheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}
  `;

  GmailApp.sendEmail(EMAIL, subject, body);
}

// Send Slack notification
function sendSlackNotification(status, message) {
  const SLACK_WEBHOOK_URL = 'your-slack-webhook-url'; // Replace with your Slack webhook

  const payload = {
    text: `Warehouse Sync ${status}: ${message}`,
    channel: '#warehouse-alerts', // Replace with your channel
    username: 'Warehouse Bot',
    icon_emoji: status === 'success' ? ':white_check_mark:' : ':x:'
  };

  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

// Log sync events for monitoring
function logSyncEvent(status, message) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName('Sync_Log');

    if (!logSheet) {
      logSheet = spreadsheet.insertSheet('Sync_Log');

      // Setup headers
      logSheet.getRange('A1:D1').setValues([['Timestamp', 'Status', 'Message', 'Duration']]);
      const headerRange = logSheet.getRange('A1:D1');
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8F0FE');
    }

    // Add new log entry
    logSheet.appendRow([
      new Date(),
      status,
      message,
      '' // Duration can be calculated if needed
    ]);

    // Keep only last 100 log entries
    const lastRow = logSheet.getLastRow();
    if (lastRow > 101) { // 100 data rows + 1 header row
      logSheet.deleteRows(2, lastRow - 101);
    }

  } catch (error) {
    console.error('Error logging sync event:', error);
  }
}

// Setup automatic triggers (run this once to setup time-driven triggers)
function setupAutomaticTriggers() {
  // Delete existing triggers for this function
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'automaticDataSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new time-driven trigger
  ScriptApp.newTrigger('automaticDataSync')
    .timeBased()
    .everyMinutes(SYNC_FREQUENCY_MINUTES)
    .create();

  console.log(`Setup automatic sync every ${SYNC_FREQUENCY_MINUTES} minutes`);
}

// Setup triggers for more frequent syncing (every minute)
function setupHighFrequencyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'automaticDataSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create trigger that runs every minute
  ScriptApp.newTrigger('automaticDataSync')
    .timeBased()
    .everyMinutes(1) // Every minute
    .create();

  console.log('Setup high-frequency sync (every minute)');
}

// Remove all automatic triggers
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'automaticDataSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  console.log('Removed all automatic triggers');
}

// Test function to verify everything works
function testSync() {
  console.log('Running test sync...');

  // Sample test data
  const testData = {
    materials: [
      ['ID', 'Part Number', 'Serial Number', 'Type', 'Description', 'Timestamp'],
      ['1', 'TEST001', 'SN123456', 'Component', 'Test Material', new Date().toLocaleString()]
    ],
    summary: [
      ['Metric', 'Value', 'Last Updated'],
      ['Test Status', 'SUCCESS', new Date().toLocaleString()],
      ['Last Test', new Date().toISOString(), new Date().toLocaleString()]
    ]
  };

  const success = updateWarehouseSheets(testData);

  if (success) {
    console.log('✅ Test sync completed successfully');
    sendSyncNotification('success', 'Test sync completed');
  } else {
    console.log('❌ Test sync failed');
    sendSyncNotification('error', 'Test sync failed');
  }

  return success;
}

// Helper function to format data for logging
function formatLogData(data) {
  return {
    materialsCount: data.materials ? data.materials.length - 1 : 0, // -1 for header
    racksCount: data.racks ? data.racks.length - 1 : 0,
    placementsCount: data.placements ? data.placements.length - 1 : 0,
    timestamp: new Date().toISOString()
  };
}
