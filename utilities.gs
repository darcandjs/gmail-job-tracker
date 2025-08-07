function clearJobDataTabs() {
  const sheetNames = ["Job Tracker", "Spammy"];
  sheetNames.forEach(name => clearSheetDataOnly(name));
}

function clearSheetDataOnly(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`❌ Sheet '${sheetName}' not found`);
    return;
  }

  const lastRow = sheet.getLastRow();
  const frozenRows = sheet.getFrozenRows();

  if (lastRow > frozenRows) {
    const range = sheet.getRange(frozenRows + 1, 1, lastRow - frozenRows, sheet.getMaxColumns());
    range.clearContent();
    Logger.log(`🧹 Cleared data from '${sheetName}' (rows ${frozenRows + 1} to ${lastRow})`);
  } else {
    Logger.log(`ℹ️ Nothing to clear in '${sheetName}'`);
  }
}


// --- Utility: Clean Company Name ---
function cleanCompanyName(name) {
  if (!name || typeof name !== "string") return "???";

  // Remove any bracketed junk like [reply to email...]
  name = name.replace(/\[.*?\]/g, "");

  // Allow common punctuation & clean noise
  name = name
    .replace(/[^a-zA-Z0-9 &.,\-]/g, "") // keep &, ., -, and commas
    .replace(/\s+/g, " ")               // normalize whitespace
    .trim();

  // Fix camelCase to Camel Case
  name = name.replace(/([a-z])([A-Z])/g, "$1 $2");

  return name;
}




  
// --- Utility: Clean Extracted Job Title ---
function cleanExtractedText(text) {
  if (!text) return "???";
  return text
    .replace(/^the /i, "")
    .replace(/^(position|role) of /i, "")
    .replace(/\b(position|role)\b/gi, "")
    .replace(/[-–]\s*(remote|hybrid|full[- ]?time|part[- ]?time)/i, "")
    .replace(/[^a-zA-Z0-9 &\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "???";
}
    

function extractThreadId(url) {
  if (!url) return null;
  const match = url.match(/#inbox\/([a-f0-9]+)/i);
  return match ? match[1] : null;
}

function getFirstMessageFromThread(threadId) {
  if (!threadId || typeof threadId !== "string") {
    Logger.log(`❌ Skipped: Invalid or missing threadId: ${threadId}`);
    return null; 
  }
  
  try {
    const thread = GmailApp.getThreadById(threadId);
    if (thread) {
      const messages = thread.getMessages();
      return messages.length > 0 ? messages[0] : null;
    }
  } catch (e) {
    Logger.log(`❌ Error getting thread ${threadId}: ${e}`);
  } 
      
  return null; 
}  

// Ensure this helper exists or is imported
function getStatusFromSnippet(snippet) {
  const lowered = snippet.toLowerCase();

  // Rejection indicators
  const rejectionPhrases = [
    "unfortunately", 
    "we have decided to move forward", 
    "position has been filled", 
    "we’ve chosen other candidates",
    "we regret to inform you",
    "not selected",
    "we have filled the position"
  ];

  // Interview indicators
  const interviewPhrases = [
    "congratulations", 
    "we’d like to move forward",
    "next step", 
    "schedule an interview", 
    "invited to interview"
  ];

  // Check rejection first
  if (rejectionPhrases.some(phrase => lowered.includes(phrase))) return "Rejected";

  if (interviewPhrases.some(phrase => lowered.includes(phrase))) return "Interview";

  // Default catch-all
  if (
    lowered.includes("thank you for applying") || 
    lowered.includes("we have received your application") || 
    lowered.includes("your application has been received")
  ) return "Submitted";

  return "Submitted"; // fallback
}

// === UTILITIES (Move to utilities.gs if desired) ===
function getSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    sheet: ss.getSheetByName("Job Tracker"),
    spamSheet: ss.getSheetByName("Spammy")
  };
}

function getExistingUrls(sheet, colIndex) {
  const data = sheet.getDataRange().getValues();
  const set = new Set();
  for (let i = 1; i < data.length; i++) {
    const url = data[i][colIndex];
    if (url) set.add(url.toString().trim());
  }
  return set;
}

function getRecentLabeledThreads(labelName, daysBack) {
  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    console.log(`Label '${labelName}' does not exist.`);
    return [];
  }
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  return label.getThreads().filter(thread => thread.getLastMessageDate() >= cutoff);
}

