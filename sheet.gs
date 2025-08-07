function colorCodeJobTrackerRows(sheet) {
  const data = sheet.getDataRange().getValues();
  const statusCol = 6;

  for (let i = 1; i < data.length; i++) {
    const status = (data[i][statusCol - 1] || "").toLowerCase();
    const row = i + 1;

    let bgColor = "";
    if (status === "submitted") bgColor = "#d9eaf7";     // Light blue
    else if (status === "interview") bgColor = "#e2f0d9"; // Light green
    else if (status === "rejected") bgColor = "#f4cccc";  // Light red
    else bgColor = "#f9f9f9";                             // Light gray default

    sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground(bgColor);
  }

  Logger.log(`🎨 Color-coded ${data.length - 1} rows by status.`);
}

function createCleanedJobTrackerFromLast4Weeks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("Job Tracker");
  const allData = sourceSheet.getDataRange().getValues();

  const headers = allData[0];
  const dateColIndex = headers.indexOf("Date");
  if (dateColIndex === -1) {
    throw new Error("❌ 'Date' column not found.");
  }

  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() - 28);

  const filteredData = [headers];

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const rowDate = new Date(row[dateColIndex]);

    if (!isNaN(rowDate) && rowDate >= cutoffDate && rowDate <= today) {
      filteredData.push(row);
    }
  }

  const sheetName = "Cleaned Tracker";
  let newSheet = ss.getSheetByName(sheetName);
  if (newSheet) ss.deleteSheet(newSheet);
  newSheet = ss.insertSheet(sheetName);

  newSheet.getRange(1, 1, filteredData.length, filteredData[0].length).setValues(filteredData);
  Logger.log(`✅ Created '${sheetName}' sheet with ${filteredData.length - 1} row(s) from the last 4 weeks.`);
}

function backfillMissingThreadIds() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const subjectCol = headers.indexOf("Subject") + 1;
  const dateCol = headers.indexOf("Date") + 1;
  const urlCol = headers.indexOf("URL") + 1;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const threadUrl = row[urlCol - 1];
    const subject = row[subjectCol - 1];
    const rawDate = row[dateCol - 1];

    if (threadUrl && threadUrl.includes("#inbox/")) continue;

    if (!subject || !rawDate) {
      Logger.log(`⚠️ Row ${i + 1} missing subject or date`);
      continue;
    }

    const baseDate = new Date(rawDate);
    const dayBefore = new Date(baseDate);
    dayBefore.setDate(baseDate.getDate() - 1);
    const dayAfter = new Date(baseDate);
    dayAfter.setDate(baseDate.getDate() + 1);

    const afterDate = Utilities.formatDate(dayBefore, Session.getScriptTimeZone(), "yyyy/MM/dd");
    const beforeDate = Utilities.formatDate(dayAfter, Session.getScriptTimeZone(), "yyyy/MM/dd");

    const cleanedSubject = subject.replace(/^\[.*?\]\s*/, "").trim();
    const query = `subject:("${cleanedSubject}") after:${afterDate} before:${beforeDate}`;
    Logger.log(`🔍 Row ${i + 1} — Searching Gmail with: ${query}`);

    const threads = GmailApp.search(query, 0, 1);
    if (threads.length > 0) {
      const threadId = threads[0].getId();
      const url = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
      sheet.getRange(i + 1, urlCol).setValue(url);
      Logger.log(`✅ Row ${i + 1}: Found thread ID and updated`);
    } else {
      Logger.log(`❌ Row ${i + 1}: No matching thread found`);
    }
  }
}
