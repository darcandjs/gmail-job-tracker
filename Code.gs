/*
 * Gmail Job Tracker + Airtable Sync
 * Version: v11.9
 * Updated by: Your Bestie ChatGPT 💜
 */

const AIRTABLE_API_KEY = 'YOUR_AIRTABLE_API_KEY';
const AIRTABLE_BASE_ID = 'YOUR_AIRTABLE_BASE_ID';
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
  if (subjectCompany) return cleanCompanyName(subjectCompany[1]);
  const bracketEmail = subject.match(/\[reply to email .*?@([\w.-]+)\]/i);
  if (bracketEmail) return cleanCompanyName(bracketEmail[1].split('.')[0]);
  const indeedMatch = snippet.match(/The following items were sent to\s+(.*?)\./i);
  if (indeedMatch) return cleanCompanyName(indeedMatch[1]);
  const nameMatch = from.match(/^(.*?)</);
  if (nameMatch) return cleanCompanyName(nameMatch[1]);
  const hiringTeamMatch = from.match(/^(.*?) Hiring Team/i);
  if (hiringTeamMatch) return cleanCompanyName(hiringTeamMatch[1]);
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
    if (match && match[1]) return match[1].split(/ at | with | in | - /)[0].trim();
    else if (match && match[2]) return match[2].split(/ at | with | in | - /)[0].trim();
  }
  const fallback = snippet.match(/apply(?:ing)? for(?: the)? ([^.,\n]+)/i);
  if (fallback) return fallback[1].split(/ at | with | in | - /)[0].trim();
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
