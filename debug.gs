/**
 * DEBUG UTILITIES - Spreadsheet Cleaner
 * @file Tools for cleaning/resetting spreadsheet during development
 */

/**
 * Clears all job tracker data while preserving headers and formatting
 */
function cleanJobTrackerForDebugging() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Clear main tracker
  const trackerSheet = ss.getSheetByName("Job Tracker");
  if (trackerSheet) {
    const lastRow = trackerSheet.getLastRow();
    if (lastRow > 1) {
      trackerSheet.getRange(2, 1, lastRow - 1, trackerSheet.getLastColumn())
        .clearContent()
        .clearFormat();
      Logger.log(`🧹 Cleared ${lastRow - 1} rows from Job Tracker`);
    }
  }
  
  // Clear spam sheet
  const spamSheet = ss.getSheetByName("Spammy");
  if (spamSheet) {
    const lastRow = spamSheet.getLastRow();
    if (lastRow > 1) {
      spamSheet.getRange(2, 1, lastRow - 1, spamSheet.getLastColumn())
        .clearContent()
        .clearFormat();
      Logger.log(`🧹 Cleared ${lastRow - 1} rows from Spammy`);
    }
  }
  
  // Clear any temporary sheets
  const tempSheets = ['June 2025 Tracker', 'Debug Temp', 'Temp Results'];
  tempSheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      ss.deleteSheet(sheet);
      Logger.log(`🗑️ Deleted temporary sheet: ${sheetName}`);
    }
  });
  
  // Reset named ranges if needed
  try {
    const namedRanges = ss.getNamedRanges();
    namedRanges.forEach(range => {
      if (range.getName().includes('temp_')) {
        range.remove();
      }
    });
  } catch (e) {
    Logger.log("⚠️ Couldn't clear named ranges: " + e);
  }
  
  Logger.log("✅ Spreadsheet cleaned and ready for debugging");
}

/**
 * Creates a fresh debug sheet with test data
 */
function setupDebugSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Delete if already exists
  let debugSheet = ss.getSheetByName("DEBUG");
  if (debugSheet) {
    ss.deleteSheet(debugSheet);
  }
  
  // Create new sheet
  debugSheet = ss.insertSheet("DEBUG");
  
  // Add headers and sample data
  const headers = ["Date", "Title", "Company", "Status", "Subject", "Body", "From", "URL"];
  debugSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const testData = [
    [
      new Date(),
      "Software Engineer",
      "Google",
      "Submitted",
      "Application received",
      "Thank you for applying to Software Engineer at Google",
      "noreply@google.com",
      "https://mail.google.com/mail/u/0/#inbox/FAKETHREAD1"
    ],
    [
      new Date(),
      "Product Manager",
      "Amazon",
      "Interview",
      "Interview invitation",
      "We'd like to schedule an interview for the Product Manager role",
      "recruiting@amazon.com",
      "https://mail.google.com/mail/u/0/#inbox/FAKETHREAD2"
    ]
  ];
  
  debugSheet.getRange(2, 1, testData.length, headers.length).setValues(testData);
  
  // Format headers
  debugSheet.getRange(1, 1, 1, headers.length)
    .setBackground("#333333")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  
  Logger.log("✅ Debug sheet created with sample data");
}

/**
 * Runs complete debug setup (clean + create test sheet)
 */
function fullDebugSetup() {
  cleanJobTrackerForDebugging();
  setupDebugSheet();
  Logger.log("🛠️  Debug environment ready. Use menu: Debug > Test Functions");
}

/**
 * Adds debug menu to spreadsheet UI
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  // Add to existing menu or create new
  try {
    ui.createMenu("🛠️ Debug")
      .addItem("Clean All Sheets", "cleanJobTrackerForDebugging")
      .addItem("Create Test Sheet", "setupDebugSheet")
      .addItem("Full Debug Setup", "fullDebugSetup")
      .addSeparator()
      .addItem("Run Tests", "runAllTests")
      .addToUi();
  } catch (e) {
    Logger.log("⚠️ Couldn't add debug menu: " + e);
  }
}