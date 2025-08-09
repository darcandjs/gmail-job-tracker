/**
 * Spreadsheet manipulation functions
 * @file Handles all spreadsheet-related operations
 */

/**
 * Color codes rows based on application status
 * @param {Sheet} sheet - Spreadsheet sheet to format
 */
function colorCodeJobTrackerRows(sheet) {
  const data = sheet.getDataRange().getValues();
  const statusCol = data[0].indexOf("Status");

  if (statusCol === -1) {
    Logger.log("❌ 'Status' column not found");
    return;
  }

  for (let i = 1; i < data.length; i++) {
    const status = (data[i][statusCol] || "").toString().toLowerCase();
    const range = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());

    // Set background colors based on status
    if (status.includes("interview")) {
      range.setBackground("#d9ead3"); // Light green
    } else if (status.includes("rejected")) {
      range.setBackground("#f4cccc"); // Light red
    } else if (status.includes("submitted")) {
      range.setBackground("#cfe2f3"); // Light blue
    } else if (status.includes("to do")) {
      range.setBackground("#fff2cc"); // Light yellow
    } else {
      range.setBackground("#ffffff"); // White
    }
  }

  Logger.log(`🎨 Color-coded ${data.length - 1} rows`);
}

/**
 * Backfills missing job titles from subject/body
 */
function backfillMissingTitles() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  if (!sheet) {
    Logger.log("❌ 'Job Tracker' sheet not found");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const titleCol = headers.indexOf("Title");
  const subjectCol = headers.indexOf("Subject");
  const bodyCol = headers.indexOf("Body");

  if (titleCol === -1 || subjectCol === -1 || bodyCol === -1) {
    Logger.log("❌ Required columns not found");
    return;
  }

  const updates = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const currentTitle = (row[titleCol] || "").trim();

    if (!currentTitle || currentTitle === "???") {
      const subject = row[subjectCol] || "";
      const body = row[bodyCol] || "";
      const inferredTitle = extractJobTitle(subject, body);

      if (inferredTitle && inferredTitle !== "???") {
        updates.push({
          row: i + 1,
          col: titleCol + 1,
          value: inferredTitle
        });
      }
    }
  }

  // Apply all updates in batch
  updates.forEach(update => {
    sheet.getRange(update.row, update.col).setValue(update.value);
  });

  Logger.log(`✅ Backfilled ${updates.length} missing titles`);
}

/**
 * Clears data from specified sheets while preserving headers
 * @param {Array<string>} sheetNames - Names of sheets to clear
 */
function clearJobDataTabs(sheetNames = ["Job Tracker", "Spammy"]) {
  sheetNames.forEach(name => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!sheet) {
      Logger.log(`❌ Sheet '${name}' not found`);
      return;
    }

    const lastRow = sheet.getLastRow();
    const frozenRows = sheet.getFrozenRows();

    if (lastRow > frozenRows) {
      sheet.getRange(frozenRows + 1, 1, lastRow - frozenRows, sheet.getMaxColumns())
           .clearContent();
      Logger.log(`🧹 Cleared ${lastRow - frozenRows} rows from '${name}'`);
    }
  });
}
/**
 * Fixes existing recruiter entries in current sheet
 */
function fixRecruiterEntries() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const fromCol = headers.indexOf('From');
  const subjectCol = headers.indexOf('Subject');
  const bodyCol = headers.indexOf('Body');
  const titleCol = headers.indexOf('Title');
  const companyCol = headers.indexOf('Company');
  
  const recruiters = ['sparksgroup', 'happycog', 'lasallenetwork', 'jobhire.tech'];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const from = (row[fromCol] || "").toLowerCase();
    
    if (recruiters.some(r => from.includes(r))) {
      const result = processEmail(row[fromCol], row[subjectCol], row[bodyCol]);
      
      if (result.title !== "???" || result.company !== "???") {
        sheet.getRange(i+1, titleCol+1).setValue(result.title);
        sheet.getRange(i+1, companyCol+1).setValue(result.company);
      }
    }
  }
}

