// parser.gs
/**
 * Core email processing logic
 * @file Routes emails to appropriate handlers and extracts key data
 */

/**
 * Processes an email to extract job application details
 * @param {string} from - Sender email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body content
 * @return {Object|null} Parsed job data or null if not an application
 */
/**
 * Main email processing router
 */
function processEmail(from, subject, body) {
  from = from || "";
  subject = subject || "";
  body = body || "";

  // Skip non-application emails
  if (isSpammySource(from) || isSpammySubject(subject)) return null;

  // Route to specialized handlers
  const lowerFrom = from.toLowerCase();
  if (lowerFrom.includes("sparksgroup")) return handleRecruiterEmail(from, subject, body);
  if (lowerFrom.includes("happycog")) return handleRecruiterEmail(from, subject, body);
  if (lowerFrom.includes("lasallenetwork")) return handleRecruiterEmail(from, subject, body);
  if (lowerFrom.includes("jobhire.tech")) return handleJobHireEmail(from, subject, body);

  return genericFallback(from, subject, body);
}

/**
 * Fallback parser for unrecognized formats
 */
function genericFallback(from, subject, body) {
  return {
    title: extractJobTitle(subject, body),
    company: extractCompanyName(from, subject, body),
    status: getStatusFromText(body)
  };
}

/**
 * Extracts job title from email content
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {string} Extracted job title
 */
/**
 * Enhanced job title extraction with federal position support
 */
/**
 * Enhanced job title extraction with federal position support
 */
function extractJobTitle(subject, body) {
  subject = subject || "";
  body = body || "";

  // Federal position number pattern (e.g., 25-1473-)
  const federalPattern = /(\d+-\d+-)?(.+?)(?: position|$)/i;

  const patterns = [
    // Body patterns first (more reliable)
    /position of (.+?)(?:\.|\n|$)/i,
    /role of (.+?)(?:\.|\n|$)/i,
    /for the (.+?) (?:position|role)/i,
    /applying (?:to|for) (?:the )?(.+?)(?: position| role| at|$)/i,
    /thank you for applying for the (.+?) position/i,
    /job title:?\s*(.+?)(?:\n|$)/i,
    /Re:\s*\d*[- ]*(.+?)(?:\n|$)/i, // Capture after "Re: 25-1473-"
    federalPattern
  ];

  // Try body first
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const title = match[match.length - 1]; // Get last capture group
      if (title && !/thank you|application|resume/i.test(title)) {
        const cleaned = cleanExtractedText(title);
        if (cleaned !== "???") return cleaned;
      }
    }
  }

  // Then try subject
  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match) {
      const title = match[match.length - 1];
      if (title && !/thank you|application|resume/i.test(title)) {
        const cleaned = cleanExtractedText(title);
        if (cleaned !== "???") return cleaned;
      }
    }
  }

  // Fallback - clean subject if it looks like a title
  const cleanSubject = subject
    .replace(/^re:\s*/i, "")
    .replace(/^fwd:\s*/i, "")
    .replace(/\[.*?\]\s*/g, "")
    .trim();

  if (cleanSubject && !/thank you|application|received|submitted/i.test(cleanSubject)) {
    return cleanExtractedText(cleanSubject);
  }

  return "???";
}



/**
 * Extracts company name from email content
 * @param {string} from - Sender email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @return {string} Extracted company name
 */
function extractCompanyName(from, subject, body) {
  from = from || "";
  subject = subject || "";
  body = body || "";

  // First try to extract from known patterns in body
  const bodyPatterns = [
    /thank you for (?:your interest|applying) (?:to|at|with) (.+?)(?:\.|\n|$)/i,
    /position at (.+?)(?:\.|\n|$)/i,
    /role with (.+?)(?:\.|\n|$)/i,
    /opportunity at (.+?)(?:\.|\n|$)/i,
    /(?:company|organization):?\s*(.+?)(?:\n|$)/i,
    /dear candidate,\s*(.+?)\s*thank you/ims
  ];

  for (const pattern of bodyPatterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const extracted = cleanCompanyName(match[1]);
      if (extracted !== "???" && !extracted.toLowerCase().includes("no reply")) {
        return extracted;
      }
    }
  }

  // Try subject patterns if body failed
  const subjectPatterns = [
    /application (?:for|to) (.+?)(?: position|$)/i,
    /opportunity at (.+?)(?:$| -)/i,
    /role with (.+?)(?:$| -)/i
  ];

  for (const pattern of subjectPatterns) {
    const match = subject.match(pattern);
    if (match && match[1]) {
      const extracted = cleanCompanyName(match[1]);
      if (extracted !== "???" && !extracted.toLowerCase().includes("no reply")) {
        return extracted;
      }
    }
  }

  // Fallback to sender domain if nothing found
  const domainMatch = from.match(/@([a-z0-9.-]+)/i);
  if (domainMatch) {
    const domain = domainMatch[1].replace(/\.(com|org|net|ai|co|io)$/i, "");
    return cleanCompanyName(domain);
  }

  return "???";
}