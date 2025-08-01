/*
 * Gmail Job Tracker + Airtable Sync
 * Version: v11.8
 * 
 * Scans Gmail for job application emails
 * Extracts Company, Job Title, Status
 * Writes to Google Sheet & syncs with Airtable
 * Sends daily email summary
 * 
 * Setup:
 * - Set up a Sheet named "Job Tracker"
 * - Add headers matching: Date, From, Subject, Company, Job Title, Status, Snippet, Auto-Added, Source, Email Link, Airtable Record ID
 * - Store your Airtable API key and Base ID
 *
 * By: Donna & ChatGPT 💜
 */


const AIRTABLE_API_KEY = 'pati7JS1GDy4dOsRQ.08477a62d8212ba7254827a94ffc73627f6918473864911cdf47fd480759afe2';
const AIRTABLE_BASE_ID = 'appiiW6tpeFrCsy0E';
const AIRTABLE_TABLE_NAME = 'Job Tracker';

// ===== Helper Functions =====
function extractCompanyName(from, subject, snippet) {
  const knownDomains = [
    { keyword: 'ashbyhq', pattern: /thank you for applying to\s+(.*?)[.!]/i },
    { keyword: 'echo', pattern: /thank you for applying to\s+(.*?)[.!]/i },
    { keyword: 'paycomonline', pattern: /Password setup for\s+(.*?)\s*account/i },
    { keyword: 'workday', pattern: /employment at\s+(.*?)[.!]/i },
    { keyword: 'jobhire.tech', pattern: /thank you for applying to\s+(.*?)[.!]/i }
  ];
  const lowerFrom = from.toLowerCase();
  for (const domain of knownDomains) {
    if (lowerFrom.includes(domain.keyword)) {
      const match = snippet.match(domain.pattern) || subject.match(domain.pattern);
      if (match) return cleanCompanyName(match[1]);
    }
  }
  const subjectCompany = subject.match(/^thank you from\s+(.*)/i);
  if (subjectCompany) {
    return cleanCompanyName(subjectCompany[1]);
  }
  const bracketEmail = subject.match(/\[reply to email .*?@([\w.-]+)\]/i);
  if (bracketEmail) {
    return cleanCompanyName(bracketEmail[1].split('.')[0]);
  }
  const indeedMatch = snippet.match(/The following items were sent to\s+(.*?)\./i);
  if (indeedMatch) {
    return cleanCompanyName(indeedMatch[1]);
  }
  const nameMatch = from.match(/^(.*?)</);
  if (nameMatch) {
    return cleanCompanyName(nameMatch[1]);
  }
  const hiringTeamMatch = from.match(/^(.*?) Hiring Team/i);
  if (hiringTeamMatch) {
    return cleanCompanyName(hiringTeamMatch[1]);
  }
  const emailMatch = from.match(/@([\w.-]+)/);
  if (emailMatch) {
    const domainParts = emailMatch[1].split('.');
    return cleanCompanyName(domainParts.includes("workday") ? domainParts[domainParts.length - 2] : domainParts[0]);
  }
  return "???";
}

function extractJobTitle(subject, snippet) {
  const patterns = [
    /Indeed Application: (.+)/i,
    /to apply to the (.*?) role/i,
    /for the position of\s+(.*?)([.\n]|$)/i,
    /thank you for your application for the\s+(.*?)([.\n]|$)/i,
    /we're hiring a\s+(.*?)([.\n]|$)/i,
    /position[:\-]?\s+(.*?)([.\n]|$)/i,
    /role[:\-]?\s+(.*?)([.\n]|$)/i,
    /job opening[:\-]?\s+(.*?)([.\n]|$)/i,
    /apply now[:\-]?\s+(.*?)([.\n]|$)/i,
    /you applied for the\s+(.*?)([.\n]|$)/i,
    /apply to (the )?(.*?)( position| role| team)/i,
    /applying for the (.*?) role/i,
    /application for (.*?) at/i,
    /application for the (.*?) role/i,
    /application for the (.*?) position/i,
    /your application for the (.*?) position/i,
    /to move forward with your application for (.*?)([.\n]|$)/i
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern) || snippet.match(pattern);
    if (match && match[1]) {
      return match[1].split(/ at | with | in | - /)[0].trim();
    } else if (match && match[2]) {
      return match[2].split(/ at | with | in | - /)[0].trim();
    }
  }

  const fallback = snippet.match(/apply(?:ing)? for(?: the)? ([^.,\n]+)/i);
  if (fallback) {
    return fallback[1].split(/ at | with | in | - /)[0].trim();
  }

  return "???";
}