function extractMessageDetails(thread) {
  const msg = thread.getMessages()[0];
  return {
    firstMsg: msg,
    from: msg.getFrom(),
    subject: msg.getSubject(),
    snippet: msg.getPlainBody().slice(0, 300),
    threadUrl: `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`
  };
}

function isSpammySource(from) {
  const lowered = from.toLowerCase();

  // Specific spammy full addresses
  const spammyEmails = [
    "alerts@ziprecruiter.com",
    "jobalerts@indeed.com",
    "alerts@indeed.com",
    "no-reply@indeed.com",
    "ads@glassdoor.com",
    "alerts@higherhireemail.com",
    "donotreply@jobspresso.com"
  ];

  // Spammy domains that send mass job alerts or marketing
  const spammyDomains = [
    "adzuna.com",
    "theladders.com",
    "bounce.recruiter.com",
    "workopolis.com",
    "message.get.it",
    "higherhireemail.com"
  ];

  // Block if exact spammy email matches
  if (spammyEmails.includes(lowered)) return true;

  // Block if domain appears in from address
  if (spammyDomains.some(domain => lowered.includes(domain))) return true;

  return false;
}

function isSpammySubject(subject) {
  const lower = subject.toLowerCase();

  const spammyPhrases = [
    "check out new opportunities at",
    "urgent hiring",
    "hot openings",
    "immediate openings",
    "newsletter",
    "work from home job offer",
    "find your next job",
    "apply now",
    "top job matches",
    "your next opportunity",
    "weekly job list",
    "job alert",
    "interested in a new job",
    "hiring immediately",
    "remote job of the week"
  ];

  return spammyPhrases.some(phrase => lower.includes(phrase));
}



function logAndRecordSpam(spamSheet, msg, subject, snippet, from, url) {
  let reason = "Spammy Source";

  if (isSpammySubject(subject)) {
    reason = "Spammy Subject";
  } else if (isSpammySource(from)) {
    reason = "Spammy Sender";
  }

  const statusNote = `Skipped - ${reason}`;
  console.log(`⚠️ Skipped spammy email (${reason}): ${from}`);

  spamSheet.appendRow([
    msg.getDate(),
    "", "", statusNote, // Title, Company, Status
    subject,
    snippet,
    from,
    url
  ]);
}

function writeLogToDrive(logContent, filename = "JobTracker_Log.txt") {
  const folder = DriveApp.getRootFolder(); // Or use a specific folder if you want
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm-ss");
  const file = folder.createFile(`${filename}_${timestamp}.txt`, logContent, MimeType.PLAIN_TEXT);
  Logger.log(`📝 Log saved to Drive: ${file.getUrl()}`);
}



/**
 * Scans the sheet for rows with "???" as Job Title and backfills them using Subject/Snippet.
 */
function backfillMissingTitles() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Job Tracker"); // ✅ Update this if your tab has a different name
  if (!sheet) {
    Logger.log("❌ Sheet not found. Double check the tab name.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return;

  const headers = data[0];
  const colTitle = headers.indexOf("Job Title");          // ✅ Update based on your actual header
  const colSubject = headers.indexOf("Subject");
  const colSnippet = headers.indexOf("Snippet");   // ✅ Might be "Snippet" or something else

  if (colTitle === -1 || colSubject === -1 || colSnippet === -1) {
    Logger.log("❌ Required columns not found. Check column names.");
    return;
  }

  const updates = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const existingTitle = (row[colTitle] || "").trim();

    if (!existingTitle || existingTitle === "???") {
      const subject = row[colSubject] || "";
      const snippet = row[colSnippet] || "";
      const inferredTitle = extractJobTitle(subject, snippet);

      if (inferredTitle && inferredTitle !== "???") {
        updates.push({ rowIndex: i + 1, title: inferredTitle });
      }
    }
  }

  updates.forEach(update => {
    sheet.getRange(update.rowIndex, colTitle + 1).setValue(update.title);
  });

  Logger.log(`✅ Backfilled ${updates.length} missing job titles.`);
}

