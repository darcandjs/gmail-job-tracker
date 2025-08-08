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
  if (!name || typeof name !== "string") return "???";   // ✅ guard

  name = name.replace(/\[.*?\]/g, "");
  name = name.replace(/[^a-zA-Z0-9 &.,\-]/g, "").replace(/\s+/g, " ").trim();
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

function getStatusFromText(text) {
  const t = (text || "").toLowerCase();

  // Rejected
  if (t.includes("unfortunately") || t.includes("move forward with other")) return "Rejected";

  // Interview
  if (t.includes("interview") || t.includes("next step") || t.includes("schedule")) return "Interview";

  // To Do
  if (
    t.includes("self identification") ||
    t.includes("eeo form") ||
    t.includes("complete your application") ||
    t.includes("action needed") ||
    t.includes("assigned to your file") ||
    t.includes("candidate zone")
  ) return "To Do";

  // Submitted (default)
  if (t.includes("thank you for applying") || t.includes("we have received your application")) return "Submitted";

  return "Submitted";
}

// Backward-compatible alias
function getStatusFromSnippet(s) {
  return getStatusFromText(s);
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
  const firstMsg = thread.getMessages()[0];
  const from = firstMsg.getFrom();
  const subject = firstMsg.getSubject();
  const threadUrl = `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`;

  const rawBody = firstMsg.getBody();       // HTML body
  const body = cleanEmailBody(rawBody);     // to text, truncated

  return { firstMsg, from, subject, body, threadUrl };
}

function cleanEmailBody(html) {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
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

// =========================
// Status Detection Utilities
// =========================

// Optional: flip to true while debugging to see which rule hit
var LOG_STATUS_DEBUG = false;

function getStatusFromText(text) {
  const t = (text || "").toLowerCase();

  // --- 1) REJECTED (check first; most definitive) ---
  const REJECT_TERMS = [
    "unfortunately", "regret to inform", "we regret to inform",
    "we will not be moving forward", "we're not moving forward",
    "not moving forward", "we won't be proceeding",
    "we have decided to move forward with other", "pursue other applicants",
    "another candidate", "more qualified candidates",
    "position has been filled", "role has been filled", "position filled",
    "position is closed", "requisition closed", "no longer considering",
    "application unsuccessful"
  ];
  if (hasAny(t, REJECT_TERMS)) return logStatus("Rejected", "REJECT_TERMS");

  // --- 2) TO DO (forms, portals, set up accounts, assessments, etc.) ---
  // Prioritize To Do over Interview to avoid “Next step: complete profile” false hits
  const TODO_TERMS = [
    // Account / portal / profile
    "create a profile", "create your profile", "candidate profile",
    "candidate zone", "talent portal", "candidate portal", "login to your account",
    "log in to your account", "sign in to your account", "set a password",
    "set your password", "reset your password", "activate your account",
    "update your profile", "update profile",
    // Complete application items
    "complete your application", "complete the application",
    "finish your application", "finish application", "action needed",
    "additional information required", "additional details required",
    "assigned to your file", "please complete", "please finalize",
    "outstanding items", "incomplete application",
    // Compliance / self-ID
    "self identification", "self-identification", "voluntary self identification",
    "eeo form", "eeo survey", "disability self identification",
    // Assessments / tests / scheduling links for tasks (not interviews)
    "assessment", "skills test", "aptitude test", "questionnaire",
    "coding challenge", "hackerrank", "codility",
    // Document requests
    "upload your resume", "upload documents", "provide references",
    "background check authorization", "consent form"
  ];
  if (hasAny(t, TODO_TERMS)) return logStatus("To Do", "TODO_TERMS");

  // --- 3) INTERVIEW (phone screens, recruiter chats, scheduling)
  // Note: Put this AFTER To Do to avoid "Next step: complete X" mislabels
  const INTERVIEW_TERMS = [
    "interview", "phone screen", "screening call",
    "chat with", "speak with", "conversation with", "meet with",
    "schedule a call", "schedule time", "book a time", "book time",
    "calendar link", "calendly", "find time to connect",
    "availability to talk", "your availability",
    "next step will be an interview", "next steps will be an interview",
    "move to interview", "invite to interview", "interview invitation"
  ];
  if (hasAny(t, INTERVIEW_TERMS)) return logStatus("Interview", "INTERVIEW_TERMS");

  // --- 4) SUBMITTED (confirmation / acknowledgment)
  const SUBMITTED_TERMS = [
    "thank you for applying", "thanks for applying", "we have received your application",
    "your application has been received", "application received", "application submitted",
    "we received your application", "acknowledgement", "confirmation of your application",
    "has been submitted"
  ];
  if (hasAny(t, SUBMITTED_TERMS)) return logStatus("Submitted", "SUBMITTED_TERMS");

  // Default
  return logStatus("Submitted", "DEFAULT");
}

// Back-compat alias so you don’t have to touch older calls:
function getStatusFromSnippet(s) {
  return getStatusFromText(s);
}

// Tiny helpers
function hasAny(text, terms) {
  for (var i = 0; i < terms.length; i++) {
    if (text.indexOf(terms[i]) !== -1) return true;
  }
  return false;
}

function logStatus(status, bucket) {
  if (LOG_STATUS_DEBUG) Logger.log("🧭 Status=" + status + " via " + bucket);
  return status;
}

function getSpamFlag(from, subject, body) {
  from = (from || "").toLowerCase();
  subject = subject || "";
  body = body || "";

  // Domains/senders that should be skipped
  const spammySources = [
    "glassdoor.com", "alerts@ziprecruiter.com", "ziprecruiter.com",
    "adzuna.com", "theladders.com", "bounce.recruiter.com",
    "workopolis.com", "careerbuilder.com", "jobcase.com", "monster.com",
    "workablemail.com", "do-not-reply@ziprecruiter.com",
    "email.ourcareerplace.com", "message.get.it", "higherhireemail.com",
    "uopeople.edu" // University of the People (per Donna)
  ];
  if (spammySources.some(s => from.includes(s))) {
    return "Spammy sender domain";
  }

  const lowerSubj = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  // Subject triggers
  const subjectTriggers = [
    "check out new opportunities at",
    "urgent hiring",
    "hot openings",
    "immediate openings",
    "work from home job offer",
    "find your next job",
    "donotreply@jobspresso",
    "newsletter",
    "unlock new doors"
  ];
  if (subjectTriggers.some(t => lowerSubj.includes(t))) {
    return "Spammy subject";
  }

  // Body triggers (lightweight)
  const bodyTriggers = [
    "new jobs for you",
    "top picks for you",
    "job matches for you",
    "see jobs now",
    "recommended jobs",
    "daily job alerts",
    "weekly job"
  ];
  if (bodyTriggers.some(t => lowerBody.includes(t))) {
    return "Marketing blast (body)";
  }

  return null; // Not spammy
}

function logAndRecordSpam(spamSheet, msg, subject, body, from, url, reason) {
  console.log(`⚠️ Skipped spam: ${from} — ${reason}`);
  spamSheet.appendRow([
    msg.getDate(), "", "", `Skipped - ${reason}`, subject, body, from, url
  ]);
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
const colBody = headers.indexOf("Body");

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
      const body = row[colBody] || "";
      const inferredTitle = extractJobTitle(subject, body);

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

