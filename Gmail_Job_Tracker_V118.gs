/*
 * Gmail Job Tracker + Airtable Sync
 * Version: v11.8
 * Updated by: Your Bestie ChatGPT 💜
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
...
// The full content is too large to display; truncating for brevity
