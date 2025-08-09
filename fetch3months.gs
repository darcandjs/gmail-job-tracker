/**
 * Fetches labeled emails for last 3 months with batch processing and deduplication
 */
function fetchLastThreeMonths() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();
  
  // Process current month and two previous months
  for (let i = 0; i < 3; i++) {
    const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1; // 1-12
    
    fetchMonthOfLabeledEmails(year, month, "_____JOBAPPS_____", true);
  }
}

/**
 * Fetches labeled emails for a specific month with batch processing
 */
function fetchMonthOfLabeledEmails(year, month, labelName = "_____JOBAPPS_____", batchMode = true) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const monthName = Utilities.formatDate(new Date(year, month-1, 1), "UTC", "MMMM");
  const sheetName = `${monthName} ${year} Tracker`;
  let sheet = ss.getSheetByName(sheetName);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = ["Date", "Title", "Company", "Status", "Subject", "Body", "From", "URL"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  
  // Get existing URLs for deduplication (column H)
  const existingUrls = new Set();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const url = data[i][7]; // URL is column 8 (0-based index 7)
    if (url) existingUrls.add(url.toString().trim());
  }

  // Calculate date ranges (whole month or batches)
  const dateRanges = batchMode 
    ? getDateRangesInBatches(year, month, 10) // 10-day batches
    : [{
        start: new Date(year, month-1, 1),
        end: new Date(year, month, 0, 23, 59, 59)
      }];

  let totalProcessed = 0;
  
  // Process each date range
  for (let batchIndex = 0; batchIndex < dateRanges.length; batchIndex++) {
    const range = dateRanges[batchIndex];
    const query = `label:${labelName} after:${formatDateForQuery(range.start)} before:${formatDateForQuery(range.end)}`;
    Logger.log(`🔍 Batch ${batchIndex + 1}/${dateRanges.length}: ${query}`);
    
    const threads = GmailApp.search(query);
    Logger.log(`📨 Found ${threads.length} threads in this batch`);
    
    let batchAdded = 0;
    
    // Process threads in this batch
    for (let j = 0; j < threads.length; j++) {
      const thread = threads[j];
      const { firstMsg, from, subject, body, threadUrl } = extractMessageDetails(thread);
      
      // Skip duplicates
      if (existingUrls.has(threadUrl)) {
        Logger.log(`↩️ Skipping duplicate: ${threadUrl}`);
        continue;
      }
      
      const result = processEmail(from, subject, body);
      if (!result) {
        Logger.log("⚠️ Skipped - identified as non-application");
        continue;
      }

      sheet.appendRow([
        firstMsg.getDate(),
        result.title || "???",
        result.company || "???",
        result.status || "Submitted",
        subject,
        body,
        from,
        threadUrl
      ]);
      
      existingUrls.add(threadUrl);
      batchAdded++;
      totalProcessed++;
    }
    
    Logger.log(`✅ Batch ${batchIndex + 1} added ${batchAdded} new emails`);
    
    // Small delay between batches to avoid quota issues
    if (batchIndex < dateRanges.length - 1) {
      Utilities.sleep(2000);
    }
  }

  // Final formatting
  formatTrackerSheet(sheet);
  Logger.log(`🎉 Processed ${totalProcessed} new emails for ${monthName} ${year}`);
  
  return totalProcessed;
}

/**
 * Splits a month into batches for processing
 */
function getDateRangesInBatches(year, month, daysPerBatch) {
  const ranges = [];
  const startDate = new Date(year, month-1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  
  let currentStart = new Date(startDate);
  
  while (currentStart <= endDate) {
    // Create new date objects for each batch
    const batchStart = new Date(currentStart);
    let batchEnd = new Date(currentStart);
    batchEnd.setDate(batchStart.getDate() + daysPerBatch - 1);
    
    // Don't go past month end
    if (batchEnd > endDate) {
      batchEnd = new Date(endDate);
    }
    
    // Set time to end of day
    batchEnd.setHours(23, 59, 59);
    
    ranges.push({
      start: new Date(batchStart),
      end: new Date(batchEnd)
    });
    
    // Move to next batch (create new date object)
    currentStart = new Date(batchEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }
  
  Logger.log(`📅 Split month into ${ranges.length} batches`);
  return ranges;
}

/**
 * Formats date for Gmail query (YYYY/MM/DD)
 */
function formatDateForQuery(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy/MM/dd");
}

/**
 * Formats the tracker sheet
 */
function formatTrackerSheet(sheet) {
  // Auto-resize columns
  sheet.autoResizeColumns(1, 8);
  
  // Apply alternating row colors
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const range = sheet.getRange(2, 1, lastRow-1, 8);
    const colors = [];
    const color1 = "#ffffff";
    const color2 = "#f9f9f9";
    
    for (let i = 0; i < lastRow-1; i++) {
      colors.push(Array(8).fill(i % 2 === 0 ? color1 : color2));
    }
    
    range.setBackgrounds(colors);
  }
  
  // Format header row
  sheet.getRange(1, 1, 1, 8)
    .setBackground("#333333")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  
  // Format date column
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow-1, 1)
      .setNumberFormat("yyyy-mm-dd hh:mm");
  }
}