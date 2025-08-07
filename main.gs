/**
 * Donna's Unstoppable Job Tracker v2.1
 * Cleaned, validated, and running like a champ.
 */

// --- Utility: Clean Company Name ---
function cleanCompanyName(name) {
  if (!name) return "???";
  name = name.replace(/[^a-zA-Z0-9 &\\-]/g, "").replace(/\s+/g, ' ').trim();

  if (name.startsWith("reply to email")) {
    const parts = name.split(" ");
    for (let i = 3; i < parts.length; i++) {
      if (!parts[i].includes("@") && parts[i] !== "com") {
        return cleanCompanyName(parts.slice(i).join(" "));
      }
    }
  }

  name = name.replace(/\.?com$/i, "").trim();
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
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
function extractJobTitle(subject, snippet) {
  let jobTitle = "";
  if (!snippet) snippet = "";
  if (!subject) subject = "";
  
  // Some emails (e.g. jobhire.tech forwards) include a prefix like "[reply to email ...]".
  // Remove such prefixes from subject for cleaner parsing:
  let cleanSubject = subject.replace(/^\[reply to email [^\]]+\]\s*/i, "");
  
  // Define regex patterns for common phrases containing the job title:
  const patterns = [
    /Thank you for applying to (?:the\s*)?(.+?) position at/i,         // e.g. "Thank you for applying to the Software Engineer position at Company"
    /Thank you for applying for the (.+?) position/i,                  // e.g. "Thank you for applying for the Data Scientist position"
    /Thank you for your interest in the (.+?) position/i,              // e.g. "interest in the Product Manager position"
    /We have received your application for the (.+?) position/i,       // e.g. "received your application for the Sales Associate position"
    /application for the position of (.+?)\b/i,                        // e.g. "application for the position of Software Engineer"
    /applying for our (.+?) opening/i,                                 // e.g. "applying for our Senior Analyst opening"
    /for the (.+?) role\b/i,                                           // e.g. "applying for the Developer role" or "for the Developer role at"
    /for the (.+?) position\b/i,                                       // e.g. "for the Technician position" (covers variations without 'at')
    /applied for the (.+?) at/i,                                       // e.g. "You applied for the Data Engineer at Company"
    /Your application to .* for (.+?) (?:has|was)/i                    // e.g. "Your application to Company for Software Engineer has been received"
  ];
  
  // Try each pattern on the email snippet text:
  for (const regex of patterns) {
    const match = snippet.match(regex);
    if (match) {
      jobTitle = match[1].trim();
      break;
    }
  }
  
  // Fallback: if not found in snippet, try patterns on the subject line as well.
  if (!jobTitle) {
    for (const regex of patterns) {
      const matchSub = cleanSubject.match(regex);
      if (matchSub) {
        jobTitle = matchSub[1].trim();
        break;
      }
    }
  }
  
  // Additional fallback: if subject looks like it contains the title (e.g. subject is just the job title or includes it plainly).
  if (!jobTitle) {
    // If the clean subject is not a reply/forward and not a generic confirmation, assume it might be the job title.
    if (cleanSubject && !/^re:|^fwd:|thank you|application|applied/i.test(cleanSubject)) {
      // Use the subject as title (for cases where subject is literally the job title or includes it).
      jobTitle = cleanSubject;
    }
  }
  
  return jobTitle || "???";
}


function extractCompanyName(from, subject, snippet) {
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
    const match = subject.match(pattern) || snippet.match(pattern) || from.match(pattern);
    if (match && match[1]) {
      return cleanCompanyName(match[1]);
    }
  }

  return cleanCompanyName(cleanFrom);
}
function processEmail(from, subject, snippet) {
  from = from.toLowerCase();
  const text = (subject + " " + snippet).toLowerCase();

  const spammySources = [
    "glassdoor.com", 
    "alerts@ziprecruiter.com", 
    "ziprecruiter.com",
    "indeed.com",
    "jobcase.com",
    "monster.com"
  ];

  if (spammySources.some(spam => from.includes(spam))) {
    Logger.log(`⚠️ Skipping non-application email from: ${from}`);
    return null;
  }

  if (from.includes("linkedin.com")) return handleLinkedInEmail(subject, snippet);
  if (from.includes("jobhire.tech")) return handleJobHireEmail(subject, snippet);
  if (from.includes("ashbyhq.com")) return handleAshbyEmail(subject, snippet);
  if (from.includes("ziprecruiter.com")) return handleZipRecruiterEmail(subject, snippet);
  if (from.includes("workday.com")) return handleWorkdayEmail(subject, snippet);
  if (from.includes("lorienglobal.com")) return handleLorienEmail(subject, snippet);
  if (from.includes("experis.com")) return handleExperisEmail(subject, snippet);

  return {
    title: extractJobTitle(subject, snippet),
    company: extractCompanyName(from, subject, snippet),
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
      snippet,
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