function detectStatus(text) {
  if (text.includes("interview") || text.includes("scheduled") || text.includes("calendar invite") || text.includes("next steps")) return "Interview";
  if (text.includes("not selected") || text.includes("unfortunately") || text.includes("another candidate") || text.includes("moving forward with other candidates")) return "Rejected";
  if (text.includes("complete your application") || text.includes("survey") || text.includes("eeo") || text.includes("password")) return "Requesting Info";
  return "Submitted";
}

function cleanCompanyName(name) {
  return name.replace(/[^a-zA-Z0-9 &\-]/g, "").trim();
}

function updateGmailLabelsFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const statusIndex = headers.indexOf("Status");
  const emailLinkIndex = headers.indexOf("Email Link");

  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusIndex];
    const emailLink = data[i][emailLinkIndex];
    const msgId = emailLink?.split("#inbox/")[1];
    if (!status || !msgId) continue;

    try {
      const msg = GmailApp.getMessageById(msgId);
      const label = GmailApp.getUserLabelByName(status) || GmailApp.createLabel(status);
      label.addToThread(msg.getThread());
      Logger.log(`Tagged email ${msgId} with ${status}`);
    } catch (e) {
      Logger.log(`❌ Failed to label message ${msgId}: ${e}`);
    }
  }
}

function syncToAirtableFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const recordIdIdx = headers.indexOf("Airtable Record ID");
  const fieldMap = headers.reduce((acc, field, i) => { acc[field] = i; return acc; }, {});

  for (let i = 1; i < data.length; i++) {
    const recordId = data[i][recordIdIdx];
    const rowData = headers.reduce((obj, field, j) => {
      if (field !== "Airtable Record ID") obj[field] = data[i][j];
      return obj;
    }, {});

    const options = {
      method: recordId ? 'put' : 'post',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        ...(recordId && { id: recordId }),
        fields: rowData
      })
    };

    const url = recordId
      ? `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`
      : `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    if (!recordId && result.id) {
      sheet.getRange(i + 1, recordIdIdx + 1).setValue(result.id);
    }
  }
  Logger.log("✅ Airtable sync complete from Sheet.");
}

function fetchIndeedApplications() {
  const threads = GmailApp.search('from:indeedapply@indeed.com newer_than:14d');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const existingLinks = new Set(data.map(row => row[data[0].indexOf("Email Link")]));

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const msg of messages) {
      const subject = msg.getSubject();
      const from = msg.getFrom();
      let snippet = msg.getPlainBody().substring(0, 500);
snippet = snippet.split('-----')[0].trim(); // remove anything after the Indeed footer
      const msgId = msg.getId();
      const emailLink = `https://mail.google.com/mail/u/0/#inbox/${msgId}`;

      if (existingLinks.has(emailLink)) continue;

      const company = extractCompanyName(from, subject, snippet);
      const jobTitle = extractJobTitle(subject, snippet);
      const status = detectStatus(subject + " " + snippet);

      sheet.appendRow([
        new Date(msg.getDate()),
        from,
        subject,
        company,
        jobTitle,
        status,
        snippet,
        "Yes",
        "darcandjs",
        emailLink,
        ""
      ]);
    }
  }
  Logger.log("✅ Indeed applications fetched and appended to Sheet.");
}

