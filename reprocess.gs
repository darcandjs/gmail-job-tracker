/**
 * Reprocesses existing spreadsheet data with enhanced parsers
 * @param {string} sheetName - Name of sheet to reprocess (defaults to all tracker sheets)
 */
function reprocessExistingData(sheetName = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = sheetName 
    ? [ss.getSheetByName(sheetName)] 
    : ss.getSheets().filter(sheet => sheet.getName().includes('Tracker'));
  
  sheets.forEach(sheet => {
    if (!sheet) return;
    
    Logger.log(`🔁 Reprocessing sheet: ${sheet.getName()}`);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indexes
    const fromCol = headers.indexOf('From');
    const subjectCol = headers.indexOf('Subject');
    const bodyCol = headers.indexOf('Body');
    const titleCol = headers.indexOf('Title');
    const companyCol = headers.indexOf('Company');
    const statusCol = headers.indexOf('Status');
    
    if ([fromCol, subjectCol, bodyCol, titleCol, companyCol].some(col => col === -1)) {
      Logger.log(`❌ Missing columns in sheet: ${sheet.getName()}`);
      return;
    }
    
    let updates = 0;
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const from = row[fromCol];
      const subject = row[subjectCol];
      const body = row[bodyCol];
      
      // Skip rows that already have good data
      if (row[titleCol] && row[titleCol] !== "???" && 
          row[companyCol] && row[companyCol] !== "???" && 
          row[companyCol] !== "No Reply") {
        continue;
      }
      
      // Reprocess with enhanced parsers
      const newTitle = extractJobTitle(subject, body);
      const newCompany = extractCompanyName(from, subject, body);
      const newStatus = getStatusFromText(`${subject} ${body}`);
      
      // Update if we got better data
      if ((newTitle !== "???" && newTitle !== row[titleCol]) ||
          (newCompany !== "???" && newCompany !== row[companyCol] && newCompany !== "No Reply") ||
          (newStatus !== row[statusCol])) {
        sheet.getRange(i+1, titleCol+1).setValue(newTitle);
        sheet.getRange(i+1, companyCol+1).setValue(newCompany);
        sheet.getRange(i+1, statusCol+1).setValue(newStatus);
        updates++;
      }
    }
    
    Logger.log(`✅ Updated ${updates} rows in ${sheet.getName()}`);
    
    // Reapply formatting
    formatTrackerSheet(sheet);
  });
}

/**
 * Menu item for easy access
 */
function addReprocessToMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🛠️ Data Tools")
    .addItem("Reprocess Current Sheet", "reprocessCurrentSheet")
    .addItem("Reprocess All Trackers", "reprocessAllTrackers")
    .addToUi();
}

function reprocessCurrentSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  reprocessExistingData(sheet.getName());
}

function reprocessAllTrackers() {
  reprocessExistingData();
}

// Add to your existing onOpen()
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("💼 Job Tracker")
    // ... your existing menu items ...
    .addSeparator()
    .addSubMenu(ui.createMenu("🛠️ Data Tools")
      .addItem("Reprocess Current Sheet", "reprocessCurrentSheet")
      .addItem("Reprocess All Trackers", "reprocessAllTrackers"))
      .addItem("Fix LinkedIn Entries", "fixLinkedInEntries")
     .addToUi();
}

function fixLinkedInEntries() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const fromCol = data[0].indexOf('From');
  const subjectCol = data[0].indexOf('Subject');
  const bodyCol = data[0].indexOf('Body');
  const titleCol = data[0].indexOf('Title');
  const companyCol = data[0].indexOf('Company');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[fromCol] && row[fromCol].includes('linkedin.com')) {
      const { title, company } = handleLinkedInEmail(row[subjectCol], row[bodyCol]);
      if (title !== "???" || company !== "???") {
        sheet.getRange(i+1, titleCol+1).setValue(title);
        sheet.getRange(i+1, companyCol+1).setValue(company);
      }
    }
  }
}