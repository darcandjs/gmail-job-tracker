function processEmail(from, subject, snippet) {
  const spammySources = [
    "glassdoor.com", "alerts@ziprecruiter.com", "ziprecruiter.com",
    "indeed.com", "adzuna.com", "theladders.com", "bounce.recruiter.com",
    "workopolis.com", "careerbuilder.com", "jobcase.com", "monster.com",
    "workablemail.com", "do-not-reply@ziprecruiter.com",
    "email.ourcareerplace.com",
    "job-alert", "daily digest", "recommended jobs",
    "check out these jobs", "we found jobs for you"
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
  const cleanText = (subject + " " + snippet).toLowerCase();

  if (
    spammySources.some(spam =>
      cleanFrom.includes(spam) || cleanText.includes(spam)
    ) ||
    spammyPatterns.some(p => p.test(subject) || p.test(snippet))
  ) {
    Logger.log(`⚠️ Skipping non-application email from: ${from}`);
    return null;
  }

  const selfEmail = Session.getActiveUser().getEmail();
  const fromEmailMatch = from.match(/<(.+?)>/);
  const fromEmail = fromEmailMatch ? fromEmailMatch[1] : from.trim();

  if (fromEmail === selfEmail) {
    Logger.log(`⚠️ Skipping self-sent email: ${from}`);
    return null;
  }

  // === Handler logic ===
  if (from.includes("linkedin.com")) return handleLinkedInEmail(subject, snippet,from);
  if (from.includes("jobhire.tech")) return handleJobHireEmail(subject, snippet,from);
  if (from.includes("ashbyhq.com")) return handleAshbyEmail(subject, snippet,from);
  if (from.includes("ziprecruiter.com")) return handleZipRecruiterEmail(subject, snippet,from);
  if (from.includes("workday.com")) return handleWorkdayEmail(subject, snippet,from);
  if (from.includes("lorienglobal.com")) return handleLorienEmail(subject, snippet,from);
  if (from.includes("experis.com")) return handleExperisEmail(subject, snippet,from);

  // Fallback
  return {
    title: extractJobTitle(subject, snippet,from),
    company: extractCompanyName(from, subject, snippet),
  };
}


// --- Generic Extractors ---
function extractJobTitle(subject, snippet,from) {
  const patterns = [
    /application for (.*?) at/i,
    /for the (.*?) position at/i,
    /for (.*?) role at/i,
    /applied to (.*?) at/i, 
    /application: (.*?)$/i,
    /title[:\-] (.*?)(?: at|\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern) || snippet.match(pattern);
    if (match && match[1]) {
      return cleanExtractedText(match[1]);
    } 
  }
  return "???";
}

function extractCompanyName(from, subject, snippet) {
  from = from || "";
  subject = subject || "";
  snippet = snippet || "";

  const cleanFrom = from.replace(/<.*?>/, "").trim();

  const generic = ["no reply", "careers", "recruiting", "jobs", "hiring"];
  if (!generic.some(g => cleanFrom.toLowerCase().includes(g))) {
    return cleanCompanyName(cleanFrom);
  }

  const patterns = [
    /at ([\w &\-\.]+)/i,
    /with ([\w &\-\.]+)/i,
    /application to ([\w &\-\.]+)/i,
    /position at ([\w &\-\.]+)/i,
    /@([\w\-]+)\./i
  ];

  for (const pattern of patterns) {
    const match =
      subject.match(pattern) || snippet.match(pattern) || from.match(pattern);
    if (match && match[1]) {
      return cleanCompanyName(match[1]);
    }
  }

  return "???";
}

// --- Determine Status ---
function detectStatus(text) {
  if (text.includes("we're excited to move forward") || text.includes("interview")) return "Interview";
  if (text.includes("we will not be moving forward") || text.includes("decided not to")) return "Rejected";
  return "Submitted";
}
// --- Status Determination ---
function determineStatus(text) {
  const lower = text.toLowerCase();

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

  return "Submitted"; // default fallback
}
