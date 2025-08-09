/**
 * UI Triggers and Menu Setup
 * @file Handles spreadsheet menu and triggers
 */

/**
 * Creates custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu("💼 Job Tracker")
    // Fetching Operations
    .addSubMenu(
      ui.createMenu("📥 Fetch Emails")
        .addItem("Last 4 Weeks", "fetch4Weeks")
        .addItem("From Label", "fetchFromLabel")
        .addItem("June 2025", "fetchJune2025")
    )
    
    // Spreadsheet Tools
    .addSubMenu(
      ui.createMenu("🛠️ Sheet Tools")
        .addItem("Backfill Missing Titles", "backfillMissingTitles")
        .addItem("Color Code Rows", "colorCodeJobTrackerRows")
        .addItem("Clear Sheets", "clearJobDataTabs")

    )
    
    // Data Processing
    .addSubMenu(
      ui.createMenu("🔧 Data Tools")
        .addItem("Reprocess Current Sheet", "reprocessCurrentSheet")
        .addItem("Reprocess All Trackers", "reprocessAllTrackers")
        .addItem("Fix LinkedIn Entries", "fixLinkedInEntries")
        .addItem("Fix Recruiter Entries", "fixRecruiterEntries")
    )
    
    // Automation
    .addSeparator()
    .addItem("Send Daily Summary", "sendDailySummary")
    .addItem("Setup Triggers", "setupTriggers")
    
    .addToUi();
}

/**
 * Sets up time-based triggers
 */
function setupTriggers() {
  // Clear existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Create new triggers
  ScriptApp.newTrigger("sendDailySummary")
    .timeBased()
    .atHour(9) // 9 AM
    .everyDays(1)
    .create();

  ScriptApp.newTrigger("fetchFromLabel")
    .timeBased()
    .everyHours(6)
    .create();

  ScriptApp.newTrigger("colorCodeJobTrackerRows")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("✅ Triggers set up successfully");
}

/**
 * Wrapper function for June 2025 specific fetch
 */
function fetchJune2025() {
  fetchMonthOfLabeledEmails(2025, 6);
}