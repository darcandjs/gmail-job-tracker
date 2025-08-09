/**
 * Email fetching and processing functions
 * @file Handles retrieving emails from Gmail and processing them
 */

/**
 * Fetches and processes job application emails from last 4 weeks
 */
function fetch4Weeks() {
  const {sheet, spamSheet} = getSheets();
  if (!sheet) {
    Logger.log("❌ 'Job Tracker' sheet not found");
    return;
  }

  // Get existing URLs to avoid duplicates
  const existingUrls = getExistingUrls(sheet, 7); // URL is column 8 (0-based index 7)
  
  // Search for recent threads
  const threads = GmailApp.search('newer_than:4w in:anywhere');
  Logger.log(`🔍 Found ${threads.length} threads in last 4 weeks`);

  // Process each thread
  threads.forEach(thread => {
    const {firstMsg, from, subject, body, threadUrl} = extractMessageDetails(thread);
    
    // Skip duplicates
    if (existingUrls.has(threadUrl)) {
      Logger.log(`↩️ Skipping duplicate: ${threadUrl}`);
      return;
    }

    // Check for spam
    const spamReason = getSpamFlag(from, subject, body);
    if (spamReason) {
      logAndRecordSpam(spamSheet, firstMsg, subject, body, from, threadUrl, spamReason);
      return;
    }

    // Process the email
    const result = processEmail(from, subject, body);
    if (!result) {
      Logger.log("⚠️ Skipping - processEmail returned null");
      return;
    }

    // Append to sheet
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
    
    Logger.log(`✅ Added: ${result.title} @ ${result.company}`);
  });

  Logger.log("🎉 Finished processing 4 weeks of emails");
}

/**
 * Fetches emails from specified label and processes them
 * @param {string} [labelName="_____JOBAPPS_____"] - Gmail label to search
 * @param {number} [daysBack=3] - Number of days to look back
 */
function fetchFromLabel(labelName = "_____JOBAPPS_____", daysBack = 3) {
  const {sheet, spamSheet} = getSheets();
  if (!sheet || !spamSheet) {
    Logger.log("❌ Required sheets not found");
    return;
  }

  // Get existing URLs to avoid duplicates
  const existingUrls = getExistingUrls(sheet, 7);
  
  // Get recent labeled threads
  const threads = getRecentLabeledThreads(labelName, daysBack);
  Logger.log(`🔍 Found ${threads.length} labeled threads`);

  // Process each thread
  threads.forEach(thread => {
    const {firstMsg, from, subject, body, threadUrl} = extractMessageDetails(thread);
    
    // Skip duplicates
    if (existingUrls.has(threadUrl)) {
      Logger.log(`↩️ Skipping duplicate: ${threadUrl}`);
      return;
    }

    // Check for spam
    const spamReason = getSpamFlag(from, subject, body);
    if (spamReason) {
      logAndRecordSpam(spamSheet, firstMsg, subject, body, from, threadUrl, spamReason);
      return;
    }

    // Process the email
    const result = processEmail(from, subject, body);
    if (!result) {
      Logger.log("⚠️ Skipping - processEmail returned null");
      return;
    }

    // Append to sheet
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
    
    Logger.log(`✅ Added: ${result.title} @ ${result.company}`);
  });

  Logger.log("🎉 Finished processing labeled emails");
}

/**
 * Sends daily summary of job applications
 */
function sendDailySummary() {
  const applications = fetchRecentJobApplications();
  if (!applications.length) {
    Logger.log("📭 No job applications in last 24 hours");
    return;
  }

  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy");
  let message = `🗓️ Daily Job Application Summary – ${dateStr}\n\n`;

  applications.forEach(app => {
    message += `📌 ${app.jobTitle} at ${app.company} – ${app.status}\n`;
  });

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: `Your Daily Job Application Summary – ${dateStr}`,
    body: message
  });

  Logger.log("✅ Summary email sent");
}

/**
 * Fetches recent job applications from Gmail
 * @return {Array} Array of application objects
 */
function fetchRecentJobApplications() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  const existingUrls = getExistingUrls(sheet, 7);
  const threads = GmailApp.search('newer_than:1d (subject:applied OR subject:application OR subject:interview)');
  const results = [];

  threads.forEach(thread => {
    const {firstMsg, from, subject, body, threadUrl} = extractMessageDetails(thread);
    
    // Skip duplicates and spam
    if (existingUrls.has(threadUrl) || isSpammySource(from) || isSpammySubject(subject)) {
      return;
    }

    // Process email
    const result = processEmail(from, subject, body);
    if (!result || !result.title || !result.company) {
      return;
    }

    // Add to sheet
    sheet.appendRow([
      firstMsg.getDate(),
      result.title,
      result.company,
      result.status || "Submitted",
      subject,
      body,
      from,
      threadUrl
    ]);

    results.push({
      jobTitle: result.title,
      company: result.company,
      status: result.status
    });
  });

  return results;
}