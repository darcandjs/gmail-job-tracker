// utilities.gs
/**
 * Shared utilities for the Job Tracker system
 * @file Contains all helper functions used across the application
 */

/**
 * Cleans a company name by removing special chars and formatting
 * @param {string} name - Raw company name from email
 * @return {string} Cleaned company name
 */
function cleanCompanyName(name) {
  if (!name) return "???";
  
  return name
    .replace(/^the\s+/i, '')
    .replace(/^no reply\W*/i, '')
    .replace(/\s*(llc|inc|corp|group|holding)\.?$/i, '')
    .replace(/[^a-zA-Z0-9 &\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (_, l) => l.toUpperCase())
    || "???";
}
/**
 * Extracts company from email signatures
 */
function extractCompanyFromSignature(body) {
  const sigMatch = body.match(/(sincerely|regards),?\s*(.+?)\s*(?:team|hr|human resources)/i);
  return sigMatch ? cleanCompanyName(sigMatch[2]) : null;
}
/**
 * Cleans extracted text (job titles, etc.)
 * @param {string} text - Raw text to clean
 * @return {string} Cleaned text
 */
/**
 * Cleans job titles
 */
function cleanExtractedText(text) {
  return (text || "")
    .replace(/^the\s+/i, '')
    .replace(/^(position|role) of /i, '')
    .replace(/\b(position|role)\b/gi, '')
    .replace(/[^a-zA-Z0-9 &\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    || "???";
}

/**
 * Extracts thread ID from Gmail URL
 * @param {string} url - Gmail thread URL
 * @return {string|null} Thread ID or null if invalid
 */
function extractThreadId(url) {
  if (!url) return null;
  const match = url.match(/#inbox\/([a-f0-9]+)/i);
  return match ? match[1] : null;
}

/**
 * Gets first message from a thread
 * @param {string} threadId - Gmail thread ID
 * @return {GmailMessage|null} First message or null if error
 */
function getFirstMessageFromThread(threadId) {
  if (!threadId || typeof threadId !== "string") {
    Logger.log(`❌ Invalid threadId: ${threadId}`);
    return null; 
  }
  
  try {
    const thread = GmailApp.getThreadById(threadId);
    return thread?.getMessages()[0] || null;
  } catch (e) {
    Logger.log(`❌ Error getting thread ${threadId}: ${e}`);
    return null;
  }
}

/**
 * Determines application status from email text
 * @param {string} text - Email body text
 * @return {string} Status (Rejected, To Do, Interview, Submitted)
 */
function getStatusFromText(text) {
  const t = (text || "").toLowerCase();

  // Rejection indicators (most definitive, check first)
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

  // To Do items (forms, portals, etc.)
  const TODO_TERMS = [
    "create a profile", "create your profile", "candidate profile",
    "candidate zone", "talent portal", "candidate portal", "login to your account",
    "log in to your account", "sign in to your account", "set a password",
    "set your password", "reset your password", "activate your account",
    "update your profile", "update profile",
    "complete your application", "complete the application",
    "finish your application", "finish application", "action needed",
    "additional information required", "additional details required",
    "assigned to your file", "please complete", "please finalize",
    "outstanding items", "incomplete application",
    "self identification", "self-identification", "voluntary self identification",
    "eeo form", "eeo survey", "disability self identification",
    "assessment", "skills test", "aptitude test", "questionnaire",
    "coding challenge", "hackerrank", "codility",
    "upload your resume", "upload documents", "provide references",
    "background check authorization", "consent form"
  ];

  // Interview indicators
  const INTERVIEW_TERMS = [
    "interview", "phone screen", "screening call",
    "chat with", "speak with", "conversation with", "meet with",
    "schedule a call", "schedule time", "book a time", "book time",
    "calendar link", "calendly", "find time to connect",
    "availability to talk", "your availability",
    "next step will be an interview", "next steps will be an interview",
    "move to interview", "invite to interview", "interview invitation"
  ];

  // Submission confirmations
  const SUBMITTED_TERMS = [
    "thank you for applying", "thanks for applying", "we have received your application",
    "your application has been received", "application received", "application submitted",
    "we received your application", "acknowledgement", "confirmation of your application",
    "has been submitted"
  ];

  if (REJECT_TERMS.some(term => t.includes(term))) return "Rejected";
  if (TODO_TERMS.some(term => t.includes(term))) return "To Do";
  if (INTERVIEW_TERMS.some(term => t.includes(term))) return "Interview";
  if (SUBMITTED_TERMS.some(term => t.includes(term))) return "Submitted";

  return "Submitted"; // Default fallback
}

// Alias for backward compatibility
function getStatusFromSnippet(snippet) {
  return getStatusFromText(snippet);
}

/**
 * Enhanced email body cleaner
 */
function cleanEmailBody(html) {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|\u00A0/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[͏\u200B]/g, "") // Remove special hidden chars
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts message details from a Gmail thread
 * @param {GmailThread} thread - Gmail thread object
 * @return {Object} Contains message details
 */
function extractMessageDetails(thread) {
  const firstMsg = thread.getMessages()[0];
  return {
    firstMsg,
    from: firstMsg.getFrom(),
    subject: firstMsg.getSubject(),
    body: cleanEmailBody(firstMsg.getBody()),
    threadUrl: `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`
  };
}

/**
 * Checks if email is from a spammy source
 * @param {string} from - Sender email address
 * @return {boolean} True if spammy source
 */
function isSpammySource(from) {
  const lowered = (from || "").toLowerCase();
  
  const spammyDomains = [
    "glassdoor.com", "ziprecruiter.com", "indeed.com",
    "adzuna.com", "theladders.com", "bounce.recruiter.com",
    "workopolis.com", "careerbuilder.com", "jobcase.com",
    "monster.com", "workablemail.com", "higherhireemail.com",
    "message.get.it", "uopeople.edu"
  ];

  return spammyDomains.some(domain => lowered.includes(domain));
}

/**
 * Checks if subject line indicates spam
 * @param {string} subject - Email subject line
 * @return {boolean} True if spammy subject
 */
function isSpammySubject(subject) {
  const lower = (subject || "").toLowerCase();
  
  const spammyPhrases = [
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

  return spammyPhrases.some(phrase => lower.includes(phrase));
}

/**
 * Gets spam detection reason for an email
 * @param {string} from - Sender address
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {string|null} Reason if spammy, otherwise null
 */
function getSpamFlag(from, subject, body) {
  from = (from || "").toLowerCase();
  subject = subject || "";
  body = body || "";

  if (isSpammySource(from)) return "Spammy sender domain";
  
  const lowerSubj = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

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

  const bodyTriggers = [
    "new jobs for you",
    "top picks for you",
    "job matches for you",
    "see jobs now",
    "recommended jobs",
    "daily job alerts",
    "weekly job"
  ];

  if (subjectTriggers.some(t => lowerSubj.includes(t))) return "Spammy subject";
  if (bodyTriggers.some(t => lowerBody.includes(t))) return "Marketing blast (body)";

  return null;
}

/**
 * Logs and records spam emails
 * @param {Sheet} spamSheet - Spreadsheet sheet for spam
 * @param {GmailMessage} msg - Gmail message
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @param {string} from - Sender address
 * @param {string} url - Thread URL
 * @param {string} reason - Spam reason
 */
function logAndRecordSpam(spamSheet, msg, subject, body, from, url, reason) {
  console.log(`⚠️ Skipped spam: ${from} — ${reason}`);
  spamSheet.appendRow([
    msg.getDate(),
    "", // title
    "", // company  
    `Skipped - ${reason}`, // status
    subject,
    body,
    from,
    url
  ]);
}

/**
 * Gets existing URLs from a sheet
 * @param {Sheet} sheet - Spreadsheet sheet
 * @param {number} colIndex - URL column index (0-based)
 * @return {Set} Set of existing URLs
 */
function getExistingUrls(sheet, colIndex) {
  const data = sheet.getDataRange().getValues();
  const set = new Set();
  for (let i = 1; i < data.length; i++) {
    const url = data[i][colIndex];
    if (url) set.add(url.toString().trim());
  }
  return set;
}

/**
 * Gets recent labeled threads
 * @param {string} labelName - Gmail label name
 * @param {number} daysBack - Number of days to look back
 * @return {GmailThread[]} Array of matching threads
 */
function getRecentLabeledThreads(labelName, daysBack) {
  const label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    console.log(`Label '${labelName}' does not exist.`);
    return [];
  }
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  return label.getThreads().filter(thread => 
    thread.getLastMessageDate() >= cutoff
  );
}

/**
 * Gets tracker and spam sheets
 * @return {Object} Contains sheet references
 */
function getSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    sheet: ss.getSheetByName("Job Tracker"),
    spamSheet: ss.getSheetByName("Spammy")
  };
}