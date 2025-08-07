// fetch.gs — CLEANED & MODULARIZED 🧼

function fetchFromLabel() {
  const { sheet, spamSheet } = getSheets();
  if (!sheet || !spamSheet) return;

  const existingUrls = getExistingUrls(sheet, 7);
  const threads = getRecentLabeledThreads("_____JOBAPPS_____", 3); // last 3 days only

  for (const thread of threads) {
    const { firstMsg, from, subject, body, threadUrl } = extractMessageDetails(thread);
    if (isSpammySource(from)) {
      logAndRecordSpam(spamSheet, firstMsg, subject, body, from, threadUrl);
      continue;
    }

    console.log(`Processing: FROM=${from}, SUBJECT=${subject}`);
    const result = processEmail(from, subject, body);
    if (!result) {
      console.log("⚠️ processEmail returned null — skipping.");
      continue;
    }

    const { title, company, status } = result;
    if (!title && !company) continue;

    sheet.appendRow([firstMsg.getDate(), title || "", company || "", status || "Submitted", subject, body, from, threadUrl]);
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
