/**
 * Donna's Unstoppable Job Tracker v2.1
 * Cleaned, validated, and running like a champ.
 */

// --- Utility: Clean Company Name ---
function cleanCompanyName(name) {
  if (!name) return "???";
  
  // Remove common prefixes/suffixes
  name = name
    .replace(/^the\s+/i, '')
    .replace(/^no reply\W*/i, '')
    .replace(/^do.?not.?reply\W*/i, '')
    .replace(/\s*(llc|inc|corp|co|lp|group|holding|solutions)\.?$/i, '')
    .replace(/[^a-zA-Z0-9 &,\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Extract from parentheses if present (e.g., "WWT (World Wide Technology)")
  const parenMatch = name.match(/\((.*?)\)/);
  if (parenMatch) name = parenMatch[1];
  
  // Capitalize properly
  name = name.toLowerCase().replace(/\b([a-z])/g, (_, l) => l.toUpperCase());
    
  return name || "???";
}

// --- Utility: Clean Extracted Job Title ---
function cleanExtractedText(text) {
  if (!text) return "???";
  return text
    .replace(/^the /i, "")
    .replace(/^(position|role) of /i, "")
    .replace(/\b(position|role)\b/gi, "")
    .replace(/[-–]\s*(remote|hybrid|full[- ]?time|part[- ]?time)/i, "")
    .replace(/[^a-zA-Z0-9 &\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "???";
}
/** 
 * Extracts the job title from an email subject and snippet using common patterns.
 * @param {string} subject - The email subject line.
 * @param {string} snippet - A snippet or excerpt of the email body.
 * @return {string} The extracted job title, or "???" if not found.
 */
function extractJobTitle(subject, body) {
  subject = subject || "";
  body = body || "";

  const patterns = [
    /application for (.*?) at/i,
    /for the (.*?) position at/i,
    /for (.*?) role at/i,
    /applied to (.*?) at/i,
    /application(?: received| submitted) for (.*?) position/i,
    /thank you for applying (?:to|for) the? (.*?) position/i,
    /title[:\-]\s*(.*?)(?: at|\n|$)/i,
    /application update for (.+?) role/i
  ];

  for (const pattern of patterns) {
    const m = subject.match(pattern) || body.match(pattern);
    if (m && m[1]) return cleanExtractedText(m[1]);
  }

  // Last resort: use subject as title only if it doesn't look generic
  if (!/^re:|^fwd:|thank you|application|applied|received|confirmation/i.test(subject)) {
    return cleanExtractedText(subject);
  }
  return "???";
}



function extractCompanyName(from, subject, body) {
  const email = from.match(/<(.+?)>/)?.[1] || from;
  const cleanFrom = email.split("@")[0];

  const patterns = [
    /at ([\w &\-\.]+)/i,
    /with ([\w &\-\.]+)/i,
    /application to ([\w &\-\.]+)/i,
    /position at ([\w &\-\.]+)/i,
    /@([\w\-]+)\./i
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern) || body.match(pattern) || from.match(pattern);
    if (match && match[1]) {
      return cleanCompanyName(match[1]);
    }
  }

  return cleanCompanyName(cleanFrom);
}
function processEmail(from, subject, body) {
  // Null-safety
  from = from || "";
  subject = subject || "";
  body = body || "";

  // Skip self-sent (keep this here)
  const selfEmail = Session.getActiveUser().getEmail();
  const fromEmailMatch = from.match(/<(.+?)>/);
  const fromEmail = fromEmailMatch ? fromEmailMatch[1] : from.trim();
  if (fromEmail === selfEmail) {
    Logger.log(`⚠️ Skipping self-sent email: ${from}`);
    return null;
  }

  // === Handler routing (ALWAYS pass body) ===
  if (from.includes("linkedin.com"))       return handleLinkedInEmail(subject, body);
  if (from.includes("jobhire.tech"))       return handleJobHireEmail(from, subject, body);
  if (from.includes("ashbyhq.com"))        return handleAshbyEmail(subject, body);
  if (from.includes("ziprecruiter.com"))   return handleZipRecruiterEmail(subject, body);
  if (from.includes("workday.com"))        return handleWorkdayEmail(subject, body);
  if (from.includes("lorienglobal.com"))   return handleLorienEmail(subject, body);
  if (typeof handleExperisEmail === "function" && from.includes("experis.com")) {
    return handleExperisEmail(subject, body);
  }

  // Generic fallback
  return {
    title: extractJobTitle(subject, body),
    company: extractCompanyName(from, subject, body),
    status: getStatusFromText(subject + " " + body)
  };
}


// ---- Generic Fallback ----
function genericFallback(from, subject, body) {
  return {
    title: extractJobTitle(subject, body),
    company: extractCompanyName(from, subject, body),
    status: (typeof getStatusFromText === "function")
      ? getStatusFromText(subject + " " + body)
      : determineStatus((subject + " " + body).toLowerCase())
  };
}

function reclassifyAndTagEmails() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const numRows = data.length;

  for (let rowIndex = 2; rowIndex <= numRows; rowIndex++) {
    const [
      timestamp,
      sender,
      subject,
      companyCell,
      titleCell,
      statusCell,
      body,
      tagged,
      label,
      url,
    ] = data[rowIndex - 1];

    if (tagged === "Yes") continue;

    const threadId = extractThreadId(url);
    const message = getFirstMessageFromThread(threadId);
    if (!message) continue;

    const bodyText = message.getPlainBody();

    // 🔥 Auto-flag known spammy sources
    const spammySources = ["glassdoor.com", "ziprecruiter.com", "indeed.com", "jobcase.com", "monster.com"];
    if (spammySources.some(spam => sender.toLowerCase().includes(spam))) {
      sheet.getRange(rowIndex, 6).setValue("Spam");
      sheet.getRange(rowIndex, 9).setValue("Yes");
      Logger.log(`🚫 Row ${rowIndex} flagged as spam: ${sender}`);

      try {
        const spamLabel = GmailApp.getUserLabelByName("Spam") || GmailApp.createLabel("Spam");
        if (threadId) {
          GmailApp.getThreadById(threadId).addLabel(spamLabel);
        }
      } catch (e) {
        Logger.log(`⚠️ Could not tag thread ${threadId} as Spam: ${e}`);
      }

      continue;
    }

    let result;
    try {
      result = processEmail(sender, subject, bodyText);
    } catch (err) {
      Logger.log(`⚠️ Error processing email on row ${rowIndex}: ${err}`);
      continue;
    }

    if (!result || !result.title || !result.company) {
      Logger.log(`⚠️ Row ${rowIndex}: Couldn't extract job info.`);
      continue;
    }

    const { title, company } = result;

    sheet.getRange(rowIndex, 4).setValue(company || "???");
    sheet.getRange(rowIndex, 5).setValue(title || "???");
    const status = determineStatus(bodyText);
    sheet.getRange(rowIndex, 6).setValue(status || "???");
    sheet.getRange(rowIndex, 9).setValue("Yes");

    Logger.log(`✅ Row ${rowIndex} updated: ${company} - ${title} - ${status}`);

    const msgId = message.getId();
    if (msgId && msgId.trim()) {
      try {
        const msg = GmailApp.getMessageById(msgId.trim());
        const thread = msg.getThread();
        const label = GmailApp.getUserLabelByName(status) || GmailApp.createLabel(status);
        label.addToThread(thread);
        Logger.log(`📌 Tagged ${msgId} with "${status}"`);
      } catch (e) {
        Logger.log(`❌ Error getting thread ${msgId}: ${e}`);
      }
    } else {
      Logger.log(`❌ Skipped tagging due to invalid or missing msgId`);
    }

    try {
      if (threadId) {
        const jobLabel = GmailApp.getUserLabelByName("jobsearch") || GmailApp.createLabel("jobsearch");
        GmailApp.getThreadById(threadId).addLabel(jobLabel);
      }
    } catch (e) {
      Logger.log(`⚠️ Couldn't tag ${threadId} with 'jobsearch': ${e}`);
    }
  }

  colorCodeJobTrackerRows(sheet);
}
function colorCodeJobTrackerRows(sheet) {
  const data = sheet.getDataRange().getValues();
  const statusIndex = data[0].indexOf("Status");

  for (let i = 1; i < data.length; i++) {
    const status = (data[i][statusIndex] || "").toString().toLowerCase();
    const range = sheet.getRange(i + 1, 1, 1, sheet.getLastColumn());

    if (status.includes("interview")) {
      range.setBackground("#d9ead3"); // greenish
    } else if (status.includes("rejected") || status === "spam") {
      range.setBackground("#f4cccc"); // reddish
    } else if (status.includes("submitted")) {
      range.setBackground("#cfe2f3"); // bluish
    } else {
      range.setBackground("#ffffff"); // default
    }
  }
}
console = {
  log: (...args) => Logger.log(args.join(" "))
};