function fetchRecentJobApplications() {
const threads = GmailApp.search('newer_than:1d ("thank you for applying" OR "your application" OR subject:application)');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const existingLinks = new Set(data.map(row => row[data[0].indexOf("Email Link")]));

  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const msg of messages) {
      const subject = msg.getSubject();
      const from = msg.getFrom();
      const plainBody = msg.getPlainBody().substring(0, 500);
      const snippet = plainBody.split('-----')[0].trim();
      const fullText = `${subject} ${snippet}`.toLowerCase();

      // 🛑 SKIP emails pushing other jobs to apply for
const skipPhrases = [
  "jobs you might like",
  "recommendations for you",
  "top picks for you",
  "suggested jobs",
  "apply to more",
  "view similar jobs",
  "jobs tailored to your profile",
  "daily job matches",
  "based on your profile",
  "check out new jobs",
  "new openings near you",
  "hot jobs",
  "new job alerts"
];
      if (skipPhrases.some(p => fullText.includes(p))) continue;

      const msgId = msg.getId();
      const emailLink = `https://mail.google.com/mail/u/0/#inbox/${msgId}`;
      if (existingLinks.has(emailLink)) continue;

      const company = extractCompanyName(from, subject, snippet);
      const jobTitle = extractJobTitle(subject, snippet);
      const status = detectStatus(fullText);

      sheet.appendRow([
        new Date(msg.getDate()),
        from,
        subject,
        company,
        jobTitle,
        status,
        snippet,
        "Yes",
        "darcandjs",
        emailLink,
        ""
      ]);
    }
  }

  Logger.log("✅ Recent job-related emails scanned and added.");
}

// ===== Send Summary Email =====
function sendDailySummary() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Job Tracker");
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusIndex = headers.indexOf("Status");
  const companyIndex = headers.indexOf("Company");
  const titleIndex = headers.indexOf("Job Title");
  const linkIndex = headers.indexOf("Email Link");

  let total = 0, submitted = 0, requesting = 0, interviews = 0, rejected = 0;
  let actionsNeeded = [];

  for (let i = 1; i < data.length; i++) {
    const status = (data[i][statusIndex] || "").toLowerCase();
    const company = data[i][companyIndex] || "Unknown";
    const title = data[i][titleIndex] || "";
    const link = data[i][linkIndex] || "";

    total++;
    if (status.includes("submitted")) submitted++;
    else if (status.includes("requesting")) {
      requesting++;
      actionsNeeded.push(`🔎 ${company}: ${title} — [Follow Up](${link})`);
    }
    else if (status.includes("interview")) {
      interviews++;
      actionsNeeded.push(`📅 ${company}: ${title} — [Interview Info](${link})`);
    }
    else if (status.includes("rejected")) rejected++;
  }

  const htmlBody = `
    <p><b>📊 Daily Job Tracker Summary</b></p>
    <ul>
      <li><b>Total Apps:</b> ${total}</li>
      <li>✅ Submitted: ${submitted}</li>
      <li>📩 Requesting More Info: ${requesting}</li>
      <li>📅 Interviews: ${interviews}</li>
      <li>❌ Rejected: ${rejected}</li>
    </ul>
    <p><b>⏳ Action Items:</b></p>
    <ul>
      ${actionsNeeded.length ? actionsNeeded.map(a => `<li>${a}</li>`).join('') : "<li>No follow-ups needed today.</li>"}
    </ul>
    <p>– Your trusty job-hunt automation bot 🤖</p>
  `;

  GmailApp.sendEmail(Session.getActiveUser().getEmail(), "📬 Daily Job Tracker Summary", "Your summary is ready.", { htmlBody });
}

// ===== Two-Way Sync Entry Point =====
function dailyTwoWaySync() {
 fetchIndeedApplications();
fetchRecentJobApplications();
  Utilities.sleep(5000);
  syncSheetToAirtable();
  Utilities.sleep(5000);
  // syncAirtableToSheet(); // Optional if using Airtable as source of truth
  Utilities.sleep(3000);
  sendDailySummary();
}

function deleteAllAirtableRecords() {
  const AIRTABLE_API_KEY = 'pati7JS1GDy4dOsRQ.08477a62d8212ba7254827a94ffc73627f6918473864911cdf47fd480759afe2';
  const AIRTABLE_BASE_ID = 'appiiW6tpeFrCsy0E';
  const AIRTABLE_TABLE_NAME = 'Job Tracker';

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  };

  const response = UrlFetchApp.fetch(url, { headers });
  const records = JSON.parse(response.getContentText()).records;

  records.forEach(record => {
    const deleteUrl = `${url}/${record.id}`;
    UrlFetchApp.fetch(deleteUrl, {
      method: "delete",
      headers
    });
  });

  Logger.log(`✅ Deleted ${records.length} records from Airtable.`);
}

function play1() {
  deleteAllAirtableRecords();
  Utilities.sleep(3000);
  deleteAllAirtableRecords();
  Utilities.sleep(3000);
  deleteAllAirtableRecords();
  Utilities.sleep(3000);
}

