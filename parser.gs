function processEmail(from, subject, body) {
  // Null-safety
  from = from || "";
  subject = subject || "";
  body = body || "";

  // --- Spam guards (subject/body aware) ---
  const spammySources = [
    "glassdoor.com", "alerts@ziprecruiter.com", "ziprecruiter.com",
    "indeed.com", "adzuna.com", "theladders.com", "bounce.recruiter.com",
    "workopolis.com", "careerbuilder.com", "jobcase.com", "monster.com",
    "workablemail.com", "do-not-reply@ziprecruiter.com",
    "email.ourcareerplace.com"
  ];

  const spammyPatterns = [
    /top picks for you/i,
    /new jobs (this week|for you|near you)/i,
    /check out these jobs/i,
    /job (opportunities|matches) for you/i,
    /weekly job/i,
    /daily job alerts/i,
    /today's job recommendations/i,
    /see jobs now/i,
    /suggested roles/i
  ];

  const cleanFrom = from.toLowerCase();
  const cleanText = (subject + " " + body).toLowerCase();

  if (
    spammySources.some(spam =>
      cleanFrom.includes(spam) || cleanText.includes(spam)
    ) ||
    spammyPatterns.some(p => p.test(subject) || p.test(body))
  ) {
    Logger.log(`⚠️ Skipping non-application email from: ${from}`);
    return null;
  }

  // Skip self-sent
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
  if (from.includes("experis.com"))        return handleExperisEmail ? handleExperisEmail(subject, body) : genericFallback(from, subject, body);

  // Fallback
  return genericFallback(from, subject, body);
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

// --- Generic Extractors (subject/body first; from only for company) ---
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
    const match = subject.match(pattern) || body.match(pattern);
    if (match && match[1]) {
      return cleanExtractedText(match[1]);
    }
  }
  // Last-ditch: if subject looks like a title on its own
  if (!/^re:|^fwd:|thank you|application|applied|received/i.test(subject)) {
    return cleanExtractedText(subject);
  }
  return "???";
}


function extractCompanyName(from, subject, body) {
  from = from || "";
  subject = subject || "";
  body = body || "";

  // Prefer display name when it's not a generic sender
  const cleanFrom = from.replace(/<.*?>/, "").trim();
  const generics = ["no reply", "no-reply", "robot", "careers", "recruiting", "jobs", "hiring"];
  if (cleanFrom && !generics.some(g => cleanFrom.toLowerCase().includes(g))) {
    return cleanCompanyName(cleanFrom);
  }

  // Try subject/body patterns
  const patterns = [
    /at ([\w &\-.]+)/i,
    /with ([\w &\-.]+)/i,
    /application to ([\w &\-.]+)/i,
    /position at ([\w &\-.]+)/i
  ];
  for (const pattern of patterns) {
    const m = subject.match(pattern) || body.match(pattern);
    if (m && m[1]) return cleanCompanyName(m[1]);
  }

  // Domain fallback
  const domainMatch = from.match(/@([a-z0-9\.-]+)/i);
  if (domainMatch) {
    let domain = domainMatch[1].toLowerCase();
    domain = domain.replace(/\.(com|org|net|ai|co|io)$/i, "");
    return cleanCompanyName(domain);
  }

  return "???";
}

// --- Legacy/simple status (kept for fallback only) ---
function detectStatus(text) {
  text = (text || "").toLowerCase();
  if (text.includes("we're excited to move forward") || text.includes("interview")) return "Interview";
  if (text.includes("we will not be moving forward") || text.includes("decided not to")) return "Rejected";
  return "Submitted";
}

function determineStatus(text) {
  const lower = (text || "").toLowerCase();

  if (lower.includes("we have decided to pursue other applicants") ||
      lower.includes("not moving forward") ||
      lower.includes("unfortunately") ||
      lower.includes("we regret to inform you") ||
      lower.includes("selected other candidates") ||
      lower.includes("not selected") ||
      lower.includes("decided to move forward with others") ||
      lower.includes("another candidate") ||
      lower.includes("position has been filled") ||
      lower.includes("rejected") ||
      lower.includes("we will not be moving forward")) {
    return "Rejected";
  }

  if (lower.includes("interview") || lower.includes("we would like to schedule")) {
    return "Interview";
  }

  if (lower.includes("application received") ||
      lower.includes("we received your application") ||
      lower.includes("thank you for applying") ||
      lower.includes("we're reviewing your application") ||
      lower.includes("we will get back to you") ||
      lower.includes("we have received your application") ||
      lower.includes("we will review your application")) {
    return "Submitted";
  }

  return "Submitted";
}
