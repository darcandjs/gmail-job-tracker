function fetchJune2025() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Output sheet (create if missing) + headers
  const outName = "June 2025 Tracker";
  const sheet = ss.getSheetByName(outName) || ss.insertSheet(outName);
  const headers = ["Date", "Title", "Company", "Status", "Subject", "Body", "From", "URL"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);

  // Spammy sheet (create if missing)
  const spamSheet = ss.getSheetByName("Spammy") || ss.insertSheet("Spammy");
  if (spamSheet.getLastRow() === 0) spamSheet.appendRow(headers);

  // Existing URLs to avoid dupes (URL is column 8 -> index 7)
  const existing = new Set();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const url = data[i][7];
    if (url) existing.add(String(url).trim());
  }

  // Gmail query: only June 2025
  const query = 'label:_____JOBAPPS_____ after:2025/05/31 before:2025/07/01';
  const threads = GmailApp.search(query);
  Logger.log(`🔎 Found ${threads.length} threads for June 2025`);

  for (const thread of threads) {
    // You already have this helper; it returns { firstMsg, from, subject, body, threadUrl }
    const { firstMsg, from, subject, body, threadUrl } = extractMessageDetails(thread);

    if (existing.has(threadUrl)) {
      Logger.log(`↩️  Skipping duplicate: ${threadUrl}`);
      continue;
    }

    // One spam gate; logs reason to Spammy
    const reason = (typeof getSpamFlag === "function") ? getSpamFlag(from, subject, body) : null;
    if (reason) {
      if (typeof logAndRecordSpam === "function") {
        logAndRecordSpam(spamSheet, firstMsg, subject, body, from, threadUrl, reason);
      } else {
        spamSheet.appendRow([firstMsg.getDate(), "", "", `Skipped - ${reason}`, subject, body, from, threadUrl]);
      }
      continue;
    }

    // Parse via your router (must accept from, subject, body)
    const result = processEmail(from, subject, body);
    if (!result) {
      Logger.log("⚠️ processEmail returned null — skipping.");
      continue;
    }

    const { title, company, status } = result;
    sheet.appendRow([
      firstMsg.getDate(),
      title || "",
      company || "",
      status || "Submitted",
      subject,
      body,   // <-- full cleaned body
      from,
      threadUrl
    ]);
    Logger.log(`✅ Added: ${title || "???"} @ ${company || "???"}`);
  }

  Logger.log("🎉 Done importing June 2025.");
}


// fetch.gs — CLEANED & MODULARIZED 🧼

function fetchFromLabel() {
  const { sheet, spamSheet } = getSheets();
  if (!sheet || !spamSheet) return;

  // Column index for URL (0-based index 7 with the header order above)
  const existingUrls = getExistingUrls(sheet, 7);

  // Last 3 days (your current setting)
  //const threads = getRecentLabeledThreads("_____JOBAPPS_____", 3);
const threads = GmailApp.search('label:_____JOBAPPS_____ after:2025/05/31 before:2025/07/01');
//const juneSheet = ss.getSheetByName('June 2025 Tracker') || ss.insertSheet('June 2025 Tracker');



  for (const thread of threads) {
    const { firstMsg, from, subject, body, threadUrl } = extractMessageDetails(thread);

    if (existingUrls.has(threadUrl)) {
      console.log(`Skipping duplicate thread: ${threadUrl}`);
      continue;
    }

    // ✅ One gate for spam; logs to Spammy with reason
    const reason = getSpamFlag(from, subject, body);
    if (reason) {
      logAndRecordSpam(spamSheet, firstMsg, subject, body, from, threadUrl, reason);
      continue;
    }

    console.log(`Processing: FROM=${from}, SUBJECT=${subject}`);

    // ✅ IMPORTANT: pass body (not snippet)
    const result = processEmail(from, subject, body);
    if (!result) {
      console.log("⚠️ processEmail returned null — skipping.");
      continue;
    }

    const { title, company, status } = result;
    if (!title && !company) continue;

    // ✅ Append in the exact column order that matches your sheet
    sheet.appendRow([
      firstMsg.getDate(),
      title || "",
      company || "",
      status || "Submitted",
      subject,
      body,       // <-- make sure this is column 6 in your sheet
      from,
      threadUrl
    ]);

    console.log(`✅ Added new row: ${title} at ${company}`);
  }
}



function fetch4Weeks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  const existingUrls = getExistingUrls(sheet, 6);
  const threads = GmailApp.search('newer_than:4w in:anywhere');
  console.log(`Found ${threads.length} threads in last 4 weeks`);

  for (const thread of threads) {
const { firstMsg, from, subject, body, threadUrl } = extractMessageDetails(thread);
const fullBody = firstMsg.getRawContent?.() || firstMsg.getBody();
    if (existingUrls.has(threadUrl) || isSpammySource(from) || isSpammySubject(subject)) continue;


    const result = processEmail(from, subject, body);
    if (!result) continue;

    const { title, company, status } = result;
    if (!title && !company) continue;

sheet.appendRow([firstMsg.getDate(), title || "", company || "", status || "Submitted", subject, fullBody, from, threadUrl]);
    console.log(`✅ Added new row: ${title} at ${company}`);

    // Collect logs and export
const logData = Logger.getLog(); // Grab all logs from this execution
writeLogToDrive(logData, "JobFetchLogs");
  }
}

function sendDailySummary() {
  const applications = fetchRecentJobApplications();
  if (!applications.length) {
    Logger.log("📭 No job applications in the last 24 hours.");
    return;
  }

  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy");
  let message = `🗓️  Daily Job Application Summary – ${dateStr}\n\n`;

  applications.forEach(app => {
    message += `📌 ${app.jobTitle} at ${app.company} – ${app.status}\n`;
  });

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: `Your Daily Job Application Summary – ${dateStr}`,
    body: message
  });

  Logger.log("✅ Summary sent!");
}

function fetchRecentJobApplications() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  const existingUrls = getExistingUrls(sheet, 6);
  const threads = GmailApp.search('newer_than:4w (subject:applied OR subject:application OR subject:interview OR subject:position)');
  const results = [];

  for (const thread of threads) {
    const { firstMsg, from, subject, snippet, threadUrl } = extractMessageDetails(thread);
    if (existingUrls.has(threadUrl) || isSpammySource(from) || isSpammySubject(subject)) continue;


    const { title, company, status } = processEmail(from, subject, snippet);
    if (!title && !company) continue;

    const row = [new Date(), title || "", company || "", status || "Submitted", subject, from, threadUrl];
    sheet.appendRow(row);
    results.push({ jobTitle: title, company, status });
  }

  return results;
}

function whoAmI() {
  Logger.log("Running as: " + Session.getActiveUser().getEmail());
  Logger.log(GmailApp.getUserLabelByName("Inbox") ? "✅ Gmail access OK" : "❌ No Gmail access");
}
